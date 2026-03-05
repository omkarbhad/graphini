import {
  PlaitBoard,
  PlaitPointerType,
  getSelectedElements,
  isMainPointer,
  toHostPoint,
  toViewBoxPoint,
  Path,
  Transforms,
} from '@plait/core'
import { unstable_batchedUpdates } from 'react-dom'
import type { Point } from '@plait/core'
import { MovementWorkerPool } from '../../../../lib/workers/movementWorkerPool'

type MovementElementState = {
  id: string
  path: Path
  type: 'points' | 'rect'
  originalPoints?: Point[]
  rect?: { x: number; y: number; width: number; height: number }
  position?: { x: number; y: number }
  width?: number
  height?: number
}

type MovementState = {
  isDragging: boolean
  startPoint: Point | null
  elements: MovementElementState[]
  overlay: SVGGElement | null
  latestOffset: { x: number; y: number } | null
  committing: boolean
}

const SVG_NS = 'http://www.w3.org/2000/svg'

const clonePoints = (points: Point[] | undefined): Point[] | undefined => {
  if (!points || !points.length) {
    return undefined
  }
  return points.map(point => [point[0], point[1]] as Point)
}

const buildPrepareElements = (elements: MovementElementState[]) =>
  elements.map(element => {
    if (element.type === 'points') {
      return {
        id: element.id,
        type: 'points' as const,
        points: element.originalPoints ?? [],
      }
    }

    return {
      id: element.id,
      type: 'rect' as const,
      position: element.position ?? { x: 0, y: 0 },
      width: element.width ?? 0,
      height: element.height ?? 0,
    }
  })

const createOverlay = (board: PlaitBoard, elements: MovementElementState[]): SVGGElement | null => {
  const host = PlaitBoard.getElementTopHost(board)
  if (!host) {
    return null
  }

  const overlay = document.createElementNS(SVG_NS, 'g')
  overlay.classList.add('graphinix-moving-overlay')
  overlay.setAttribute('style', 'pointer-events:none; mix-blend-mode: multiply; opacity:0.7;')

  elements.forEach(element => {
    if (!element.rect) {
      return
    }

    const rect = document.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('x', element.rect.x.toString())
    rect.setAttribute('y', element.rect.y.toString())
    rect.setAttribute('width', element.rect.width.toString())
    rect.setAttribute('height', element.rect.height.toString())
    rect.setAttribute('rx', '4')
    rect.setAttribute('ry', '4')
    rect.setAttribute('fill', 'rgba(0, 123, 255, 0.12)')
    rect.setAttribute('stroke', 'rgba(0, 123, 255, 0.45)')
    rect.setAttribute('stroke-width', '1.5')
    overlay.appendChild(rect)
  })

  host.appendChild(overlay)
  return overlay
}

const updateOverlayTransform = (overlay: SVGGElement | null, offset: { x: number; y: number } | null) => {
  if (!overlay) {
    return
  }

  if (!offset || (Math.abs(offset.x) < 0.001 && Math.abs(offset.y) < 0.001)) {
    overlay.removeAttribute('transform')
    return
  }

  overlay.setAttribute('transform', `translate(${offset.x}, ${offset.y})`)
}

const removeOverlay = (overlay: SVGGElement | null) => {
  if (!overlay?.parentNode) {
    return
  }
  overlay.parentNode.removeChild(overlay)
}

