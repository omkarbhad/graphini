/**
 * Simple performance monitoring utility
 */

interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations = new Map<string, PerformanceMetrics>();

  constructor(private serviceName: string) {}

  start(operation: string, metadata?: Record<string, any>): string {
    const id = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetrics = {
      startTime: performance.now(),
      operation,
      metadata
    };

    this.activeOperations.set(id, metric);
    return id;
  }

  end(id: string, additionalMetadata?: Record<string, any>): PerformanceMetrics | null {
    const metric = this.activeOperations.get(id);
    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    this.metrics.push(metric);
    this.activeOperations.delete(id);

    // Log performance metrics
    console.log(
      `[Performance] ${this.serviceName}:${metric.operation} - ${metric.duration.toFixed(2)}ms`
    );

    return metric;
  }

  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter((m) => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageDuration(operation?: string): number {
    const relevantMetrics = this.getMetrics(operation);
    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / relevantMetrics.length;
  }

  clear(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }
}

export function performanceMonitor(serviceName: string): PerformanceMonitor {
  return new PerformanceMonitor(serviceName);
}

// Helper function to measure async operations
export async function measurePerformance<T>(
  monitor: PerformanceMonitor,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const id = monitor.start(operation, metadata);

  try {
    const result = await fn();
    monitor.end(id, { success: true });
    return result;
  } catch (error) {
    monitor.end(id, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
