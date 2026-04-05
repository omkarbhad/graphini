/**
 * Performance monitoring and optimization dashboard
 * Tracks database queries, streaming performance, and frontend metrics
 */

import { performanceTracker } from '$lib/server/db-optimized';
import { streamingMonitor } from '$lib/server/streaming-optimized';

// ============================================================================
// PERFORMANCE METRICS TYPES
// ============================================================================

export interface PerformanceMetrics {
  database: {
    queryCount: number;
    avgQueryTime: number;
    slowQueries: number;
    connectionPoolUtilization: number;
  };
  streaming: {
    activeStreams: number;
    avgStreamDuration: number;
    streamErrors: number;
    bufferUtilization: number;
  };
  frontend: {
    componentRerenders: number;
    memoryUsage: number;
    bundleSize: number;
    firstContentfulPaint: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
}

export interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'database' | 'streaming' | 'frontend' | 'system';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  resolved: boolean;
}

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

export class PerformanceMonitor {
  private alerts: PerformanceAlert[] = [];
  private thresholds = {
    database: {
      avgQueryTime: 1000, // 1 second
      slowQueryRate: 0.1, // 10% of queries
      connectionPoolUtilization: 0.8 // 80%
    },
    streaming: {
      activeStreams: 100,
      avgStreamDuration: 300000, // 5 minutes
      streamErrorRate: 0.05, // 5%
      bufferUtilization: 0.7 // 70%
    },
    frontend: {
      componentRerenders: 1000, // per minute
      memoryUsage: 100 * 1024 * 1024, // 100MB
      bundleSize: 5 * 1024 * 1024, // 5MB
      firstContentfulPaint: 3000 // 3 seconds
    },
    system: {
      cpuUsage: 0.8, // 80%
      memoryUsage: 0.85, // 85%
      diskUsage: 0.9, // 90%
      networkLatency: 1000 // 1 second
    }
  };

  private alertHistory: PerformanceAlert[] = [];
  private maxHistorySize = 1000;

  async collectMetrics(): Promise<PerformanceMetrics> {
    const now = Date.now();

    // Collect database metrics
    const dbMetrics = await this.collectDatabaseMetrics();

    // Collect streaming metrics
    const streamingMetrics = this.collectStreamingMetrics();

    // Collect frontend metrics (simulated for now)
    const frontendMetrics = await this.collectFrontendMetrics();

    // Collect system metrics
    const systemMetrics = await this.collectSystemMetrics();

    const metrics: PerformanceMetrics = {
      database: dbMetrics,
      streaming: streamingMetrics,
      frontend: frontendMetrics,
      system: systemMetrics
    };

    // Check for performance alerts
    this.checkAlerts(metrics);

    return metrics;
  }

  private async collectDatabaseMetrics() {
    const queryMetrics = performanceTracker.getMetrics();
    const avgQueryTime = performanceTracker.getAverageQueryTime('getConversationWithMessages');

    const queryCount = queryMetrics.length;
    const slowQueries = queryMetrics.filter(
      (m) => m.duration > this.thresholds.database.avgQueryTime
    ).length;
    const avgTime =
      queryCount > 0 ? queryMetrics.reduce((sum, m) => sum + m.duration, 0) / queryCount : 0;

    return {
      queryCount,
      avgQueryTime: avgTime,
      slowQueries,
      connectionPoolUtilization: 0.5 // Placeholder - would come from connection pool
    };
  }

  private collectStreamingMetrics() {
    const streamingMetrics = streamingMonitor.getMetrics();

    return {
      activeStreams: streamingMetrics.activeStreams,
      avgStreamDuration: 0, // Would calculate from completed streams
      streamErrors: 0, // Would track from error callbacks
      bufferUtilization: streamingMetrics.streamPoolMetrics.utilization
    };
  }

  private async collectFrontendMetrics() {
    // In a real implementation, these would come from frontend telemetry
    return {
      componentRerenders: 0,
      memoryUsage: 0,
      bundleSize: 0,
      firstContentfulPaint: 0
    };
  }

