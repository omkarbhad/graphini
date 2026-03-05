import {
  BOARD_TO_ON_CHANGE,
  ListRender,
  PlaitElement,
  Viewport,
  createBoard,
  withBoard,
  withHandPointer,
  withHistory,
  withHotkey,
  withOptions,
  withRelatedFragment,
  withSelection,
  PlaitBoard,
  type PlaitPlugin,
  type PlaitBoardOptions,
  type Selection,
  ThemeColorMode,
  BOARD_TO_AFTER_CHANGE,
  PlaitOperation,
  PlaitTheme,
  isFromScrolling,
  setIsFromScrolling,
  getSelectedElements,
  updateViewportOffset,
  initializeViewBox,
  withI18n,
  updateViewBox,
  FLUSHING,
  BoardTransforms,
} from '@plait/core';
import { BoardChangeData } from './plugins/board';
import { useCallback, useEffect, useRef, useState } from 'react';
import { withReact } from './plugins/with-react';
import { PlaitCommonElementRef, withImage, withText } from '@plait/common';
import { BoardContext, BoardContextValue } from './hooks/use-board';
import React from 'react';
import { withPinchZoom } from './plugins/with-pinch-zoom-plugin';
import { unstable_batchedUpdates } from 'react-dom';
import { calculateBoundsSync } from '../../../lib/performance';
import type { Point } from '@plait/core';
import { withMultiThreadMoving } from './plugins/with-multithread-moving';

export type WrapperProps = {
  value: PlaitElement[];
  children: React.ReactNode;
  options: PlaitBoardOptions;
  plugins: PlaitPlugin[];
  viewport?: Viewport;
  theme?: PlaitTheme;
  onChange?: (data: BoardChangeData) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  onValueChange?: (value: PlaitElement[]) => void;
  onViewportChange?: (value: Viewport) => void;
  onThemeChange?: (value: ThemeColorMode) => void;
};

