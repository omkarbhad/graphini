// TypeScript bindings for the movement calculations WASM module

export interface Point {
  x: number;
  y: number;
}

export interface StrokePoint {
  point: Point;
  pressure: number;
  timestamp: number;
  tiltX: number;
  tiltY: number;
}

export interface SmootherOptions {
  smoothing?: number;
  velocityWeight?: number;
  curvatureWeight?: number;
  minDistance?: number;
  maxPoints?: number;
  pressureSensitivity?: number;
  tiltSensitivity?: number;
  velocityThreshold?: number;
  samplingRate?: number;
}

// WASM module interface
interface MovementCalculationsModule {
  FreehandSmoother: new (options: SmootherOptions) => FreehandSmootherWASM;
  calculate_distance: (x1: number, y1: number, x2: number, y2: number) => number;
  calculate_velocity: (distance: number, timeDiff: number) => number;
  calculate_moving_average: (values: number[], count: number) => number;
  calculate_curvature: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => number;
  calculate_exponential_weight: (base: number, index: number, decay: number) => number;
}

// WASM FreehandSmoother class interface
interface FreehandSmootherWASM {
  process(x: number, y: number, timestamp: number, pressure?: number, tiltX?: number, tiltY?: number): { x: number; y: number } | null;
  reset(): void;
  getPointCount(): number;
}

// Main WASM wrapper class
export class MovementCalculationsWASM {
  private static module: MovementCalculationsModule | null = null;
  private static isLoading = false;
  private static loadPromise: Promise<MovementCalculationsModule> | null = null;

  // Load the WASM module
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
        // Dynamic import of the WASM module
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

  // Utility functions
  static async calculateDistance(x1: number, y1: number, x2: number, y2: number): Promise<number> {
    const module = await this.load();
    return module.calculate_distance(x1, y1, x2, y2);
  }

  static async calculateVelocity(distance: number, timeDiff: number): Promise<number> {
    const module = await this.load();
    return module.calculate_velocity(distance, timeDiff);
  }

  static async calculateMovingAverage(values: number[]): Promise<number> {
    const module = await this.load();
    // Convert array to heap memory
    const heapArray = module._malloc(values.length * 8); // 8 bytes per double
    const heapView = new Float64Array(module.HEAPF64.buffer, heapArray, values.length);
    heapView.set(values);

    const result = module.calculate_moving_average(heapArray, values.length);

    module._free(heapArray);
    return result;
  }

  static async calculateCurvature(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): Promise<number> {
    const module = await this.load();
    return module.calculate_curvature(x1, y1, x2, y2, x3, y3);
  }

  static async calculateExponentialWeight(base: number, index: number, decay: number): Promise<number> {
    const module = await this.load();
    return module.calculate_exponential_weight(base, index, decay);
  }
}

// WASM-accelerated FreehandSmoother wrapper
export class FreehandSmootherWASM {
  private wasmSmoother: FreehandSmootherWASM | null = null;
  private options: Required<SmootherOptions>;

  constructor(options: SmootherOptions = {}) {
    this.options = {
      smoothing: 0.65,
      velocityWeight: 0.2,
      curvatureWeight: 0.3,
      minDistance: 0.2,
      maxPoints: 8,
      pressureSensitivity: 0.5,
      tiltSensitivity: 0.3,
      velocityThreshold: 800,
      samplingRate: 5,
      ...options
    };
  }

  async initialize(): Promise<void> {
    const module = await MovementCalculationsWASM.load();
    this.wasmSmoother = new module.FreehandSmoother(this.options);
  }

  async process(
    point: Point,
    data: Partial<Omit<StrokePoint, 'point'>> = {}
  ): Promise<Point | null> {
    if (!this.wasmSmoother) {
      await this.initialize();
    }

    if (!this.wasmSmoother) {
      throw new Error('Failed to initialize WASM smoother');
    }

    const result = this.wasmSmoother.process(
      point.x,
      point.y,
      data.timestamp ?? Date.now(),
      data.pressure ?? 0.5,
      data.tiltX ?? 0,
      data.tiltY ?? 0
    );

    // Check for null indicator (-999999)
    if (result && (result.x === -999999 || result.y === -999999)) {
      return null;
    }

    return result ? { x: result.x, y: result.y } : null;
  }

