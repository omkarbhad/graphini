import { Generator } from '@plait/common';
import { PlaitBoard, setStrokeLinecap } from '@plait/core';
import { Options } from 'roughjs/bin/core';
import { Freehand } from './type';
import {
  gaussianSmooth,
  getFillByElement,
  getStrokeColorByElement,
} from './utils';
import { getStrokeWidthByElement } from '@plait/draw';

// Cache for smoothed paths to avoid recomputing
const PATH_CACHE = new WeakMap<Freehand, ReturnType<typeof gaussianSmooth>>();

export class FreehandGenerator extends Generator<Freehand> {
  protected draw(element: Freehand): SVGGElement | undefined {
    const strokeWidth = getStrokeWidthByElement(element);
    const strokeColor = getStrokeColorByElement(this.board, element);
    const fill = getFillByElement(this.board, element);
    const option: Options = { strokeWidth, stroke: strokeColor, fill, fillStyle: 'solid' };

    // Check cache for smoothed path
    let smoothedPath = PATH_CACHE.get(element);
    if (!smoothedPath) {
      smoothedPath = gaussianSmooth(element.points, 1, 3);
      PATH_CACHE.set(element, smoothedPath);
    }

    const g = PlaitBoard.getRoughSVG(this.board).curve(
      smoothedPath,
      option
    );
    setStrokeLinecap(g, 'round');
    return g;
  }

  canDraw(element: Freehand): boolean {
    return true;
  }
}