export const Wrapper: React.FC<WrapperProps> = ({
  value,
  children,
  options,
  plugins,
  viewport,
  theme,
  onChange,
  onSelectionChange,
  onValueChange,
  onViewportChange,
  onThemeChange,
}) => {
  const [context, setContext] = useState<BoardContextValue>(() => {
    const board = initializeBoard(value, options, plugins, viewport, theme);
    const listRender = initializeListRender(board);
    return {
      v: 0,
      board,
      listRender,
    };
  });

  const { board, listRender } = context;

  const onContextChange = useCallback(() => {
    if (onChange) {
      const data: BoardChangeData = {
        children: board.children,
        operations: board.operations,
        viewport: board.viewport,
        selection: board.selection,
        theme: board.theme,
      };
      onChange(data);
    }

    const hasSelectionChanged = board.operations.some((o) =>
      PlaitOperation.isSetSelectionOperation(o)
    );
    const hasViewportChanged = board.operations.some((o) =>
      PlaitOperation.isSetViewportOperation(o)
    );
    const hasThemeChanged = board.operations.some((o) =>
      PlaitOperation.isSetThemeOperation(o)
    );
    const hasChildrenChanged =
      board.operations.length > 0 &&
      !board.operations.every(
        (o) =>
          PlaitOperation.isSetSelectionOperation(o) ||
          PlaitOperation.isSetViewportOperation(o) ||
          PlaitOperation.isSetThemeOperation(o)
      );

    if (onValueChange && hasChildrenChanged) {
      onValueChange(board.children);
    }

    if (onSelectionChange && hasSelectionChanged) {
      onSelectionChange(board.selection);
    }

    if (onViewportChange && hasViewportChanged) {
      onViewportChange(board.viewport);
    }

    if (onThemeChange && hasThemeChanged) {
      onThemeChange(board.theme.themeColorMode);
    }

    setContext((prevContext) => ({
      v: prevContext.v + 1,
      board,
      listRender,
    }));
  }, [board, onChange, onSelectionChange, onValueChange]);

  const isFirstRender = useRef(true);
  const lastSelectionBoundsRef = useRef(new Map<string, { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }>())

  useEffect(() => {
    // Use RAF throttling to batch expensive updates
    let rafId: number | null = null;
    let pendingUpdate = false;
    let isMoving = false;
    let movementTimeout: NodeJS.Timeout | null = null;
    let lastMovementUpdate = 0;
    const MOVEMENT_UPDATE_THROTTLE = 16; // ~60fps during movement
    const BOUNDS_EPSILON = 0.5

    const hasBoundsChanged = (
      prev: { minX: number; minY: number; maxX: number; maxY: number },
      next: { minX: number; minY: number; maxX: number; maxY: number }
    ) => {
      return (
        Math.abs(prev.minX - next.minX) > BOUNDS_EPSILON ||
        Math.abs(prev.minY - next.minY) > BOUNDS_EPSILON ||
        Math.abs(prev.maxX - next.maxX) > BOUNDS_EPSILON ||
        Math.abs(prev.maxY - next.maxY) > BOUNDS_EPSILON
      )
    }

    const performUpdate = () => {
      pendingUpdate = false;
      
      const isOnlySetSelection =
        board.operations.length &&
        board.operations.every((op) => op.type === 'set_selection');
      if (isOnlySetSelection) {
        // Only selection changed - minimal update
        listRender.update(board.children, {
          board: board,
          parent: board,
          parentG: PlaitBoard.getElementHost(board),
        });
        // Update active sections only for selection changes
        const selectedElements = getSelectedElements(board);
        selectedElements.forEach((element) => {
          const elementRef =
            PlaitElement.getElementRef<PlaitCommonElementRef>(element);
          elementRef.updateActiveSection();
        });
        return;
      }
      
      const isSetViewport =
        board.operations.length &&
        board.operations.some((op) => op.type === 'set_viewport');
      if (isSetViewport && isFromScrolling(board)) {
        setIsFromScrolling(board, false);
        listRender.update(board.children, {
          board: board,
          parent: board,
          parentG: PlaitBoard.getElementHost(board),
        });
        return;
      }
      
      // Check if this is a movement operation (not a structural change)
      const isMovementOperation = board.operations.some((op) => 
        op.type === 'move_element' ||
        op.type === 'update_element'
      );
      
      if (isMovementOperation) {
        // Mark as moving and use WASM-accelerated calculations for smooth selection updates
        isMoving = true;
        
        // Clear any existing timeout
        if (movementTimeout) {
          clearTimeout(movementTimeout);
        }
        
        // Update DOM during movement (necessary for visual feedback)
        listRender.update(board.children, {
          board: board,
          parent: board,
          parentG: PlaitBoard.getElementHost(board),
        });
        
        // Update viewport during movement
        updateViewBox(board);
        updateViewportOffset(board);
        
        // Throttle selection updates during movement using WASM C++ calculations
        const now = performance.now();
        if (now - lastMovementUpdate >= MOVEMENT_UPDATE_THROTTLE) {
          lastMovementUpdate = now;
          
          const selectedElements = getSelectedElements(board)
          if (selectedElements.length > 0) {
            const currentIds = new Set<string>()
            const elementsNeedingUpdate: typeof selectedElements = []

            selectedElements.forEach((element) => {
              currentIds.add(element.id)
              const rectangle = board.getRectangle?.(element)
              if (!rectangle) {
                return
              }

              const bounds = calculateBoundsSync([
                [rectangle.x, rectangle.y] as Point,
                [rectangle.x + rectangle.width, rectangle.y + rectangle.height] as Point,
              ])

              const previousBounds = lastSelectionBoundsRef.current.get(element.id)
              if (!previousBounds || hasBoundsChanged(previousBounds, bounds)) {
                elementsNeedingUpdate.push(element)
                lastSelectionBoundsRef.current.set(element.id, bounds)
              }
            })

            // Remove stale entries for elements no longer selected
            Array.from(lastSelectionBoundsRef.current.keys()).forEach((elementId) => {
              if (!currentIds.has(elementId)) {
                lastSelectionBoundsRef.current.delete(elementId)
              }
            })

            if (elementsNeedingUpdate.length > 0) {
              unstable_batchedUpdates(() => {
                elementsNeedingUpdate.forEach((element) => {
                  const elementRef =
                    PlaitElement.getElementRef<PlaitCommonElementRef>(element)
                  elementRef.updateActiveSection()
                })
              })
            }
          }
        }
        
        // Schedule cleanup timeout after movement stops
        movementTimeout = setTimeout(() => {
          isMoving = false;
          movementTimeout = null;
          lastMovementUpdate = 0;
          lastSelectionBoundsRef.current.clear()

          const selectedElements = getSelectedElements(board);
          if (selectedElements.length > 0) {
            unstable_batchedUpdates(() => {
              selectedElements.forEach((element) => {
                const elementRef =
                  PlaitElement.getElementRef<PlaitCommonElementRef>(element);
                elementRef.updateActiveSection();
              });
            });
          }
        }, 150); // Cleanup timeout
        
        return; // Movement handled with WASM acceleration
      }
      
      // Reset moving flag if we're not in a movement operation
      if (isMoving && !isMovementOperation) {
        isMoving = false;
        if (movementTimeout) {
          clearTimeout(movementTimeout);
          movementTimeout = null;
        }
        lastMovementUpdate = 0
        lastSelectionBoundsRef.current.clear()
      }
      
      // Full update for structural changes (not movement)
      listRender.update(board.children, {
        board: board,
        parent: board,
        parentG: PlaitBoard.getElementHost(board),
      });
      
      if (isSetViewport) {
        initializeViewBox(board);
      } else {
        updateViewBox(board);
      }
      updateViewportOffset(board);
      
      // Update active sections for non-movement operations
      // Route expensive calculations to WASM C++ for better performance
      const selectedElements = getSelectedElements(board);
      
      if (selectedElements.length > 0) {
        const currentIds = new Set<string>()
        const elementsNeedingUpdate: typeof selectedElements = []

        selectedElements.forEach((element) => {
          currentIds.add(element.id)

          const rectangle = board.getRectangle?.(element)
          if (!rectangle) {
            return
          }

          const bounds = calculateBoundsSync([
            [rectangle.x, rectangle.y] as Point,
            [rectangle.x + rectangle.width, rectangle.y + rectangle.height] as Point,
          ])

          const previousBounds = lastSelectionBoundsRef.current.get(element.id)
          if (!previousBounds || hasBoundsChanged(previousBounds, bounds)) {
            elementsNeedingUpdate.push(element)
            lastSelectionBoundsRef.current.set(element.id, bounds)
          }
        })

        Array.from(lastSelectionBoundsRef.current.keys()).forEach((elementId) => {
          if (!currentIds.has(elementId)) {
            lastSelectionBoundsRef.current.delete(elementId)
          }
        })

        if (elementsNeedingUpdate.length > 0) {
          unstable_batchedUpdates(() => {
            elementsNeedingUpdate.forEach((element) => {
              const elementRef =
                PlaitElement.getElementRef<PlaitCommonElementRef>(element);
              elementRef.updateActiveSection();
            });
          });
        }
      } else {
        if (lastSelectionBoundsRef.current.size > 0) {
          lastSelectionBoundsRef.current.clear()
        }
      }
    };

    BOARD_TO_ON_CHANGE.set(board, () => {
      // Batch updates using RAF + React batching to avoid blocking
      if (!pendingUpdate) {
        pendingUpdate = true;
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            unstable_batchedUpdates(() => {
              performUpdate();
            });
          });
        }
      }
    });

    BOARD_TO_AFTER_CHANGE.set(board, () => {
      onContextChange();
    });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (movementTimeout) {
        clearTimeout(movementTimeout);
        movementTimeout = null;
      }
      lastSelectionBoundsRef.current.clear()
      BOARD_TO_ON_CHANGE.delete(board);
      BOARD_TO_AFTER_CHANGE.delete(board);
    };
  }, [board]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (value !== context.board.children && !FLUSHING.get(board)) {
      board.children = value;
      listRender.update(board.children, {
        board: board,
        parent: board,
        parentG: PlaitBoard.getElementHost(board),
      });
      BoardTransforms.fitViewport(board);
    }
  }, [value]);

  return (
    <BoardContext.Provider value={context}>{children}</BoardContext.Provider>
  );
};

const initializeBoard = (
  value: PlaitElement[],
  options: PlaitBoardOptions,
  plugins: PlaitPlugin[],
  viewport?: Viewport,
  theme?: PlaitTheme
) => {
  let board = withRelatedFragment(
    withHotkey(
      withHandPointer(
        withHistory(
          withSelection(
            withMultiThreadMoving(
              withBoard(
                withI18n(
                  withOptions(
                    withReact(withImage(withText(createBoard(value, options))))
                  )
                )
              )
            )
          )
        )
      )
    )
  );
  plugins.forEach((plugin: any) => {
    board = plugin(board);
  });
  withPinchZoom(board);

  if (viewport) {
    board.viewport = viewport;
  }

  if (theme) {
    board.theme = theme;
  }

  return board;
};

const initializeListRender = (board: PlaitBoard) => {
  const listRender = new ListRender(board);
  return listRender;
};
