type MovementWorkerElement =
  | {
      id: string
      type: 'points'
      points: number[][]
    }
  | {
      id: string
      type: 'rect'
      position: { x: number; y: number }
      width: number
      height: number
    }

export type MovementWorkerTask =
  | {
      type: 'prepare'
      elements: MovementWorkerElement[]
    }
  | {
      type: 'apply'
      offset: { x: number; y: number }
    }

export interface MovementWorkerResult {
  id: string
  points?: number[][]
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

type PendingTask = {
  resolve: (value: MovementWorkerResult[]) => void
  reject: (reason?: any) => void
}

type QueuedTask = {
  taskId: number
  payload: MovementWorkerTask
  resolve: (value: MovementWorkerResult[] | { prepared: true }) => void
  reject: (reason?: any) => void
}

export class MovementWorkerPool {
  private readonly workers: Worker[] = []
  private readonly idleWorkers: Worker[] = []
  private readonly pendingTasks = new Map<number, PendingTask>()
  private readonly queue: QueuedTask[] = []
  private taskCounter = 0

  constructor(size: number) {
    if (typeof window === 'undefined') {
      return
    }

    const poolSize = Math.max(1, size)
    for (let i = 0; i < poolSize; i += 1) {
      const worker = new Worker(new URL('./movement.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = this.handleMessage.bind(this, worker)
      worker.onerror = this.handleError.bind(this, worker)

      this.workers.push(worker)
      this.idleWorkers.push(worker)
    }
  }

  runTask(task: MovementWorkerTask): Promise<MovementWorkerResult[] | { prepared: true }> {
    if (this.workers.length === 0) {
      return task.type === 'apply'
        ? Promise.resolve([])
        : Promise.resolve({ prepared: true })
    }

    return new Promise((resolve, reject) => {
      const taskId = this.taskCounter++
      this.queue.push({ taskId, payload: task, resolve, reject })
      this.dispatch()
    })
  }

  prepare(elements: MovementWorkerElement[]): Promise<{ prepared: true }> {
    return this.runTask({ type: 'prepare', elements }) as Promise<{ prepared: true }>
  }

  apply(offset: { x: number; y: number }): Promise<MovementWorkerResult[]> {
    return this.runTask({ type: 'apply', offset }) as Promise<MovementWorkerResult[]>
  }

  terminate() {
    this.queue.splice(0, this.queue.length)
    this.pendingTasks.forEach(({ reject }) => reject(new Error('Movement worker pool terminated'))) 
    this.pendingTasks.clear()
    this.workers.forEach(worker => worker.terminate())
    this.idleWorkers.splice(0, this.idleWorkers.length)
  }

  private dispatch() {
    if (!this.queue.length || !this.idleWorkers.length) {
      return
    }

    const worker = this.idleWorkers.pop()!
    const task = this.queue.shift()!

    this.pendingTasks.set(task.taskId, { resolve: task.resolve, reject: task.reject })
    worker.postMessage({ id: task.taskId, payload: task.payload })
  }

  private handleMessage(worker: Worker, event: MessageEvent<{ id: number; results?: MovementWorkerResult[]; error?: string }>) {
    const { id, results, error } = event.data
    const pending = this.pendingTasks.get(id)

    if (!pending) {
      this.idleWorkers.push(worker)
      this.dispatch()
      return
    }

    this.pendingTasks.delete(id)

    if (error) {
      pending.reject(new Error(error))
    } else if (results) {
      pending.resolve(results)
    } else {
      pending.resolve({ prepared: true })
    }

    this.idleWorkers.push(worker)
    this.dispatch()
  }

  private handleError(worker: Worker, event: ErrorEvent) {
    this.idleWorkers.push(worker)
    this.dispatch()
    throw event.error ?? new Error('Movement worker encountered an error')
  }
}

