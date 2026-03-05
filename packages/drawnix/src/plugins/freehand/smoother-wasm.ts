// WASM-accelerated smoother wrapper
import { Point } from '@plait/core';

interface StrokePoint {
  point: Point;
  pressure?: number;
  timestamp: number;
  tiltX?: number;
  tiltY?: number;
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

// Fallback to JS implementation if WASM fails
import { FreehandSmoother } from './smoother';

export class FreehandSmootherWASM {
  private wasmSmoother: any = null;
  private jsSmoother: FreehandSmoother;
  private useWASM = true;
  private wasmModule: any = null;
  private initPromise: Promise<void> | null = null;

  constructor(options: SmootherOptions = {}) {
    this.jsSmoother = new FreehandSmoother(options);
    // Try to initialize WASM asynchronously
    this.initPromise = this.initializeWASM(options);
  }

  private async initializeWASM(options: SmootherOptions): Promise<void> {
    try {
      // Dynamic import of WASM module
      const module = await import('../../../../wasm/movement-calculations');
      this.wasmModule = await module.FreehandSmootherWASM || 
                       await module.FreehandSmootherHybrid ||
                       await import('../../../../wasm/dist/movement-calculations.js').then(m => m.default());

      if (this.wasmModule && this.wasmModule.FreehandSmoother) {
        this.wasmSmoother = new this.wasmModule.FreehandSmoother(options);
        this.useWASM = true;
      } else {
        throw new Error('WASM module not available');
      }
    } catch (error) {
      console.warn('WASM smoother not available, using JavaScript fallback:', error);
      this.useWASM = false;
    }
  }

  process(
    point: Point,
    data: Partial<Omit<StrokePoint, 'point'>> = {}
  ): Promise<Point | null> | Point | null {
    // If WASM is not initialized yet, use JS synchronously
    if (!this.wasmSmoother || !this.useWASM) {
      return this.jsSmoother.process(point, data);
    }

    // Use WASM if available - return Promise
    try {
      const result = this.wasmSmoother.process(
        point[0],
        point[1],
        data.timestamp ?? Date.now(),
        data.pressure ?? 0.5,
        data.tiltX ?? 0,
        data.tiltY ?? 0
      );
      
      // Handle both Promise and synchronous results
      if (result instanceof Promise) {
        return result.then((r: any) => {
          if (r && (r.x === -999999 || r.y === -999999)) {
            return null;
          }
          return r ? [r.x, r.y] : null;
        });
      }
      
      // Synchronous result
      if (result && (result.x === -999999 || result.y === -999999)) {
        return null;
      }
      
      return result ? [result.x, result.y] : null;
    } catch (error) {
      console.warn('WASM processing failed, falling back to JavaScript:', error);
      this.useWASM = false;
      return this.jsSmoother.process(point, data);
    }
  }

  reset(): void {
    if (this.wasmSmoother) {
      this.wasmSmoother.reset();
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