export const withMultiThreadMoving = (board: PlaitBoard) => {
  const { pointerDown, pointerMove, pointerUp, globalPointerUp } = board

  const movementState: MovementState = {
    isDragging: false,
    startPoint: null,
    elements: [],
    overlay: null,
    latestOffset: null,
    committing: false,
  }

  const workerPool = typeof window !== 'undefined'
    ? new MovementWorkerPool(Math.min(4, Math.max(2, window.navigator.hardwareConcurrency || 2)))
    : null

  const resetMovement = () => {
    movementState.isDragging = false
    movementState.startPoint = null
    movementState.elements = []
    movementState.latestOffset = null
    movementState.committing = false
    removeOverlay(movementState.overlay)
    movementState.overlay = null
  }

  const collectMovementElements = (board: PlaitBoard): MovementElementState[] => {
    const selectedElements = getSelectedElements(board)
    return selectedElements
      .map(element => {
        const path = PlaitBoard.findPath(board, element)
        if (!path) {
          return null
        }

        const rectangle = board.getRectangle?.(element)

        const clonedPoints = clonePoints((element as any).points)
        if (clonedPoints && clonedPoints.length) {
          return {
            id: element.id,
            path,
            type: 'points' as const,
            originalPoints: clonedPoints,
            rect: rectangle
              ? { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height }
              : undefined,
          }
        }

        const hasPosition = typeof (element as any).x === 'number' && typeof (element as any).y === 'number'
        const hasSize = typeof (element as any).width === 'number' && typeof (element as any).height === 'number'

        if (hasPosition && hasSize) {
          return {
            id: element.id,
            path,
            type: 'rect' as const,
            position: { x: (element as any).x, y: (element as any).y },
            width: (element as any).width,
            height: (element as any).height,
            rect: rectangle
              ? { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height }
              : undefined,
          }
        }

        return null
      })
      .filter((item): item is MovementElementState => !!item)
  }

  const commitMovement = async () => {
    if (!movementState.elements.length) {
      return
    }

    const offset = movementState.latestOffset ?? { x: 0, y: 0 }

    if (!workerPool) {
      unstable_batchedUpdates(() => {
        movementState.elements.forEach(element => {
          if (element.type === 'points' && element.originalPoints) {
            const newPoints = element.originalPoints.map(([x, y]) => [x + offset.x, y + offset.y] as Point)
            Transforms.setNode(board, { points: newPoints }, element.path)
          } else if (element.position) {
            Transforms.setNode(board, {
              x: element.position.x + offset.x,
              y: element.position.y + offset.y,
            }, element.path)
          }
        })
      })
      return
    }

    const results = await workerPool.apply(offset)

    const stateById = new Map(movementState.elements.map(element => [element.id, element]))

    unstable_batchedUpdates(() => {
      results.forEach(result => {
        const elementState = stateById.get(result.id)
        if (!elementState) {
          return
        }

        const updates: Record<string, any> = {}
        if (result.points) {
          updates.points = result.points
        }
        if (result.position) {
          updates.x = result.position.x
          updates.y = result.position.y
        }

        if (Object.keys(updates).length) {
          Transforms.setNode(board, updates, elementState.path)
        }
      })
    })
  }

  board.pointerDown = event => {
    pointerDown(event)

    if (
      PlaitBoard.isReadonly(board) ||
      !PlaitBoard.isPointer(board, PlaitPointerType.selection) ||
      !isMainPointer(event)
    ) {
      return
    }

    const point = toViewBoxPoint(board, toHostPoint(board, event.x, event.y))
    const movementElements = collectMovementElements(board)

    if (movementElements.length) {
      movementState.isDragging = true
      movementState.startPoint = point
      movementState.elements = movementElements
      movementState.latestOffset = null
      movementState.committing = false
      removeOverlay(movementState.overlay)
      movementState.overlay = createOverlay(board, movementElements)

      const prepareElements = buildPrepareElements(movementElements)
      workerPool?.prepare(prepareElements).catch(() => {
        // ignore prepare errors; final commit will fallback
      })
    }
  }

  board.pointerMove = event => {
    if (movementState.isDragging && movementState.startPoint) {
      const nextPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y))
      const offset = {
        x: nextPoint[0] - movementState.startPoint[0],
        y: nextPoint[1] - movementState.startPoint[1],
      }

      movementState.latestOffset = offset
      updateOverlayTransform(movementState.overlay, offset)

      event.preventDefault()
      return
    }

    pointerMove(event)
  }

  const finishMovement = async (event?: PointerEvent) => {
    if (!movementState.isDragging || movementState.committing) {
      return
    }

    movementState.committing = true

    if (event && movementState.startPoint) {
      const endPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y))
      movementState.latestOffset = {
        x: endPoint[0] - movementState.startPoint[0],
        y: endPoint[1] - movementState.startPoint[1],
      }
    }

    try {
      await commitMovement()
    } finally {
      resetMovement()
    }
  }

  board.pointerUp = event => {
    finishMovement(event)
    pointerUp(event)
  }

  board.globalPointerUp = event => {
    finishMovement(event as PointerEvent)
    globalPointerUp(event)
  }

  if (typeof window !== 'undefined') {
    const originalDestroy = board.destroy?.bind(board)
    board.destroy = () => {
      workerPool?.terminate()
      originalDestroy?.()
    }
  }

  return board
}