  async reset(): Promise<void> {
    if (this.wasmSmoother) {
      this.wasmSmoother.reset();
    }
  }

  async getPointCount(): Promise<number> {
    if (!this.wasmSmoother) {
      await this.initialize();
    }
    return this.wasmSmoother ? this.wasmSmoother.getPointCount() : 0;
  }
}

// Hybrid implementation that falls back to JS if WASM fails
export class FreehandSmootherHybrid {
  private wasmSmoother: FreehandSmootherWASM | null = null;
  private jsSmoother: FreehandSmootherJS;
  private useWASM = true;

  constructor(options: SmootherOptions = {}) {
    this.jsSmoother = new FreehandSmootherJS(options);

    // Try to initialize WASM, fall back to JS if it fails
    this.initializeWASM(options).catch(() => {
      console.warn('WASM not available, falling back to JavaScript implementation');
      this.useWASM = false;
    });
  }

  private async initializeWASM(options: SmootherOptions): Promise<void> {
    this.wasmSmoother = new FreehandSmootherWASM(options);
    await this.wasmSmoother.initialize();
  }

  async process(
    point: Point,
    data: Partial<Omit<StrokePoint, 'point'>> = {}
  ): Promise<Point | null> {
    if (this.useWASM && this.wasmSmoother) {
      try {
        return await this.wasmSmoother.process(point, data);
      } catch (error) {
        console.warn('WASM processing failed, falling back to JavaScript:', error);
        this.useWASM = false;
      }
    }

    // Fallback to JavaScript implementation
    return this.jsSmoother.process(point, data);
  }

  async reset(): Promise<void> {
    if (this.wasmSmoother) {
      await this.wasmSmoother.reset();
    }
    this.jsSmoother.reset();
  }

  getPointCount(): number {
    return this.jsSmoother.getPointCount();
  }

  isUsingWASM(): boolean {
    return this.useWASM;
  }
}

// JavaScript fallback implementation (copy of original)
class FreehandSmootherJS {
  private readonly defaultOptions: Required<SmootherOptions> = {
    smoothing: 0.65,
    velocityWeight: 0.2,
    curvatureWeight: 0.3,
    minDistance: 0.2,
    maxPoints: 8,
    pressureSensitivity: 0.5,
    tiltSensitivity: 0.3,
    velocityThreshold: 800,
    samplingRate: 5,
  };

  private options: Required<SmootherOptions>;
  private points: StrokePoint[] = [];
  private lastProcessedTime = 0;
  private movingAverageVelocity: number[] = [];
  private readonly velocityWindowSize = 3;

