import {
  getSelectedElements,
  idCreator,
  isPointInPolygon,
  PlaitBoard,
  PlaitElement,
  Point,
  RectangleClient,
  rotateAntiPointsByElement,
  Selection,
  ThemeColorMode,
} from '@plait/core';
import { Freehand, FreehandShape, FreehandThemeColors } from './type';
import {
  DefaultDrawStyle,
  isClosedCustomGeometry,
  isClosedPoints,
  isHitPolyLine,
  isRectangleHitRotatedPoints,
} from '@plait/draw';

export function getFreehandPointers() {
  return [FreehandShape.feltTipPen, FreehandShape.eraser];
}

export const createFreehandElement = (
  shape: FreehandShape,
  points: Point[]
): Freehand => {
  const element: Freehand = {
    id: idCreator(),
    type: 'freehand',
    shape,
    points,
  };
  return element;
};

export const isHitFreehand = (
  board: PlaitBoard,
  element: Freehand,
  point: Point
) => {
  // Safety check: ensure points exist and is an array
  if (!element.points || !Array.isArray(element.points) || element.points.length === 0) {
    return false;
  }
  
  const antiPoint = rotateAntiPointsByElement(board, point, element) || point;
  const points = element.points;
  if (isClosedPoints(element.points)) {
    return (
      isPointInPolygon(antiPoint, points) || isHitPolyLine(points, antiPoint)
    );
  } else {
    return isHitPolyLine(points, antiPoint);
  }
};

export const isRectangleHitFreehand = (
  board: PlaitBoard,
  element: Freehand,
  selection: Selection
) => {
  // Safety check: ensure points exist and is an array
  if (!element.points || !Array.isArray(element.points) || element.points.length === 0) {
    return false;
  }
  
  const rangeRectangle = RectangleClient.getRectangleByPoints([
    selection.anchor,
    selection.focus,
  ]);
  return isRectangleHitRotatedPoints(
    rangeRectangle,
    element.points,
    element.angle
  );
};

export const getSelectedFreehandElements = (board: PlaitBoard) => {
  return getSelectedElements(board).filter((ele) => Freehand.isFreehand(ele));
};

export const getFreehandDefaultStrokeColor = (theme: ThemeColorMode) => {
  return FreehandThemeColors[theme].strokeColor;
};

export const getFreehandDefaultFill = (theme: ThemeColorMode) => {
  return FreehandThemeColors[theme].fill;
};

export const getStrokeColorByElement = (
  board: PlaitBoard,
  element: PlaitElement
) => {
  const defaultColor = getFreehandDefaultStrokeColor(
    board.theme.themeColorMode
  );
  const strokeColor = element.strokeColor || defaultColor;
  return strokeColor;
};

export const getFillByElement = (board: PlaitBoard, element: PlaitElement) => {
  const defaultFill =
    Freehand.isFreehand(element) && isClosedCustomGeometry(board, element)
      ? getFreehandDefaultFill(board.theme.themeColorMode)
      : DefaultDrawStyle.fill;
  const fill = element.fill || defaultFill;
  return fill;
};

export function gaussianWeight(x: number, sigma: number) {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

// Pre-compute Gaussian weights for better performance
const GAUSSIAN_WEIGHT_CACHE = new Map<string, number>();
function getCachedGaussianWeight(x: number, sigma: number): number {
  const key = `${x}_${sigma}`;
  if (GAUSSIAN_WEIGHT_CACHE.has(key)) {
    return GAUSSIAN_WEIGHT_CACHE.get(key)!;
  }
  const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
  GAUSSIAN_WEIGHT_CACHE.set(key, weight);
  return weight;
}

export function gaussianSmooth(
  points: Point[],
  sigma: number,
  windowSize: number
) {
  if (points.length < 2) return points;
  
  // For small point counts, skip expensive smoothing
  if (points.length <= 3) return points;

  // Reduce window size for better performance - max window of 3 instead of dynamic
  const halfWindow = Math.min(Math.floor(windowSize / 2), 1);
  const smoothedPoints: Point[] = [];

  // Simplified mirroring for edge points - just clamp to boundaries
  const getPoint = (idx: number): Point => {
    if (idx < 0) return points[0];
    if (idx >= points.length) return points[points.length - 1];
    return points[idx];
  };

  // Pre-compute weights for the fixed window (only compute once)
  const weights: number[] = [];
  for (let j = -halfWindow; j <= halfWindow; j++) {
    weights.push(getCachedGaussianWeight(j, sigma));
  }
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  for (let i = 0; i < points.length; i++) {
    // Skip smoothing for endpoints to preserve shape
    if (i === 0 || i === points.length - 1) {
      smoothedPoints.push([points[i][0], points[i][1]]);
      continue;
    }

    let sumX = 0;
    let sumY = 0;

    // Use pre-computed weights with fixed window
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const point = getPoint(i + j);
      const weight = weights[j + halfWindow];

      sumX += point[0] * weight;
      sumY += point[1] * weight;
    }

    // Use pre-computed total weight to avoid division in loop
    smoothedPoints.push([sumX / totalWeight, sumY / totalWeight]);
  }

  return smoothedPoints;
}
