import {
  contextEngine,
  type AnalysisResult,
  type PerformanceMetric
} from '$lib/chat/context-engine';

/**
 * Analysis performance tracker for monitoring tool execution
 */
export class AnalysisPerformanceTracker {
  private metrics = new Map<string, PerformanceMetric[]>();
  private activeAnalyses = new Map<string, { startTime: number; type: string }>();

  /**
   * Start tracking an analysis
   */
  startAnalysis(conversationId: string, analysisType: string, analysisId: string): string {
    const id = analysisId || `${analysisType}_${Date.now()}`;
    this.activeAnalyses.set(id, {
      startTime: performance.now(),
      type: analysisType
    });
    return id;
  }

  /**
   * Complete tracking an analysis
   */
  completeAnalysis(conversationId: string, analysisId: string, result: AnalysisResult): void {
    const active = this.activeAnalyses.get(analysisId);
    if (!active) return;

    const executionTime = Math.round(performance.now() - active.startTime);
    result.executionTime = executionTime;

    // Track execution time metric
    this.trackMetric(conversationId, {
      metricName: 'execution_time',
      value: executionTime,
      unit: 'ms',
      timestamp: Date.now(),
      threshold: 5000, // 5 second threshold
      status: executionTime > 5000 ? 'critical' : executionTime > 2000 ? 'warning' : 'optimal'
    });

    // Track confidence metric
    this.trackMetric(conversationId, {
      metricName: 'confidence',
      value: result.confidence * 100,
      unit: '%',
      timestamp: Date.now(),
      threshold: 70,
      status: result.confidence < 0.5 ? 'critical' : result.confidence < 0.7 ? 'warning' : 'optimal'
    });

    // Store in context engine
    contextEngine.trackAnalysisResult(conversationId, result);

    this.activeAnalyses.delete(analysisId);
  }

  /**
   * Track a performance metric
   */
  trackMetric(conversationId: string, metric: PerformanceMetric): void {
    const existing = this.metrics.get(conversationId) || [];
    existing.push(metric);

    // Keep only last 100 metrics per conversation
    if (existing.length > 100) {
      existing.shift();
    }

    this.metrics.set(conversationId, existing);
    contextEngine.trackPerformanceMetric(conversationId, metric);
  }

  /**
   * Get performance metrics for a conversation
   */
  getMetrics(conversationId: string): PerformanceMetric[] {
    return this.metrics.get(conversationId) || [];
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(conversationId: string): {
    averageExecutionTime: number;
    averageConfidence: number;
    criticalIssues: number;
    totalAnalyses: number;
    performanceTrend: 'improving' | 'stable' | 'degrading';
  } {
    const metrics = this.getMetrics(conversationId);
    const executionTimes = metrics.filter((m) => m.metricName === 'execution_time');
    const confidences = metrics.filter((m) => m.metricName === 'confidence');
    const criticalMetrics = metrics.filter((m) => m.status === 'critical');

    const averageExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, m) => sum + m.value, 0) / executionTimes.length
        : 0;

    const averageConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, m) => sum + m.value, 0) / confidences.length
        : 0;

    // Calculate trend (simple linear regression on last 10 execution times)
    const recentTimes = executionTimes.slice(-10).map((m) => m.value);
    let performanceTrend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (recentTimes.length >= 3) {
      const firstHalf = recentTimes.slice(0, Math.floor(recentTimes.length / 2));
      const secondHalf = recentTimes.slice(Math.floor(recentTimes.length / 2));

      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

      const change = (secondAvg - firstAvg) / firstAvg;
      if (change > 0.1) performanceTrend = 'degrading';
      else if (change < -0.1) performanceTrend = 'improving';
    }

    return {
      averageExecutionTime: Math.round(averageExecutionTime),
      averageConfidence: Math.round(averageConfidence),
      criticalIssues: criticalMetrics.length,
      totalAnalyses: executionTimes.length,
      performanceTrend
    };
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(conversationId: string): string[] {
    const summary = this.getMetricsSummary(conversationId);
    const recommendations: string[] = [];

    if (summary.averageExecutionTime > 3000) {
      recommendations.push('Consider optimizing analysis algorithms for better performance');
    }

    if (summary.averageConfidence < 70) {
      recommendations.push('Review analysis parameters to improve confidence levels');
    }

    if (summary.criticalIssues > 0) {
      recommendations.push('Address critical performance issues immediately');
    }

    if (summary.performanceTrend === 'degrading') {
      recommendations.push('Performance is degrading over time - investigate root causes');
    }

    return recommendations;
  }

  /**
   * Export metrics data
   */
  exportMetrics(conversationId: string): string {
    const metrics = this.getMetrics(conversationId);
    const summary = this.getMetricsSummary(conversationId);

    return JSON.stringify(
      {
        conversationId,
        timestamp: Date.now(),
        summary,
        metrics
      },
      null,
      2
    );
  }

  /**
   * Clear metrics for a conversation
   */
  clearMetrics(conversationId: string): void {
    this.metrics.delete(conversationId);
    this.activeAnalyses.forEach((active, id) => {
      if (id.includes(conversationId)) {
        this.activeAnalyses.delete(id);
      }
    });
  }
}

// Singleton instance
export const analysisTracker = new AnalysisPerformanceTracker();
