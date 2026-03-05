/// <reference lib="webworker" />

import { MovementCalculationsWASM } from '../../wasm/movement-utils'
import type { Point } from '@plait/core'

type MovementWorkerElement =
  | {
      id: string
      type: 'points'
      points: Point[]
    }
  | {
      id: string
      type: 'rect'
      position: { x: number; y: number }
      width: number
      height: number
    }

interface MovementWorkerApplyTask {
  type: 'apply'
  offset: { x: number; y: number }
}

interface MovementWorkerPrepareTask {
  type: 'prepare'
  elements: MovementWorkerElement[]
}

type MovementWorkerTask = MovementWorkerApplyTask | MovementWorkerPrepareTask

interface MovementWorkerResult {
  id: string
  points?: Point[]
  position?: { x: number; y: number }
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
    width: number
    height: number
  }
}

const ensureWasm = (() => {
  let promise: Promise<void> | null = null
  return () => {
    if (!promise) {
      promise = MovementCalculationsWASM.load().then(() => undefined)
    }
    return promise
  }
})()

let cachedElements: MovementWorkerElement[] = []

const processElements = async (
  elements: MovementWorkerElement[],
  offset: { x: number; y: number }
): Promise<MovementWorkerResult[]> => {
  const results: MovementWorkerResult[] = []

  for (const element of elements) {
    if (element.type === 'points') {
      const newPoints = await MovementCalculationsWASM.batchApplyOffset(element.points, offset)
      const bounds = MovementCalculationsWASM.calculateBoundsSync(newPoints)
      results.push({
        id: element.id,
        points: newPoints,
        bounds,
      })
    } else {
      const position = {
        x: element.position.x + offset.x,
        y: element.position.y + offset.y,
      }
      results.push({
        id: element.id,
        position,
        bounds: {
          minX: position.x,
          minY: position.y,
          maxX: position.x + element.width,
          maxY: position.y + element.height,
          width: element.width,
          height: element.height,
        },
      })
    }
  }

  return results
}

self.onmessage = async (event: MessageEvent<{ id: number; payload: MovementWorkerTask }>) => {
  const { id, payload } = event.data

  try {
    await ensureWasm()

    if (payload.type === 'prepare') {
      cachedElements = payload.elements.map(element => ({
        ...element,
        points: element.type === 'points' ? element.points.map(point => [point[0], point[1]] as Point) : undefined,
        position: element.type === 'rect' ? { ...element.position } : undefined,
      }))

      // Warm up WASM by pre-calculating bounds
      for (const element of cachedElements) {
        if (element.type === 'points') {
          MovementCalculationsWASM.calculateBoundsSync(element.points)
          await MovementCalculationsWASM.batchApplyOffset(element.points, { x: 0, y: 0 })
        } else {
          MovementCalculationsWASM.calculateBoundsSync([
            [element.position.x, element.position.y],
            [element.position.x + element.width, element.position.y + element.height],
          ])
        }
      }

      self.postMessage({ id, prepared: true })
      return
    }

    const elements = cachedElements.length ? cachedElements : []
    const results = await processElements(elements, payload.offset)
    self.postMessage({ id, results })
  } catch (error) {
    self.postMessage({ id, error: (error as Error).message })
  }
}

export {}

