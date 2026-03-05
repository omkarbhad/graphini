import { unstable_batchedUpdates } from 'react-dom'
import { MovementCalculationsWASM } from '../wasm/movement-utils'
import type { Point } from '@plait/core'

// WASM module cache
let wasmModule: typeof MovementCalculationsWASM | null = null
let wasmLoadPromise: Promise<typeof MovementCalculationsWASM> | null = null

// Lazy load WASM module
const loadWASM = async (): Promise<typeof MovementCalculationsWASM> => {
  if (wasmModule) return wasmModule
  if (wasmLoadPromise) return wasmLoadPromise

  wasmLoadPromise = (async () => {
    try {
      await MovementCalculationsWASM.load()
      wasmModule = MovementCalculationsWASM
      return MovementCalculationsWASM
    } catch (error) {
      console.warn('WASM performance module not available, using JS fallback:', error)
      // Return a no-op module that falls back to JS
      return MovementCalculationsWASM
    }
  })()

  return wasmLoadPromise
}

// Optimized RAF throttling with WASM acceleration for calculations
export const throttleRAF = <T extends any[]>(
  fn: (...args: T) => void,
  opts?: { trailing?: boolean }
) => {
  let timerId: number | null = null
  let lastArgs: T | null = null
  let lastArgsTrailing: T | null = null

  const schedule = (args: T) => {
    timerId = requestAnimationFrame(() => {
      timerId = null
      fn(...args)
      lastArgs = null
      if (lastArgsTrailing) {
        lastArgs = lastArgsTrailing
        lastArgsTrailing = null
        schedule(lastArgs)
      }
    })
  }

  return (...args: T) => {
    lastArgs = args
    if (timerId === null) {
      schedule(lastArgs)
    } else if (opts?.trailing) {
      lastArgsTrailing = args
    }
  }
}

// WASM-accelerated batched updates throttler
export const withBatchedUpdatesThrottled = <T extends ((...args: any[]) => void)>(
  func: T
): T => {
  return throttleRAF(((...args: any[]) => {
    unstable_batchedUpdates(() => func(...args))
  }) as T, { trailing: true }) as T
}

// WASM-accelerated distance calculation for performance-critical paths
export const calculateDistanceFast = async (p1: Point, p2: Point): Promise<number> => {
  try {
    const wasm = await loadWASM()
    if (wasm) {
      return await wasm.calculateDistance(p1, p2)
    }
  } catch (error) {
    // Fallback to JS
  }
  
  // Fast JS fallback
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  return Math.sqrt(dx * dx + dy * dy)
}

// Synchronous version for immediate calculations
export const calculateDistanceSync = (p1: Point, p2: Point): number => {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  return Math.sqrt(dx * dx + dy * dy)
}

// WASM-accelerated batch operations for multiple points
export const batchApplyOffsetFast = async (
  points: Point[],
  offset: { x: number; y: number }
): Promise<Point[]> => {
  try {
    const wasm = await loadWASM()
    if (wasm) {
      return await wasm.batchApplyOffset(points, offset)
    }
  } catch (error) {
    // Fallback to JS
  }
  
  // Fast JS fallback
  return points.map(p => [p[0] + offset.x, p[1] + offset.y] as Point)
}

// Synchronous batch offset for immediate updates
export const batchApplyOffsetSync = (
  points: Point[],
  offset: { x: number; y: number }
): Point[] => {
  return points.map(p => [p[0] + offset.x, p[1] + offset.y] as Point)
}

// WASM-accelerated bounds calculation
export const calculateBoundsFast = async (points: Point[]): Promise<{
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}> => {
  try {
    const wasm = await loadWASM()
    if (wasm) {
      return await wasm.calculateBounds(points)
    }
  } catch (error) {
    // Fallback to JS
  }

  return calculateBoundsSync(points)
}

