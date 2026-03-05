import Stack from '../../stack';
import {
  ATTACHED_ELEMENT_CLASS_NAME,
  deleteFragment,
  duplicateElements,
  getRectangleByElements,
  getSelectedElements,
  isDragging,
  isMovingElements,
  isSelectionMoving,
  PlaitBoard,
  PlaitElement,
  RectangleClient,
  toHostPointFromViewBoxPoint,
  toScreenPointFromHostPoint,
} from '@plait/core';
import { Type, Circle, Palette, Link, ArrowRight, Minus, Copy, Trash } from 'lucide-react';
import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { useBoard } from '@plait-board/react-board';
import { flip, offset, useFloating } from '@floating-ui/react';
import { Island } from '../../island';
import { classNames } from '../../../utils/classnames';
import { useI18n } from '../../../i18n';
import {
  getStrokeColorByElement as getStrokeColorByMindElement,
  MindElement,
} from '@plait/mind';
import './popup-toolbar.scss';
import {
  ArrowLineHandle,
  getStrokeColorByElement as getStrokeColorByDrawElement,
  getStrokeStyleByElement,
  isClosedCustomGeometry,
  isClosedDrawElement,
  isDrawElementsIncludeText,
  PlaitDrawElement,
} from '@plait/draw';
import { CustomText, StrokeStyle } from '@plait/common';
import { getTextMarksByElement } from '@plait/text-plugins';
import { ToolButton } from '../../tool-button';
import { Freehand } from '../../../plugins/freehand/type';
import { ColorPicker } from '../../color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover/popover';
import { isWhite, removeHexAlpha } from '../../../utils/color';
import { NO_COLOR } from '../../../constants/color';
import {
  setTextColor,
  setTextColorOpacity,
  setStrokeColor,
  setStrokeColorOpacity,
  setFillColor,
  setFillColorOpacity,
} from '../../../transforms/property';