  constructor(options: SmootherOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  process(
    point: Point,
    data: Partial<Omit<StrokePoint, 'point'>> = {}
  ): Point | null {
    const timestamp = data.timestamp ?? Date.now();

    if (this.points.length === 0) {
      const strokePoint: StrokePoint = { point, timestamp, pressure: 0.5, tiltX: 0, tiltY: 0, ...data };
      this.points.push(strokePoint);
      this.lastProcessedTime = timestamp;
      return point;
    }

    if (timestamp - this.lastProcessedTime < this.options.samplingRate) {
      const timeDiff = timestamp - this.lastProcessedTime;
      if (timeDiff < 2) {
        return null;
      }
    }

    const strokePoint: StrokePoint = { point, timestamp, pressure: 0.5, tiltX: 0, tiltY: 0, ...data };

    const distanceOk = this.checkDistance(point);
    if (!distanceOk && this.points.length > 1) {
      const timeDiff = timestamp - this.lastProcessedTime;
      if (timeDiff < 32) {
        return null;
      }
    }

    this.updatePoints(strokePoint);
    const dynamicParams = this.calculateDynamicParameters(strokePoint);
    const smoothedPoint = this.smooth(point, dynamicParams);

    this.lastProcessedTime = timestamp;
    return smoothedPoint;
  }

  reset(): void {
    this.points = [];
    this.lastProcessedTime = 0;
    this.movingAverageVelocity = [];
  }

  getPointCount(): number {
    return this.points.length;
  }

  private updatePoints(point: StrokePoint): void {
    this.points.push(point);
    if (this.points.length > this.options.maxPoints) {
      this.points.shift();
    }
  }

  private checkDistance(point: Point): boolean {
    if (this.points.length === 0) return true;

    const lastPoint = this.points[this.points.length - 1].point;
    const distance = this.getDistance(lastPoint, point);

    let minDistance = this.options.minDistance;
    if (this.movingAverageVelocity.length > 0) {
      const avgVelocity = this.getAverageVelocity();
      minDistance *= Math.max(0.5, Math.min(1.5, avgVelocity / 200));
    }

    return distance >= minDistance;
  }

  private calculateDynamicParameters(strokePoint: StrokePoint): Required<SmootherOptions> {
    const velocity = this.calculateVelocity(strokePoint);
    this.updateMovingAverage(velocity);
    const avgVelocity = this.getAverageVelocity();

    const params = { ...this.options };

    if (strokePoint.pressure !== undefined) {
      const pressureWeight = Math.pow(strokePoint.pressure, 1.2);
      params.smoothing *= 1 - pressureWeight * params.pressureSensitivity * 0.8;
    }

    const velocityFactor = Math.min(avgVelocity / params.velocityThreshold, 1);
    params.velocityWeight = 0.2 + velocityFactor * 0.3;
    params.smoothing *= 1 + velocityFactor * 0.2;

    if (strokePoint.tiltX !== undefined && strokePoint.tiltY !== undefined) {
      const tiltFactor =
        Math.sqrt(strokePoint.tiltX ** 2 + strokePoint.tiltY ** 2) / 90;
      params.smoothing *= 1 + tiltFactor * params.tiltSensitivity * 0.7;
    }

    return params;
  }

  private smooth(point: Point, params: Required<SmootherOptions>): Point {
    if (this.points.length < 2) return point;

    const weights = this.calculateWeights(params);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) return point;

    const smoothedPoint: Point = { x: 0, y: 0 };
    for (let i = 0; i < this.points.length; i++) {
      const weight = weights[i] / totalWeight;
      smoothedPoint.x += this.points[i].point.x * weight;
      smoothedPoint.y += this.points[i].point.y * weight;
    }

    return smoothedPoint;
  }

  private calculateWeights(params: Required<SmootherOptions>): number[] {
    const weights: number[] = [];
    const lastIndex = this.points.length - 1;

    for (let i = 0; i < this.points.length; i++) {
      let weight = Math.pow(params.smoothing, (lastIndex - i) * 0.8);

      if (i < lastIndex) {
        const velocity = this.getPointVelocity(i);
        weight *= 1 + velocity * params.velocityWeight * 0.8;
      }

      if (i > 0 && i < lastIndex) {
        const curvature = this.getPointCurvature(i);
        weight *= 1 + curvature * params.curvatureWeight * 0.7;
      }

      weights.push(weight);
    }

    return weights;
  }

  private getDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateVelocity(point: StrokePoint): number {
    if (this.points.length < 2) return 0;

    const prevPoint = this.points[this.points.length - 1];
    const distance = this.getDistance(prevPoint.point, point.point);
    const timeDiff = point.timestamp - prevPoint.timestamp;
    return timeDiff > 0 ? distance / timeDiff : 0;
  }

  private updateMovingAverage(velocity: number): void {
    this.movingAverageVelocity.push(velocity);
    if (this.movingAverageVelocity.length > this.velocityWindowSize) {
      this.movingAverageVelocity.shift();
    }
  }

  private getAverageVelocity(): number {
    if (this.movingAverageVelocity.length === 0) return 0;
    return (
      this.movingAverageVelocity.reduce((a, b) => a + b) /
      this.movingAverageVelocity.length
    );
  }

  private getPointVelocity(index: number): number {
    if (index >= this.points.length - 1) return 0;

    const p1 = this.points[index];
    const p2 = this.points[index + 1];
    const distance = this.getDistance(p1.point, p2.point);
    const timeDiff = p2.timestamp - p1.timestamp;
    return timeDiff > 0 ? distance / timeDiff : 0;
  }

  private getPointCurvature(index: number): number {
    if (index <= 0 || index >= this.points.length - 1) return 0;

    const p1 = this.points[index - 1].point;
    const p2 = this.points[index].point;
    const p3 = this.points[index + 1].point;

    const a = this.getDistance(p1, p2);
    const b = this.getDistance(p2, p3);
    const c = this.getDistance(p1, p3);

    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    return (4 * area) / (a * b * c + 0.0001);
  }
}
