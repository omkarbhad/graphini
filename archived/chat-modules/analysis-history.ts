import { analysisTracker } from '$lib/chat/analysis-tracker';
import { contextEngine, type AnalysisResult } from '$lib/chat/context-engine';

/**
 * Analysis history and comparison utilities
 */
export class AnalysisHistoryManager {
  private comparisonCache = new Map<string, ComparisonResult>();

  /**
   * Compare two analysis results
   */
  compareAnalyses(analysis1: AnalysisResult, analysis2: AnalysisResult): ComparisonResult {
    const cacheKey = `${analysis1.timestamp}_${analysis2.timestamp}`;

    if (this.comparisonCache.has(cacheKey)) {
      return this.comparisonCache.get(cacheKey)!;
    }

    const result: ComparisonResult = {
      timestamp: Date.now(),
      analysis1Id: analysis1.timestamp.toString(),
      analysis2Id: analysis2.timestamp.toString(),
      confidenceChange: analysis2.confidence - analysis1.confidence,
      complexityChange: this.getComplexityChange(analysis1.complexity, analysis2.complexity),
      executionTimeChange: (analysis2.executionTime || 0) - (analysis1.executionTime || 0),
      insightsComparison: this.compareInsights(analysis1.insights, analysis2.insights),
      metricsComparison: this.compareMetrics(analysis1.metrics, analysis2.metrics),
      recommendationsComparison: this.compareRecommendations(
        analysis1.recommendations,
        analysis2.recommendations
      ),
      overallImprovement: this.calculateOverallImprovement(analysis1, analysis2)
    };

    this.comparisonCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get analysis history for a conversation with trend analysis
   */
  getAnalysisHistoryWithTrends(conversationId: string): AnalysisHistoryWithTrends {
    const history = contextEngine.getAnalysisHistory(conversationId);
    const trends = this.calculateTrends(history);
    const comparisons = this.generateRecentComparisons(history);

    return {
      history,
      trends,
      comparisons,
      summary: this.generateHistorySummary(history)
    };
  }

  /**
   * Generate analysis report
   */
  generateAnalysisReport(conversationId: string): AnalysisReport {
    const context = contextEngine.buildConversationContext(conversationId, [], {
      code: '',
      diagramType: ''
    } as any);
    const historyWithTrends = this.getAnalysisHistoryWithTrends(conversationId);
    const performanceSummary = analysisTracker.getMetricsSummary(conversationId);

    return {
      conversationId,
      generatedAt: Date.now(),
      context: {
        diagramType: context.diagramType,
        mode: context.mode,
        messageCount: context.messageCount,
        hasErrors: context.hasErrors || false,
        isComplexDiagram: context.isComplexDiagram || false
      },
      analysis: {
        totalAnalyses: historyWithTrends.history.length,
        averageConfidence: performanceSummary.averageConfidence,
        averageExecutionTime: performanceSummary.averageExecutionTime,
        criticalIssues: performanceSummary.criticalIssues,
        trends: historyWithTrends.trends
      },
      performance: performanceSummary,
      recommendations: this.generateReportRecommendations(historyWithTrends, performanceSummary),
      insights: this.generateReportInsights(historyWithTrends)
    };
  }

  /**
   * Export analysis data
   */
  exportAnalysisData(conversationId: string, format: 'json' | 'csv' = 'json'): string {
    const report = this.generateAnalysisReport(conversationId);

    if (format === 'csv') {
      return this.convertToCSV(report);
    }

    return JSON.stringify(report, null, 2);
  }

  /**
   * Clear analysis history for a conversation
   */
  clearHistory(conversationId: string): void {
    // Clear context using the available method
    contextEngine.clearOldContexts(conversationId, 0);
    analysisTracker.clearMetrics(conversationId);

    // Clear comparison cache
    this.comparisonCache.forEach((value, key) => {
      if (key.includes(conversationId)) {
        this.comparisonCache.delete(key);
      }
    });
  }

  private getComplexityChange(
    complexity1: string,
    complexity2: string
  ): 'increased' | 'decreased' | 'same' {
    const levels = { low: 1, medium: 2, high: 3 };
    const level1 = levels[complexity1 as keyof typeof levels] || 2;
    const level2 = levels[complexity2 as keyof typeof levels] || 2;

    if (level2 > level1) return 'increased';
    if (level2 < level1) return 'decreased';
    return 'same';
  }

  private compareInsights(insights1: string[], insights2: string[]): InsightComparison {
    const common = insights1.filter((i) => insights2.includes(i));
    const unique1 = insights1.filter((i) => !insights2.includes(i));
    const unique2 = insights2.filter((i) => !insights1.includes(i));

    return {
      common,
      uniqueToFirst: unique1,
      uniqueToSecond: unique2,
      similarity: common.length / Math.max(insights1.length, insights2.length)
    };
  }

  private compareMetrics(
    metrics1?: Record<string, number>,
    metrics2?: Record<string, number>
  ): MetricComparison {
    if (!metrics1 || !metrics2) return { changes: [], similarity: 1 };

    const changes: MetricChange[] = [];
    const allKeys = new Set([...Object.keys(metrics1), ...Object.keys(metrics2)]);

    for (const key of allKeys) {
      const value1 = metrics1[key] || 0;
      const value2 = metrics2[key] || 0;

      if (value1 !== value2) {
        changes.push({
          metric: key,
          oldValue: value1,
          newValue: value2,
          changePercent: value1 !== 0 ? ((value2 - value1) / value1) * 100 : 0
        });
      }
    }

    return {
      changes,
      similarity: 1 - changes.length / allKeys.size
    };
  }

  private compareRecommendations(rec1?: string[], rec2?: string[]): RecommendationComparison {
    const recommendations1 = rec1 || [];
    const recommendations2 = rec2 || [];

    const common = recommendations1.filter((r) => recommendations2.includes(r));
    const resolved = recommendations1.filter((r) => !recommendations2.includes(r));
    const newRecommendations = recommendations2.filter((r) => !recommendations1.includes(r));

    return {
      common,
      resolved,
      new: newRecommendations,
      improvementScore:
        (resolved.length - newRecommendations.length) / Math.max(recommendations1.length, 1)
    };
  }

  private calculateOverallImprovement(
    analysis1: AnalysisResult,
    analysis2: AnalysisResult
  ): number {
    let score = 0;
    let factors = 0;

    // Confidence improvement
    score += (analysis2.confidence - analysis1.confidence) * 0.4;
    factors++;

    // Execution time improvement (negative is better)
    const timeImprovement = (analysis1.executionTime || 0) - (analysis2.executionTime || 0);
    score += (timeImprovement / Math.max(analysis1.executionTime || 1, 1)) * 0.3;
    factors++;

    // Complexity improvement
    const complexityLevels = { low: 1, medium: 2, high: 3 };
    const complexityImprovement =
      (complexityLevels[analysis1.complexity] - complexityLevels[analysis2.complexity]) / 2;
    score += complexityImprovement * 0.3;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  private calculateTrends(history: AnalysisResult[]): AnalysisTrends {
    if (history.length < 2) {
      return {
        confidenceTrend: 'stable',
        executionTimeTrend: 'stable',
        complexityTrend: 'stable',
        qualityTrend: 'stable'
      };
    }

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    const avgConfidenceRecent = recent.reduce((sum, a) => sum + a.confidence, 0) / recent.length;
    const avgConfidenceOlder =
      older.length > 0
        ? older.reduce((sum, a) => sum + a.confidence, 0) / older.length
        : avgConfidenceRecent;

    const avgTimeRecent =
      recent.reduce((sum, a) => sum + (a.executionTime || 0), 0) / recent.length;
    const avgTimeOlder =
      older.length > 0
        ? older.reduce((sum, a) => sum + (a.executionTime || 0), 0) / older.length
        : avgTimeRecent;

    return {
      confidenceTrend:
        avgConfidenceRecent > avgConfidenceOlder + 0.05
          ? 'improving'
          : avgConfidenceRecent < avgConfidenceOlder - 0.05
            ? 'declining'
            : 'stable',
      executionTimeTrend:
        avgTimeRecent < avgTimeOlder - 500
          ? 'improving'
          : avgTimeRecent > avgTimeOlder + 500
            ? 'declining'
            : 'stable',
      complexityTrend: this.calculateComplexityTrend(recent, older),
      qualityTrend: this.calculateQualityTrend(recent, older)
    };
  }

  private calculateComplexityTrend(
    recent: AnalysisResult[],
    older: AnalysisResult[]
  ): 'improving' | 'declining' | 'stable' {
    const complexityLevels = { low: 1, medium: 2, high: 3 };

    const avgRecent =
      recent.reduce((sum, a) => sum + complexityLevels[a.complexity], 0) / recent.length;
    const avgOlder =
      older.length > 0
        ? older.reduce((sum, a) => sum + complexityLevels[a.complexity], 0) / older.length
        : avgRecent;

    return avgRecent < avgOlder - 0.2
      ? 'improving'
      : avgRecent > avgOlder + 0.2
        ? 'declining'
        : 'stable';
  }

  private calculateQualityTrend(
    recent: AnalysisResult[],
    older: AnalysisResult[]
  ): 'improving' | 'declining' | 'stable' {
    const qualityScore = (analysis: AnalysisResult) => {
      return analysis.confidence * 0.6 + (1 - (analysis.executionTime || 0) / 5000) * 0.4;
    };

    const avgRecent = recent.reduce((sum, a) => sum + qualityScore(a), 0) / recent.length;
    const avgOlder =
      older.length > 0
        ? older.reduce((sum, a) => sum + qualityScore(a), 0) / older.length
        : avgRecent;

    return avgRecent > avgOlder + 0.05
      ? 'improving'
      : avgRecent < avgOlder - 0.05
        ? 'declining'
        : 'stable';
  }

  private generateRecentComparisons(history: AnalysisResult[]): ComparisonResult[] {
    const comparisons: ComparisonResult[] = [];

    for (let i = 1; i < Math.min(history.length, 5); i++) {
      comparisons.push(
        this.compareAnalyses(history[history.length - i - 1], history[history.length - i])
      );
    }

    return comparisons.reverse();
  }

  private generateHistorySummary(history: AnalysisResult[]): HistorySummary {
    const types = history.reduce(
      (acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalAnalyses: history.length,
      analysisTypes: types,
      averageConfidence: history.reduce((sum, a) => sum + a.confidence, 0) / history.length,
      averageExecutionTime:
        history.reduce((sum, a) => sum + (a.executionTime || 0), 0) / history.length,
      mostCommonComplexity: this.getMostCommonComplexity(history)
    };
  }

  private getMostCommonComplexity(history: AnalysisResult[]): string {
    const counts = history.reduce(
      (acc, a) => {
        acc[a.complexity] = (acc[a.complexity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'medium';
  }

  private generateReportRecommendations(
    historyWithTrends: AnalysisHistoryWithTrends,
    performanceSummary: any
  ): string[] {
    const recommendations: string[] = [];

    if (historyWithTrends.trends.confidenceTrend === 'declining') {
      recommendations.push(
        'Analysis confidence is declining - review input parameters and data quality'
      );
    }

    if (historyWithTrends.trends.executionTimeTrend === 'declining') {
      recommendations.push(
        'Performance is degrading - consider optimization or resource allocation'
      );
    }

    if (performanceSummary.criticalIssues > 0) {
      recommendations.push(
        `Address ${performanceSummary.criticalIssues} critical performance issues`
      );
    }

    if (historyWithTrends.summary.averageConfidence < 0.7) {
      recommendations.push('Overall confidence levels are below optimal threshold');
    }

    return recommendations;
  }

  private generateReportInsights(historyWithTrends: AnalysisHistoryWithTrends): string[] {
    const insights: string[] = [];

    if (historyWithTrends.history.length > 10) {
      insights.push(`Strong analysis history with ${historyWithTrends.history.length} data points`);
    }

    if (historyWithTrends.trends.qualityTrend === 'improving') {
      insights.push('Analysis quality is consistently improving over time');
    }

    const mostCommonType = Object.entries(historyWithTrends.summary.analysisTypes).sort(
      ([, a], [, b]) => b - a
    )[0];

    if (mostCommonType) {
      insights.push(
        `Most frequent analysis type: ${mostCommonType[0]} (${mostCommonType[1]} times)`
      );
    }

    return insights;
  }

  private convertToCSV(report: AnalysisReport): string {
    const headers = ['Metric', 'Value', 'Category'];
    const rows = [
      ['Total Analyses', report.analysis.totalAnalyses.toString(), 'Analysis'],
      ['Average Confidence', report.analysis.averageConfidence.toString(), 'Analysis'],
      ['Average Execution Time', report.analysis.averageExecutionTime.toString(), 'Performance'],
      ['Critical Issues', report.performance.criticalIssues.toString(), 'Performance'],
      ['Message Count', report.context.messageCount.toString(), 'Context'],
      ['Has Errors', report.context.hasErrors.toString(), 'Context']
    ];

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}

// Type definitions
interface ComparisonResult {
  timestamp: number;
  analysis1Id: string;
  analysis2Id: string;
  confidenceChange: number;
  complexityChange: 'increased' | 'decreased' | 'same';
  executionTimeChange: number;
  insightsComparison: InsightComparison;
  metricsComparison: MetricComparison;
  recommendationsComparison: RecommendationComparison;
  overallImprovement: number;
}

interface InsightComparison {
  common: string[];
  uniqueToFirst: string[];
  uniqueToSecond: string[];
  similarity: number;
}

interface MetricComparison {
  changes: MetricChange[];
  similarity: number;
}

interface MetricChange {
  metric: string;
  oldValue: number;
  newValue: number;
  changePercent: number;
}

interface RecommendationComparison {
  common: string[];
  resolved: string[];
  new: string[];
  improvementScore: number;
}

interface AnalysisTrends {
  confidenceTrend: 'improving' | 'declining' | 'stable';
  executionTimeTrend: 'improving' | 'declining' | 'stable';
  complexityTrend: 'improving' | 'declining' | 'stable';
  qualityTrend: 'improving' | 'declining' | 'stable';
}

interface HistorySummary {
  totalAnalyses: number;
  analysisTypes: Record<string, number>;
  averageConfidence: number;
  averageExecutionTime: number;
  mostCommonComplexity: string;
}

interface AnalysisHistoryWithTrends {
  history: AnalysisResult[];
  trends: AnalysisTrends;
  comparisons: ComparisonResult[];
  summary: HistorySummary;
}

interface AnalysisReport {
  conversationId: string;
  generatedAt: number;
  context: {
    diagramType?: string;
    mode: string;
    messageCount: number;
    hasErrors: boolean;
    isComplexDiagram: boolean;
  };
  analysis: {
    totalAnalyses: number;
    averageConfidence: number;
    averageExecutionTime: number;
    criticalIssues: number;
    trends: AnalysisTrends;
  };
  performance: any;
  recommendations: string[];
  insights: string[];
}

// Singleton instance
export const analysisHistoryManager = new AnalysisHistoryManager();
