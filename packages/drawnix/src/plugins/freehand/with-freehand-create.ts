import {
  PlaitBoard,
  Point,
  Transforms,
  distanceBetweenPointAndPoint,
  toHostPoint,
  toViewBoxPoint,
} from '@plait/core';
import { isDrawingMode } from '@plait/common';
import { createFreehandElement, getFreehandPointers } from './utils';
import { Freehand, FreehandShape } from './type';
import { FreehandGenerator } from './freehand.generator';
import { FreehandSmoother } from './smoother';
import { calculateDistanceSync } from '../../../../../lib/performance';

export const withFreehandCreate = (board: PlaitBoard) => {
  const { pointerDown, pointerMove, pointerUp, globalPointerUp } = board;

  let isDrawing = false;

  let isSnappingStartAndEnd = false;

  let points: Point[] = [];

  let originScreenPoint: Point | null = null;

  const generator = new FreehandGenerator(board);

  const smoother = new FreehandSmoother({
    smoothing: 0.7,
    pressureSensitivity: 0.6,
  });

  let temporaryElement: Freehand | null = null;
  let lastRenderedPointsCount = 0;

  // Throttling for pointer move events
  let rafId: number | null = null;
  let pendingPoint: Point | null = null;

  const complete = (cancel?: boolean) => {
    // Cancel any pending RAF
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingPoint = null;

    if (isDrawing) {
      const pointer = PlaitBoard.getPointer(board) as FreehandShape;
      if (isSnappingStartAndEnd) {
        points.push(points[0]);
      }
      temporaryElement = createFreehandElement(pointer, points);
    }
    if (temporaryElement && !cancel) {
      Transforms.insertNode(board, temporaryElement, [board.children.length]);
    }
    generator?.destroy();
    temporaryElement = null;
    isDrawing = false;
    points = [];
    lastRenderedPointsCount = 0;
    smoother.reset();
  };

  board.pointerDown = (event: PointerEvent) => {
    const freehandPointers = getFreehandPointers();
    const isFreehandPointer = PlaitBoard.isInPointer(board, freehandPointers);
    if (isFreehandPointer && isDrawingMode(board)) {
      isDrawing = true;
      originScreenPoint = [event.x, event.y];
      // First point - use WASM for coordinate transformation if available
      const hostPoint = toHostPoint(board, originScreenPoint[0], originScreenPoint[1]);
      const point = toViewBoxPoint(board, hostPoint);
      points.push(point);
    }
    pointerDown(event);
  };

  board.pointerMove = (event: PointerEvent) => {
    if (isDrawing) {
      const currentScreenPoint: Point = [event.x, event.y];

      // Store the pending point
      pendingPoint = currentScreenPoint;

      // Use requestAnimationFrame to throttle rendering
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;

          if (!pendingPoint) return;

          const screenPoint = pendingPoint;
          pendingPoint = null;

          // Calculate distance - use optimized synchronous calculation from performance.ts
          if (originScreenPoint) {
            const distance = calculateDistanceSync(originScreenPoint, screenPoint);
            isSnappingStartAndEnd = distance < 8;
          } else {
            isSnappingStartAndEnd = false;
          }

          // Process smoothing synchronously to avoid flickering
          const smoothingPoint = smoother.process(screenPoint);
          if (smoothingPoint) {
            // Use WASM for coordinate transformation if available
            const hostPoint = toHostPoint(board, smoothingPoint[0], smoothingPoint[1]);
            const newPoint = toViewBoxPoint(board, hostPoint);
            points.push(newPoint);
            const pointer = PlaitBoard.getPointer(board) as FreehandShape;
            temporaryElement = createFreehandElement(pointer, points);
            
            // Only update DOM if points changed significantly (every 2-3 points to reduce operations)
            const pointsChanged = points.length !== lastRenderedPointsCount;
            const shouldRender = pointsChanged && (points.length % 2 === 0 || points.length === 1);
            
            if (shouldRender && temporaryElement) {
              const elementHost = PlaitBoard.getElementTopHost(board);
              generator.processDrawing(
                temporaryElement,
                elementHost
              );
              lastRenderedPointsCount = points.length;
            }
          }
        });
      }
      return;
    }

    pointerMove(event);
  };

  board.pointerUp = (event: PointerEvent) => {
    complete();
    pointerUp(event);
  };

  board.globalPointerUp = (event: PointerEvent) => {
    complete(true);
    globalPointerUp(event);
  };

  return board;
};