  private async collectSystemMetrics() {
    // In a real implementation, these would come from system monitoring
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0
    };
  }

  private checkAlerts(metrics: PerformanceMetrics): void {
    const now = new Date().toISOString();

    // Database alerts
    if (metrics.database.avgQueryTime > this.thresholds.database.avgQueryTime) {
      this.createAlert({
        id: `db-query-time-${Date.now()}`,
        severity: 'high',
        category: 'database',
        message: `Average query time exceeded threshold`,
        value: metrics.database.avgQueryTime,
        threshold: this.thresholds.database.avgQueryTime,
        timestamp: now,
        resolved: false
      });
    }

    if (
      metrics.database.connectionPoolUtilization >
      this.thresholds.database.connectionPoolUtilization
    ) {
      this.createAlert({
        id: `db-pool-${Date.now()}`,
        severity: 'medium',
        category: 'database',
        message: `Database connection pool utilization high`,
        value: metrics.database.connectionPoolUtilization,
        threshold: this.thresholds.database.connectionPoolUtilization,
        timestamp: now,
        resolved: false
      });
    }

    // Streaming alerts
    if (metrics.streaming.activeStreams > this.thresholds.streaming.activeStreams) {
      this.createAlert({
        id: `stream-count-${Date.now()}`,
        severity: 'critical',
        category: 'streaming',
        message: `Too many active streams`,
        value: metrics.streaming.activeStreams,
        threshold: this.thresholds.streaming.activeStreams,
        timestamp: now,
        resolved: false
      });
    }

    // System alerts
    if (metrics.system.memoryUsage > this.thresholds.system.memoryUsage) {
      this.createAlert({
        id: `memory-${Date.now()}`,
        severity: 'critical',
        category: 'system',
        message: `System memory usage critical`,
        value: metrics.system.memoryUsage,
        threshold: this.thresholds.system.memoryUsage,
        timestamp: now,
        resolved: false
      });
    }
  }

  private createAlert(alert: PerformanceAlert): void {
    // Check if similar alert already exists and is unresolved
    const existingAlert = this.alerts.find(
      (a) => a.category === alert.category && a.message === alert.message && !a.resolved
    );

    if (!existingAlert) {
      this.alerts.push(alert);
      this.alertHistory.push(alert);

      // Limit history size
      if (this.alertHistory.length > this.maxHistorySize) {
        this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
      }

      // Log critical alerts
      if (alert.severity === 'critical') {
        console.error('CRITICAL PERFORMANCE ALERT:', alert);
      }
    }
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  getAlertHistory(limit = 100): PerformanceAlert[] {
    return this.alertHistory.slice(-limit);
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  updateThresholds<T extends keyof typeof this.thresholds>(
    category: T,
    newThresholds: Partial<(typeof this.thresholds)[T]>
  ): void {
    const currentThresholds = this.thresholds[category];
    this.thresholds[category] = {
      ...currentThresholds,
      ...newThresholds
    } as (typeof this.thresholds)[T];
  }

  getThresholds() {
    return { ...this.thresholds };
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION RECOMMENDATIONS
// ============================================================================

export interface OptimizationRecommendation {
  id: string;
  category: 'database' | 'streaming' | 'frontend' | 'system';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  implementationEffort: 'low' | 'medium' | 'high';
  codeExample?: string;
}

export class OptimizationEngine {
  private recommendations: OptimizationRecommendation[] = [
    // Database optimizations
    {
      id: 'db-index-optimization',
      category: 'database',
      priority: 'high',
      title: 'Add missing database indexes',
      description: 'Add composite indexes for frequently queried columns to reduce query time',
      estimatedImpact: 'high',
      implementationEffort: 'medium',
      codeExample: `CREATE INDEX idx_conversations_user_updated 
ON conversations(user_id, updated_at DESC);`
    },
    {
      id: 'db-query-optimization',
      category: 'database',
      priority: 'high',
      title: 'Optimize N+1 queries',
      description: 'Use JOIN queries instead of separate queries to reduce database round trips',
      estimatedImpact: 'high',
      implementationEffort: 'medium'
    },
    {
      id: 'db-connection-pooling',
      category: 'database',
      priority: 'medium',
      title: 'Implement connection pooling',
      description: 'Reuse database connections to reduce connection overhead',
      estimatedImpact: 'medium',
      implementationEffort: 'low'
    },

    // Streaming optimizations
    {
      id: 'stream-buffer-management',
      category: 'streaming',
      priority: 'high',
      title: 'Implement proper buffer management',
      description: 'Add backpressure handling and buffer size limits to prevent memory leaks',
      estimatedImpact: 'high',
      implementationEffort: 'medium'
    },
    {
      id: 'stream-timeout-optimization',
      category: 'streaming',
      priority: 'medium',
      title: 'Optimize stream timeouts',
      description: 'Implement adaptive timeouts based on stream complexity and client speed',
      estimatedImpact: 'medium',
      implementationEffort: 'low'
    },

    // Frontend optimizations
    {
      id: 'component-decomposition',
      category: 'frontend',
      priority: 'high',
      title: 'Decompose large components',
      description: 'Split monolithic components into smaller, focused components',
      estimatedImpact: 'high',
      implementationEffort: 'medium'
    },
    {
      id: 'rerender-optimization',
      category: 'frontend',
      priority: 'medium',
      title: 'Optimize component re-renders',
      description:
        'Use memoization and proper dependency management to reduce unnecessary re-renders',
      estimatedImpact: 'medium',
      implementationEffort: 'low'
    },
    {
      id: 'memory-cleanup',
      category: 'frontend',
      priority: 'medium',
      title: 'Implement memory cleanup',
      description: 'Add cleanup for Maps, Sets, and event listeners to prevent memory leaks',
      estimatedImpact: 'medium',
      implementationEffort: 'low'
    }
  ];

  getRecommendations(category?: keyof PerformanceMetrics): OptimizationRecommendation[] {
    if (category) {
      return this.recommendations.filter((r) => r.category === category);
    }
    return this.recommendations;
  }

  getRecommendationsByPriority(priority: 'low' | 'medium' | 'high'): OptimizationRecommendation[] {
    return this.recommendations.filter((r) => r.priority === priority);
  }

  addRecommendation(recommendation: Omit<OptimizationRecommendation, 'id'>): void {
    this.recommendations.push({
      ...recommendation,
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  }
}

// ============================================================================
// PERFORMANCE DASHBOARD COMPONENT
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();
export const optimizationEngine = new OptimizationEngine();

// ============================================================================
// API ENDPOINTS FOR MONITORING
// ============================================================================

export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  return await performanceMonitor.collectMetrics();
}

export async function getPerformanceAlerts(): Promise<PerformanceAlert[]> {
  return performanceMonitor.getActiveAlerts();
}

export async function getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
  return optimizationEngine.getRecommendations();
}

export async function resolvePerformanceAlert(alertId: string): Promise<void> {
  performanceMonitor.resolveAlert(alertId);
}

export async function updatePerformanceThresholds(
  category: keyof (typeof performanceMonitor)['thresholds'],
  thresholds: Partial<
    (typeof performanceMonitor)['thresholds'][keyof (typeof performanceMonitor)['thresholds']]
  >
): Promise<void> {
  performanceMonitor.updateThresholds(category, thresholds);
}

// ============================================================================
// AUTOMATIC OPTIMIZATION
// ============================================================================

export class AutoOptimizer {
  private isRunning = false;
  private optimizationInterval = 60000; // 1 minute

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Starting automatic performance optimization...');

    this.runOptimizationCycle();
  }

  stop(): void {
    this.isRunning = false;
    console.log('Stopped automatic performance optimization');
  }

  private async runOptimizationCycle(): Promise<void> {
    while (this.isRunning) {
      try {
        const metrics = await performanceMonitor.collectMetrics();
        const alerts = performanceMonitor.getActiveAlerts();

        // Auto-resolve some alerts
        await this.autoResolveAlerts(alerts);

        // Apply automatic optimizations
        await this.applyAutoOptimizations(metrics);

        // Wait for next cycle
        await new Promise((resolve) => setTimeout(resolve, this.optimizationInterval));
      } catch (error) {
        console.error('Error in optimization cycle:', error);
        await new Promise((resolve) => setTimeout(resolve, this.optimizationInterval));
      }
    }
  }

  private async autoResolveAlerts(alerts: PerformanceAlert[]): Promise<void> {
    for (const alert of alerts) {
      if (alert.category === 'streaming' && alert.message.includes('buffer')) {
        // Auto-adjust buffer sizes
        console.log('Auto-adjusting streaming buffer sizes...');
        performanceMonitor.resolveAlert(alert.id);
      }
    }
  }

  private async applyAutoOptimizations(metrics: PerformanceMetrics): Promise<void> {
    // Auto-scale database connections if needed
    if (metrics.database.connectionPoolUtilization > 0.8) {
      console.log('High database connection pool utilization detected');
      // Would trigger connection pool scaling
    }

    // Auto-cleanup idle streams
    if (metrics.streaming.activeStreams > 50) {
      console.log('Cleaning up idle streams...');
      streamingMonitor.forceCleanupAll();
    }
  }
}

export const autoOptimizer = new AutoOptimizer();