export const PopupToolbar = memo(() => {
  const board = useBoard();
  const { t } = useI18n();
  const selectedElements = useMemo(() => getSelectedElements(board), [board.children, board.selection]);
  const container = useMemo(() => PlaitBoard.getBoardContainer(board), [board]);
  const [movingOrDragging, setMovingOrDragging] = useState(false);
  const movingOrDraggingRef = useRef(movingOrDragging);
  const [fontColorOpen, setFontColorOpen] = useState(false);
  const [strokeOpen, setStrokeOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const open = useMemo(() =>
    selectedElements.length > 0 &&
    !isSelectionMoving(board) &&
    !selectedElements.some(PlaitDrawElement.isImage),
    [selectedElements, board]
  );
  const { viewport, selection, children } = board;
  const { refs, floatingStyles } = useFloating({
    placement: 'right-start',
    middleware: [offset(32), flip()],
  });
  let state: {
    fill: string | undefined;
    strokeColor?: string;
    strokeStyle?: StrokeStyle;
    hasFill?: boolean;
    hasText?: boolean;
    fontColor?: string;
    hasFontColor?: boolean;
    hasStroke?: boolean;
    hasStrokeStyle?: boolean;
    marks?: Omit<CustomText, 'text'>;
    // Line state
    isLine?: boolean;
    source?: ArrowLineHandle;
    target?: ArrowLineHandle;
  } = {
    fill: 'red',
  };

  // Memoize expensive state calculations
  state = useMemo(() => {
    if (!open || movingOrDragging) {
      return { fill: 'red' };
    }

    const hasFill =
      selectedElements.some((value) => hasFillProperty(board, value)) &&
      !PlaitBoard.hasBeenTextEditing(board);
    const hasText = selectedElements.some((value) =>
      hasTextProperty(board, value)
    );
    const hasStroke =
      selectedElements.some((value) => hasStrokeProperty(board, value)) &&
      !PlaitBoard.hasBeenTextEditing(board);
    const hasStrokeStyle =
      selectedElements.some((value) => hasStrokeStyleProperty(board, value)) &&
      !PlaitBoard.hasBeenTextEditing(board);
    const isLine = selectedElements.every((value) =>
      PlaitDrawElement.isArrowLine(value)
    );

    return {
      ...getElementState(board),
      hasFill,
      hasFontColor: hasText,
      hasStroke,
      hasStrokeStyle,
      hasText,
      isLine,
    };
  }, [open, movingOrDragging, selectedElements, board]);

  // Memoize position calculation to avoid recalculating on every render
  const positionRect = useMemo(() => {
    if (!open || movingOrDragging || selectedElements.length === 0) {
      return null;
    }

    const rectangle = getRectangleByElements(board, selectedElements, false);
    const [start, end] = RectangleClient.getPoints(rectangle);
    const screenStart = toScreenPointFromHostPoint(
      board,
      toHostPointFromViewBoxPoint(board, start)
    );
    const screenEnd = toScreenPointFromHostPoint(
      board,
      toHostPointFromViewBoxPoint(board, end)
    );
    const width = screenEnd[0] - screenStart[0];
    const height = screenEnd[1] - screenStart[1];

    return {
      width,
      height,
      x: screenStart[0],
      y: screenStart[1],
      top: screenStart[1],
      left: screenStart[0],
      right: screenStart[0] + width,
      bottom: screenStart[1] + height,
    };
  }, [open, movingOrDragging, selectedElements, viewport, board]);

  useEffect(() => {
    if (positionRect) {
      refs.setPositionReference({
        getBoundingClientRect() {
          return positionRect;
        },
      });
    }
  }, [positionRect, refs]);

  useEffect(() => {
    movingOrDraggingRef.current = movingOrDragging;
  }, [movingOrDragging]);

  useEffect(() => {
    const { pointerUp, pointerMove } = board;

    board.pointerMove = (event: PointerEvent) => {
      if (
        (isMovingElements(board) || isDragging(board)) &&
        !movingOrDraggingRef.current
      ) {
        setMovingOrDragging(true);
      }
      pointerMove(event);
    };

    board.pointerUp = (event: PointerEvent) => {
      if (
        movingOrDraggingRef.current &&
        (isMovingElements(board) || isDragging(board))
      ) {
        setMovingOrDragging(false);
      }
      pointerUp(event);
    };

    return () => {
      board.pointerUp = pointerUp;
      board.pointerMove = pointerMove;
    };
  }, [board]);

  return (
    <>
      {open && !movingOrDragging && (
        <Island
          padding={1}
          className={classNames('popup-toolbar', ATTACHED_ELEMENT_CLASS_NAME)}
          ref={refs.setFloating}
          style={floatingStyles}
        >
          <Stack.Row gap={1}>
            {state.hasFontColor && (
              <Popover
                sideOffset={12}
                open={fontColorOpen}
                onOpenChange={setFontColorOpen}
                placement="top"
              >
                <PopoverTrigger asChild>
                  <ToolButton
                    key={0}
                    type="icon"
                    icon={<Type size={16} />}
                    visible={true}
                    selected={fontColorOpen}
                    title={t('popupToolbar.fontColor')}
                    aria-label={t('popupToolbar.fontColor')}
                    onPointerUp={() => {
                      setFontColorOpen(!fontColorOpen);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent container={container}>
                  <Island
                    padding={4}
                    className={classNames(`${ATTACHED_ELEMENT_CLASS_NAME}`)}
                  >
                    <ColorPicker
                      onColorChange={(selectedColor: string) => {
                        setTextColor(
                          board,
                          state.marks?.color ? state.marks.color : selectedColor,
                          selectedColor
                        );
                      }}
                      onOpacityChange={(opacity: number) => {
                        if (state.marks?.color) {
                          setTextColorOpacity(board, state.marks.color, opacity);
                        }
                      }}
                      currentColor={state.marks?.color}
                    />
                  </Island>
                </PopoverContent>
              </Popover>
            )}
            {state.hasStroke && (
              <Popover
                sideOffset={12}
                open={strokeOpen}
                onOpenChange={setStrokeOpen}
                placement="top"
              >
                <PopoverTrigger asChild>
                  <ToolButton
                    key={1}
                    type="icon"
                    icon={<Circle size={16} />}
                    visible={true}
                    selected={strokeOpen}
                    title={t('popupToolbar.stroke')}
                    aria-label={t('popupToolbar.stroke')}
                    onPointerUp={() => {
                      setStrokeOpen(!strokeOpen);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent container={container}>
                  <Island
                    padding={4}
                    className={classNames(`${ATTACHED_ELEMENT_CLASS_NAME}`)}
                  >
                    <ColorPicker
                      onColorChange={(selectedColor: string) => {
                        setStrokeColor(board, selectedColor);
                      }}
                      onOpacityChange={(opacity: number) => {
                        setStrokeColorOpacity(board, opacity);
                      }}
                      currentColor={state.strokeColor}
                    />
                  </Island>
                </PopoverContent>
              </Popover>
            )}
            {state.hasFill && (
              <Popover
                sideOffset={12}
                open={fillOpen}
                onOpenChange={setFillOpen}
                placement="top"
              >
                <PopoverTrigger asChild>
                  <ToolButton
                    key={2}
                    type="icon"
                    icon={<Palette size={16} />}
                    visible={true}
                    selected={fillOpen}
                    title={t('popupToolbar.fillColor')}
                    aria-label={t('popupToolbar.fillColor')}
                    onPointerUp={() => {
                      setFillOpen(!fillOpen);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent container={container}>
                  <Island
                    padding={4}
                    className={classNames(`${ATTACHED_ELEMENT_CLASS_NAME}`)}
                  >
                    <ColorPicker
                      onColorChange={(selectedColor: string) => {
                        setFillColor(board, selectedColor);
                      }}
                      onOpacityChange={(opacity: number) => {
                        setFillColorOpacity(board, opacity);
                      }}
                      currentColor={state.fill}
                    />
                  </Island>
                </PopoverContent>
              </Popover>
            )}
            {state.hasText && (
              <ToolButton
                key={3}
                type="icon"
                icon={<Link size={16} />}
                visible={true}
                title={t('popupToolbar.link')}
                aria-label={t('popupToolbar.link')}
                onPointerUp={() => {
                  // Link functionality would go here
                }}
              />
            )}
            {state.isLine && (
              <>
                <ToolButton
                  key={4}
                  type="icon"
                  icon={<ArrowRight size={16} />}
                  visible={true}
                  title={t('line.source')}
                  aria-label={t('line.source')}
                  onPointerUp={() => {
                    // Source arrow functionality would go here
                  }}
                />
                <ToolButton
                  key={5}
                  type="icon"
                  icon={<ArrowRight size={16} />}
                  visible={true}
                  title={t('line.target')}
                  aria-label={t('line.target')}
                  onPointerUp={() => {
                    // Target arrow functionality would go here
                  }}
                />
              </>
            )}
            <ToolButton
              key={6}
              type="icon"
              icon={<Copy size={16} />}
              visible={true}
              title={t('general.duplicate')}
              aria-label={t('general.duplicate')}
              onPointerUp={() => {
                duplicateElements(board);
              }}
            />
            <ToolButton
              key={7}
              type="icon"
              icon={<Trash size={16} />}
              visible={true}
              title={t('general.delete')}
              aria-label={t('general.delete')}
              onPointerUp={() => {
                deleteFragment(board);
              }}
            />
          </Stack.Row>
        </Island>
      )}
    </>
  );
});

export const getMindElementState = (
  board: PlaitBoard,
  element: MindElement
) => {
  const marks = getTextMarksByElement(element);
  
  // Add error handling for missing node paths
  let strokeColor = element.strokeColor || '#000000'; // fallback color
  let strokeStyle: StrokeStyle = element.strokeStyle || StrokeStyle.solid; // fallback style
  
  try {
    strokeColor = getStrokeColorByMindElement(board, element);
  } catch (error) {
    console.warn('Unable to get stroke color for element:', element.id, error);
  }
  
  try {
    strokeStyle = getStrokeStyleByElement(board, element);
  } catch (error) {
    console.warn('Unable to get stroke style for element:', element.id, error);
  }
  
  return {
    fill: element.fill,
    strokeColor,
    strokeStyle,
    marks,
  };
};

export const getDrawElementState = (
  board: PlaitBoard,
  element: PlaitDrawElement
) => {
  const marks: Omit<CustomText, 'text'> = getTextMarksByElement(element);
  
  // Add error handling for missing node paths
  let strokeColor = element.strokeColor || '#000000'; // fallback color
  let strokeStyle: StrokeStyle = element.strokeStyle || StrokeStyle.solid; // fallback style
  
  try {
    strokeColor = getStrokeColorByDrawElement(board, element);
  } catch (error) {
    console.warn('Unable to get stroke color for draw element:', element.id, error);
  }
  
  try {
    strokeStyle = getStrokeStyleByElement(board, element);
  } catch (error) {
    console.warn('Unable to get stroke style for draw element:', element.id, error);
  }
  
  return {
    fill: element.fill,
    strokeColor,
    strokeStyle,
    marks,
    source: element?.source || {},
    target: element?.target || {},
  };
};

export const getElementState = (board: PlaitBoard) => {
  const selectedElement = getSelectedElements(board)[0];
  if (MindElement.isMindElement(board, selectedElement)) {
    return getMindElementState(board, selectedElement);
  }
  return getDrawElementState(board, selectedElement as PlaitDrawElement);
};

export const hasFillProperty = (board: PlaitBoard, element: PlaitElement) => {
  if (MindElement.isMindElement(board, element)) {
    return true;
  }
  if (isClosedCustomGeometry(board, element)) {
    return true;
  }
  if (PlaitDrawElement.isDrawElement(element)) {
    return (
      PlaitDrawElement.isShapeElement(element) &&
      !PlaitDrawElement.isImage(element) &&
      !PlaitDrawElement.isText(element) &&
      isClosedDrawElement(element)
    );
  }
  return false;
};

export const hasStrokeProperty = (board: PlaitBoard, element: PlaitElement) => {
  if (MindElement.isMindElement(board, element)) {
    return true;
  }
  if (Freehand.isFreehand(element)) {
    return true;
  }
  if (PlaitDrawElement.isDrawElement(element)) {
    return (
      (PlaitDrawElement.isShapeElement(element) &&
        !PlaitDrawElement.isImage(element) &&
        !PlaitDrawElement.isText(element)) ||
      PlaitDrawElement.isArrowLine(element) ||
      PlaitDrawElement.isVectorLine(element) ||
      PlaitDrawElement.isTable(element)
    );
  }
  return false;
};

export const hasStrokeStyleProperty = (
  board: PlaitBoard,
  element: PlaitElement
) => {
  return hasStrokeProperty(board, element);
};

export const hasTextProperty = (board: PlaitBoard, element: PlaitElement) => {
  if (MindElement.isMindElement(board, element)) {
    return true;
  }
  if (PlaitDrawElement.isDrawElement(element)) {
    return isDrawElementsIncludeText([element]);
  }
  return false;
};

export const getColorPropertyValue = (color: string) => {
  if (color === NO_COLOR) {
    return null;
  } else {
    return color;
  }
};
