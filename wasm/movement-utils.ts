// TypeScript wrapper for WASM movement calculations
import { Point } from '@plait/core';

interface MovementCalculationsModule {
  calculate_drag_offset: (currentX: number, currentY: number, originX: number, originY: number) => { x: number; y: number };
  apply_offset: (point: Point, offset: { x: number; y: number }) => Point;
  calculate_bounds_from_points: (points: Point[]) => Bounds;
  calculate_adjusted_offset: (bounds: Bounds, dragOffset: { x: number; y: number }, snapOffset: { x: number; y: number }, gridSize: number) => { x: number; y: number };
  batch_apply_offset: (points: Point[], offset: { x: number; y: number }) => Point[];
  transform_to_viewbox: (screenPoint: Point, viewportX: number, viewportY: number, zoom: number) => Point;
  transform_to_host: (viewboxPoint: Point, viewportX: number, viewportY: number, zoom: number) => Point;
  calculate_velocity_from_points: (points: Point[], timestamps: number[]) => number;
  calculate_distance: (x1: number, y1: number, x2: number, y2: number) => number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export class MovementCalculationsWASM {
  private static module: MovementCalculationsModule | null = null;
  private static isLoading = false;
  private static loadPromise: Promise<MovementCalculationsModule> | null = null;

  static async load(): Promise<MovementCalculationsModule> {
    if (this.module) {
      return this.module;
    }

    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;

    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        const module = await import('./dist/movement-calculations.js');
        const wasmModule = await module.default();

        this.module = wasmModule as MovementCalculationsModule;
        this.isLoading = false;
        resolve(this.module);
      } catch (error) {
        this.isLoading = false;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  static async calculateDragOffset(
    current: Point,
    origin: Point
  ): Promise<{ x: number; y: number }> {
    const module = await this.load();
    return module.calculate_drag_offset(current[0], current[1], origin[0], origin[1]);
  }

  static async applyOffset(
    point: Point,
    offset: { x: number; y: number }
  ): Promise<Point> {
    const module = await this.load();
    const result = module.apply_offset(point, offset);
    return [result.x, result.y];
  }

  static async calculateBounds(points: Point[]): Promise<Bounds> {
    const module = await this.load();
    return module.calculate_bounds_from_points(points);
  }

  static calculateBoundsSync(points: Point[]): Bounds {
    if (this.module) {
      return this.module.calculate_bounds_from_points(points);
    }

    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = points[0][0], minY = points[0][1];
    let maxX = points[0][0], maxY = points[0][1];

    for (const point of points) {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  static async calculateAdjustedOffset(
    bounds: Bounds,
    dragOffset: { x: number; y: number },
    snapOffset: { x: number; y: number },
    gridSize: number
  ): Promise<{ x: number; y: number }> {
    const module = await this.load();
    return module.calculate_adjusted_offset(bounds, dragOffset, snapOffset, gridSize);
  }

  static async batchApplyOffset(
    points: Point[],
    offset: { x: number; y: number }
  ): Promise<Point[]> {
    const module = await this.load();
    const result = module.batch_apply_offset(points, offset);
    return result.map(p => [p.x, p.y] as Point);
  }

  static async transformToViewbox(
    screenPoint: Point,
    viewport: { x: number; y: number },
    zoom: number
  ): Promise<Point> {
    const module = await this.load();
    const result = module.transform_to_viewbox(
      screenPoint,
      viewport.x,
      viewport.y,
      zoom
    );
    return [result.x, result.y];
  }

  static async transformToHost(
    viewboxPoint: Point,
    viewport: { x: number; y: number },
    zoom: number
  ): Promise<Point> {
    const module = await this.load();
    const result = module.transform_to_host(
      viewboxPoint,
      viewport.x,
      viewport.y,
      zoom
    );
    return [result.x, result.y];
  }

  static async calculateVelocity(points: Point[], timestamps: number[]): Promise<number> {
    const module = await this.load();
    return module.calculate_velocity_from_points(points, timestamps);
  }

  static async calculateDistance(p1: Point, p2: Point): Promise<number> {
    // Use synchronous calculation if WASM is already loaded, otherwise async
    if (this.module) {
      return Promise.resolve(this.module.calculate_distance(p1[0], p1[1], p2[0], p2[1]));
    }
    return this.load().then(module => 
      module.calculate_distance(p1[0], p1[1], p2[0], p2[1])
    );
  }

  static calculateDistanceSync(p1: Point, p2: Point): number {
    // Synchronous fallback - use JS calculation
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// Hybrid wrapper that falls back to JS
export class MovementCalculationsHybrid {
  private useWASM = true;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await MovementCalculationsWASM.load();
    } catch (error) {
      console.warn('WASM movement calculations not available, using JS fallback:', error);
      this.useWASM = false;
    }
  }

  async calculateDragOffset(
    current: Point,
    origin: Point
  ): Promise<{ x: number; y: number }> {
    if (this.initPromise) {
      await this.initPromise;
    }

    if (this.useWASM) {
      try {
        return await MovementCalculationsWASM.calculateDragOffset(current, origin);
      } catch (error) {
        this.useWASM = false;
      }
    }

    // JS fallback
    return {
      x: current[0] - origin[0],
      y: current[1] - origin[1]
    };
  }

  async applyOffset(
    point: Point,
    offset: { x: number; y: number }
  ): Promise<Point> {
    if (this.initPromise) {
      await this.initPromise;
    }

    if (this.useWASM) {
      try {
        return await MovementCalculationsWASM.applyOffset(point, offset);
      } catch (error) {
        this.useWASM = false;
      }
    }

    // JS fallback
    return [point[0] + offset.x, point[1] + offset.y];
  }

  async batchApplyOffset(
    points: Point[],
    offset: { x: number; y: number }
  ): Promise<Point[]> {
    if (this.initPromise) {
      await this.initPromise;
    }

    if (this.useWASM) {
      try {
        return await MovementCalculationsWASM.batchApplyOffset(points, offset);
      } catch (error) {
        this.useWASM = false;
      }
    }

    // JS fallback
    return points.map(p => [p[0] + offset.x, p[1] + offset.y]);
  }

  async calculateBounds(points: Point[]): Promise<Bounds> {
    if (this.initPromise) {
      await this.initPromise;
    }

    if (this.useWASM) {
      try {
        return await MovementCalculationsWASM.calculateBounds(points);
      } catch (error) {
        this.useWASM = false;
      }
    }

    // JS fallback
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = points[0][0], minY = points[0][1];
    let maxX = points[0][0], maxY = points[0][1];

    for (const point of points) {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  async calculateAdjustedOffset(
    bounds: Bounds,
    dragOffset: { x: number; y: number },
    snapOffset: { x: number; y: number },
    gridSize: number
  ): Promise<{ x: number; y: number }> {
    if (this.initPromise) {
      await this.initPromise;
    }

    if (this.useWASM) {
      try {
        return await MovementCalculationsWASM.calculateAdjustedOffset(
          bounds,
          dragOffset,
          snapOffset,
          gridSize
        );
      } catch (error) {
        this.useWASM = false;
      }
    }

    // JS fallback
    let nextX = bounds.minX + dragOffset.x + snapOffset.x;
    let nextY = bounds.minY + dragOffset.y + snapOffset.y;

    if (snapOffset.x === 0 && gridSize > 0) {
      nextX = Math.round(nextX / gridSize) * gridSize;
    }
    if (snapOffset.y === 0 && gridSize > 0) {
      nextY = Math.round(nextY / gridSize) * gridSize;
    }

    return {
      x: nextX - bounds.minX,
      y: nextY - bounds.minY
    };
  }

  calculateDistance(p1: Point, p2: Point): Promise<number> {
    if (this.initPromise) {
      return this.initPromise.then(() => {
        if (this.useWASM) {
          try {
            return MovementCalculationsWASM.calculateDistance(p1, p2);
          } catch (error) {
            this.useWASM = false;
          }
        }
        // JS fallback
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        return Promise.resolve(Math.sqrt(dx * dx + dy * dy));
      });
    }

    // Use synchronous JS calculation for immediate results
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Promise.resolve(Math.sqrt(dx * dx + dy * dy));
  }

  calculateDistanceSync(p1: Point, p2: Point): number {
    // Synchronous JS calculation for immediate results
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  isUsingWASM(): boolean {
    return this.useWASM;
  }
}