export const calculateBoundsSync = (points: Point[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} => {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  try {
    if (wasmModule) {
      return wasmModule.calculateBoundsSync(points)
    }
  } catch (error) {
    // Fall through to JS fallback
  }

  let minX = points[0][0], minY = points[0][1]
  let maxX = points[0][0], maxY = points[0][1]

  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

// WASM-accelerated drag offset calculation (for movement calculations)
export const calculateDragOffsetFast = async (
  current: Point,
  origin: Point
): Promise<{ x: number; y: number }> => {
  try {
    const wasm = await loadWASM()
    if (wasm) {
      return await wasm.calculateDragOffset(current, origin)
    }
  } catch (error) {
    // Fallback to JS
  }
  
  // Fast JS fallback
  return {
    x: current[0] - origin[0],
    y: current[1] - origin[1]
  }
}

// Synchronous drag offset calculation (for immediate movement)
export const calculateDragOffsetSync = (
  current: Point,
  origin: Point
): { x: number; y: number } => {
  return {
    x: current[0] - origin[0],
    y: current[1] - origin[1]
  }
}

// WASM-accelerated adjusted offset calculation (with snap and grid)
export const calculateAdjustedOffsetFast = async (
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
  dragOffset: { x: number; y: number },
  snapOffset: { x: number; y: number },
  gridSize: number
): Promise<{ x: number; y: number }> => {
  try {
    const wasm = await loadWASM()
    if (wasm) {
      return await wasm.calculateAdjustedOffset(bounds, dragOffset, snapOffset, gridSize)
    }
  } catch (error) {
    // Fallback to JS
  }
  
  // Fast JS fallback
  let nextX = bounds.minX + dragOffset.x + snapOffset.x
  let nextY = bounds.minY + dragOffset.y + snapOffset.y
  
  // Apply grid snapping if no object snapping occurred
  if (snapOffset.x === 0 && gridSize > 0) {
    nextX = Math.round(nextX / gridSize) * gridSize
  }
  if (snapOffset.y === 0 && gridSize > 0) {
    nextY = Math.round(nextY / gridSize) * gridSize
  }
  
  return {
    x: nextX - bounds.minX,
    y: nextY - bounds.minY
  }
}

// Synchronous adjusted offset calculation (for immediate movement)
export const calculateAdjustedOffsetSync = (
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
  dragOffset: { x: number; y: number },
  snapOffset: { x: number; y: number },
  gridSize: number
): { x: number; y: number } => {
  let nextX = bounds.minX + dragOffset.x + snapOffset.x
  let nextY = bounds.minY + dragOffset.y + snapOffset.y
  
  // Apply grid snapping if no object snapping occurred
  if (snapOffset.x === 0 && gridSize > 0) {
    nextX = Math.round(nextX / gridSize) * gridSize
  }
  if (snapOffset.y === 0 && gridSize > 0) {
    nextY = Math.round(nextY / gridSize) * gridSize
  }
  
  return {
    x: nextX - bounds.minX,
    y: nextY - bounds.minY
  }
}

// WASM-accelerated coordinate transformation (screen to viewbox)
export const transformToViewboxFast = async (
  screenPoint: Point,
  viewport: { x: number; y: number },
  zoom: number
): Promise<Point> => {
  try {
    const wasm = await loadWASM()
    if (wasm) {
      return await wasm.transformToViewbox(screenPoint, viewport, zoom)
    }
  } catch (error) {
    // Fallback to JS
  }
  
  // Fast JS fallback
  return [
    (screenPoint[0] - viewport.x) / zoom,
    (screenPoint[1] - viewport.y) / zoom
  ]
}

// Synchronous coordinate transformation (for immediate calculations)
export const transformToViewboxSync = (
  screenPoint: Point,
  viewport: { x: number; y: number },
  zoom: number
): Point => {
  return [
    (screenPoint[0] - viewport.x) / zoom,
    (screenPoint[1] - viewport.y) / zoom
  ]
}

// WASM-accelerated coordinate transformation (viewbox to screen)
export const transformToHostFast = async (
  viewboxPoint: Point,
  viewport: { x: number; y: number },
  zoom: number
): Promise<Point> => {
  try {
    const wasm = await loadWASM()
    if (wasm) {
      return await wasm.transformToHost(viewboxPoint, viewport, zoom)
    }
  } catch (error) {
    // Fallback to JS
  }
  
  // Fast JS fallback
  return [
    viewboxPoint[0] * zoom + viewport.x,
    viewboxPoint[1] * zoom + viewport.y
  ]
}

// Synchronous coordinate transformation (for immediate calculations)
export const transformToHostSync = (
  viewboxPoint: Point,
  viewport: { x: number; y: number },
  zoom: number
): Point => {
  return [
    viewboxPoint[0] * zoom + viewport.x,
    viewboxPoint[1] * zoom + viewport.y
  ]
}

// Pre-initialize WASM module for faster first use
export const initializeWASMPerformance = async (): Promise<void> => {
  await loadWASM()
}

