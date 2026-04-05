import type { ValidatedState } from '$/types';
import type { UIMessage } from 'ai';

/**
 * Context types that can be tracked
 */
export type ContextType =
  | 'diagram_state'
  | 'user_intent'
  | 'conversation_history'
  | 'diagram_history'
  | 'error_context'
  | 'user_preferences'
  | 'analysis_result'
  | 'performance_metric'
  | 'syntax_validation';

/**
 * Context item with metadata
 */
export interface ContextItem {
  type: ContextType;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  relevance?: number; // 0-1 score for context relevance
}

/**
 * Conversation context snapshot
 */
export interface ConversationContext {
  currentDiagram: string;
  diagramType?: string;
  mode: 'create' | 'edit';
  recentChanges: string[];
  userIntents: string[];
  errorHistory: string[];
  conversationSummary: string;
  messageCount: number;
  // Enhanced metadata
  hasCode?: boolean;
  hasRecentActivity?: boolean;
  hasErrors?: boolean;
  hasMultipleIntents?: boolean;
  isComplexDiagram?: boolean;
  lastActivity?: number;
  dominantIntent?: string;
  // Analysis tracking
  analysisHistory?: AnalysisResult[];
  performanceMetrics?: PerformanceMetric[];
  syntaxValidation?: SyntaxValidation[];
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  type: 'diagram' | 'performance' | 'syntax' | 'compatibility';
  timestamp: number;
  confidence: number;
  complexity: 'low' | 'medium' | 'high';
  insights: string[];
  metrics?: Record<string, number>;
  recommendations?: string[];
  executionTime?: number;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  metricName: string;
  value: number;
  unit: string;
  timestamp: number;
  threshold?: number;
  status: 'optimal' | 'warning' | 'critical';
}

/**
 * Syntax validation result
 */
export interface SyntaxValidation {
  valid: boolean;
  errors: SyntaxError[];
  warnings: SyntaxWarning[];
  timestamp: number;
  lineCount: number;
}

interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface SyntaxWarning {
  line: number;
  column: number;
  message: string;
  suggestion?: string;
}

/**
 * Context Engine for managing conversation context
 */
export class ContextEngine {
  private contexts = new Map<string, ContextItem[]>();
  private maxContextItems = 50;
  private maxHistoryLength = 10;

  /**
   * Add a context item
   */
  addContext(conversationId: string, item: ContextItem): void {
    const items = this.contexts.get(conversationId) || [];
    items.push(item);

    // Keep only recent items
    if (items.length > this.maxContextItems) {
      items.shift();
    }

    this.contexts.set(conversationId, items);
  }

  /**
   * Get all contexts for a conversation
   */
  getContexts(conversationId: string, type?: ContextType): ContextItem[] {
    const items = this.contexts.get(conversationId) || [];
    if (type) {
      return items.filter((item) => item.type === type);
    }
    return items;
  }

  /**
   * Build conversation context from messages and state
   */
  buildConversationContext(
    conversationId: string,
    messages: UIMessage[],
    currentState: ValidatedState
  ): ConversationContext {
    const recentMessages = messages.slice(-this.maxHistoryLength);

    // Extract user intents from recent messages
    const userIntents = recentMessages
      .filter((m) => m.role === 'user')
      .map((m) => this.extractIntent(m))
      .filter(Boolean) as string[];

    // Track diagram changes
    const diagramChanges = this.getContexts(conversationId, 'diagram_history')
      .slice(-5)
      .map((c) => c.content);

    // Track errors
    const errorHistory = this.getContexts(conversationId, 'error_context')
      .slice(-3)
      .map((c) => c.content);

    // Generate conversation summary
    const conversationSummary = this.generateSummary(recentMessages);

    // Enhanced context analysis
    const hasCode = currentState.code && currentState.code.trim().length > 0;
    const hasRecentActivity = Date.now() - this.getLastActivity(conversationId) < 300000; // 5 minutes
    const hasErrors = errorHistory.length > 0;
    const hasMultipleIntents = userIntents.length > 1;
    const isComplexDiagram = currentState.code && currentState.code.length > 500;

    // Get analysis data
    const analysisHistory = this.getAnalysisHistory(conversationId);
    const performanceMetrics = this.getPerformanceMetrics(conversationId);
    const syntaxValidation = this.getSyntaxValidationHistory(conversationId);

    return {
      conversationSummary,
      currentDiagram: currentState.code,
      diagramType: currentState.diagramType || this.detectDiagramType(currentState.code),
      errorHistory,
      messageCount: messages.length,
      mode: this.inferMode(messages),
      recentChanges: diagramChanges,
      userIntents,
      // Enhanced metadata for better UI decisions
      hasCode: !!hasCode,
      hasRecentActivity: !!hasRecentActivity,
      hasErrors: !!hasErrors,
      hasMultipleIntents: !!hasMultipleIntents,
      isComplexDiagram: !!isComplexDiagram,
      lastActivity: this.getLastActivity(conversationId),
      dominantIntent: this.getDominantIntent(userIntents),
      // Analysis tracking
      analysisHistory,
      performanceMetrics,
      syntaxValidation
    };
  }

  /**
   * Extract user intent from message
   */
  private extractIntent(message: UIMessage): string | null {
    if (!message.parts) return null;

    const text = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as any).text)
      .join(' ')
      .toLowerCase();

    // Intent patterns
    const intents = {
      add: /add|include|insert|append/,
      create: /create|make|generate|build|new/,
      explain: /explain|what|how|why|tell me/,
      fix: /fix|correct|repair|debug/,
      layout: /layout|arrange|position|organize/,
      modify: /change|update|modify|edit|alter/,
      remove: /remove|delete|take out|get rid of/,
      style: /color|style|theme|format|look/
    };

    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(text)) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * Infer mode from conversation history
   */
  private inferMode(messages: UIMessage[]): 'create' | 'edit' {
    if (messages.length === 0) return 'create';

    const recentUserMessages = messages.filter((m) => m.role === 'user').slice(-3);

    const editKeywords = ['change', 'update', 'modify', 'add', 'remove', 'fix'];
    const hasEditIntent = recentUserMessages.some((m) => {
      const text =
        m.parts
          ?.filter((p) => p.type === 'text')
          .map((p) => (p as any).text)
          .join(' ')
          .toLowerCase() || '';
      return editKeywords.some((keyword) => text.includes(keyword));
    });

    return hasEditIntent ? 'edit' : 'create';
  }

  /**
   * Generate a summary of the conversation
   */
  private generateSummary(messages: UIMessage[]): string {
    if (messages.length === 0) return 'New conversation';

    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    const topics = new Set<string>();

    // Extract key topics from messages
    userMessages.forEach((m) => {
      const text =
        m.parts
          ?.filter((p) => p.type === 'text')
          .map((p) => (p as any).text)
          .join(' ')
          .toLowerCase() || '';

      // Extract diagram types mentioned
      const diagramTypes = [
        'flowchart',
        'sequence',
        'class',
        'state',
        'er',
        'gantt',
        'pie',
        'journey',
        'mindmap',
        'timeline',
        'quadrant'
      ];

      diagramTypes.forEach((type) => {
        if (text.includes(type)) {
          topics.add(type);
        }
      });
    });

    if (topics.size > 0) {
      return `Discussion about ${Array.from(topics).join(', ')} diagrams`;
    }

    return `${userMessages.length} user messages, ${assistantMessages.length} responses`;
  }

  /**
   * Track diagram state change
   */
  trackDiagramChange(conversationId: string, oldCode: string, newCode: string): void {
    if (oldCode === newCode) return;

    const change = this.describeDiagramChange(oldCode, newCode);

    this.addContext(conversationId, {
      type: 'diagram_history',
      content: change,
      timestamp: Date.now(),
      metadata: {
        oldLength: oldCode.length,
        newLength: newCode.length
      }
    });
  }

  /**
   * Describe what changed in the diagram
   */
  private describeDiagramChange(oldCode: string, newCode: string): string {
    const oldLines = oldCode.split('\n').length;
    const newLines = newCode.split('\n').length;
    const diff = newLines - oldLines;

    if (diff > 0) {
      return `Added ${diff} line(s)`;
    } else if (diff < 0) {
      return `Removed ${Math.abs(diff)} line(s)`;
    } else {
      return 'Modified content';
    }
  }

  /**
   * Track error occurrence
   */
  trackError(conversationId: string, error: Error): void {
    this.addContext(conversationId, {
      type: 'error_context',
      content: error.message,
      timestamp: Date.now(),
      metadata: {
        name: error.name,
        stack: error.stack
      }
    });
  }

  /**
   * Generate context-aware system prompt
   */
  generateContextualPrompt(context: ConversationContext): string {
    const parts: string[] = [];

    // Base prompt
    if (context.mode === 'edit') {
      parts.push('You are helping the user modify an existing Mermaid diagram.');
      parts.push(`Current diagram type: ${context.diagramType || 'unknown'}`);
      parts.push(`Current diagram:\n\`\`\`mermaid\n${context.currentDiagram}\n\`\`\``);
    } else {
      parts.push('You are helping the user create a new Mermaid diagram.');
    }

    // Add conversation context
    if (context.conversationSummary) {
      parts.push(`\nContext: ${context.conversationSummary}`);
    }

    // Add recent changes
    if (context.recentChanges.length > 0) {
      parts.push(`\nRecent changes: ${context.recentChanges.join(', ')}`);
    }

    // Add user intents
    if (context.userIntents.length > 0) {
      const uniqueIntents = [...new Set(context.userIntents)];
      parts.push(`\nUser has been: ${uniqueIntents.join(', ')}`);
    }

    // Add error context
    if (context.errorHistory.length > 0) {
      parts.push(`\nRecent errors encountered: ${context.errorHistory.join('; ')}`);
      parts.push('Please help fix these issues.');
    }

    return parts.join('\n');
  }

  /**
   * Calculate relevance score for context items
   */
  calculateRelevance(item: ContextItem, currentTime: number): number {
    const age = currentTime - item.timestamp;
    const maxAge = 1000 * 60 * 60; // 1 hour

    // Time-based decay
    const timeScore = Math.max(0, 1 - age / maxAge);

    // Type-based importance
    const typeImportance: Record<ContextType, number> = {
      conversation_history: 0.7,
      diagram_history: 0.8,
      diagram_state: 1.0,
      error_context: 0.95,
      user_intent: 0.9,
      user_preferences: 0.85,
      analysis_result: 0.9,
      performance_metric: 0.8,
      syntax_validation: 0.95
    };

    const typeScore = typeImportance[item.type] || 0.5;

    return timeScore * typeScore;
  }

  /**
   * Get most relevant contexts
   */
  getRelevantContexts(conversationId: string, limit = 10): ContextItem[] {
    const items = this.contexts.get(conversationId) || [];
    const currentTime = Date.now();

    return items
      .map((item) => ({
        ...item,
        relevance: this.calculateRelevance(item, currentTime)
      }))
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, limit);
  }

  /**
   * Clear old contexts
   */
  clearOldContexts(conversationId: string, maxAge: number = 1000 * 60 * 60 * 24): void {
    const items = this.contexts.get(conversationId) || [];
    const currentTime = Date.now();

    const filtered = items.filter((item) => currentTime - item.timestamp < maxAge);

    this.contexts.set(conversationId, filtered);
  }

  /**
   * Export context for persistence
   */
  exportContext(conversationId: string): string {
    const items = this.contexts.get(conversationId) || [];
    return JSON.stringify(items);
  }

  /**
   * Import context from persistence
   */
  importContext(conversationId: string, data: string): void {
    try {
      const items = JSON.parse(data) as ContextItem[];
      this.contexts.set(conversationId, items);
    } catch (error) {
      console.error('Failed to import context:', error);
    }
  }

  /**
   * Get the last activity timestamp for a conversation
   */
  private getLastActivity(conversationId: string): number {
    const items = this.contexts.get(conversationId) || [];
    if (items.length === 0) return 0;

    return Math.max(...items.map((item) => item.timestamp));
  }

  /**
   * Detect diagram type from code content
   */
  private detectDiagramType(code: string): string {
    if (!code || code.trim().length === 0) return 'unknown';

    const lines = code.toLowerCase().split('\n');
    const firstLine = lines[0]?.trim();

    if (firstLine?.startsWith('graph')) {
      return firstLine.includes('td') || firstLine.includes('tb') ? 'flowchart' : 'graph';
    } else if (firstLine?.startsWith('flowchart')) {
      return 'flowchart';
    } else if (firstLine?.startsWith('sequencediagram')) {
      return 'sequence';
    } else if (firstLine?.startsWith('classdiagram')) {
      return 'class';
    } else if (firstLine?.startsWith('statediagram')) {
      return 'state';
    } else if (firstLine?.startsWith('erdiagram')) {
      return 'er';
    } else if (firstLine?.startsWith('gantt')) {
      return 'gantt';
    } else if (firstLine?.startsWith('pie')) {
      return 'pie';
    } else if (firstLine?.startsWith('journey')) {
      return 'journey';
    } else if (firstLine?.startsWith('mindmap')) {
      return 'mindmap';
    }

    return 'unknown';
  }

  /**
   * Get the dominant intent from user intents
   */
  private getDominantIntent(intents: string[]): string {
    if (intents.length === 0) return 'general';

    // Count frequency of each intent
    const intentCounts = intents.reduce(
      (acc, intent) => {
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Find the most frequent intent
    return Object.entries(intentCounts).sort(([, a], [, b]) => b - a)[0][0];
  }

  /**
   * Track analysis result
   */
  trackAnalysisResult(conversationId: string, analysis: AnalysisResult): void {
    this.addContext(conversationId, {
      type: 'analysis_result',
      content: `Analysis: ${analysis.type} - Confidence: ${analysis.confidence}`,
      timestamp: analysis.timestamp,
      metadata: {
        analysisType: analysis.type,
        confidence: analysis.confidence,
        complexity: analysis.complexity,
        insights: analysis.insights,
        metrics: analysis.metrics,
        recommendations: analysis.recommendations,
        executionTime: analysis.executionTime
      },
      relevance: analysis.confidence
    });
  }

  /**
   * Track performance metric
   */
  trackPerformanceMetric(conversationId: string, metric: PerformanceMetric): void {
    this.addContext(conversationId, {
      type: 'performance_metric',
      content: `Performance: ${metric.metricName} - ${metric.value}${metric.unit}`,
      timestamp: metric.timestamp,
      metadata: {
        metricName: metric.metricName,
        value: metric.value,
        unit: metric.unit,
        threshold: metric.threshold,
        status: metric.status
      },
      relevance: metric.status === 'critical' ? 1.0 : metric.status === 'warning' ? 0.8 : 0.5
    });
  }

  /**
   * Track syntax validation
   */
  trackSyntaxValidation(conversationId: string, validation: SyntaxValidation): void {
    this.addContext(conversationId, {
      type: 'syntax_validation',
      content: `Syntax validation: ${validation.valid ? 'Valid' : 'Invalid'} - ${validation.errors.length} errors, ${validation.warnings.length} warnings`,
      timestamp: validation.timestamp,
      metadata: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        lineCount: validation.lineCount
      },
      relevance: validation.valid ? 0.3 : 0.9
    });
  }

  /**
   * Get analysis history for a conversation
   */
  getAnalysisHistory(conversationId: string, type?: string): AnalysisResult[] {
    const items = this.getContexts(conversationId, 'analysis_result');
    return items
      .filter((item) => !type || item.metadata?.analysisType === type)
      .map(
        (item) =>
          ({
            type: item.metadata?.analysisType,
            timestamp: item.timestamp,
            confidence: item.metadata?.confidence || 0,
            complexity: item.metadata?.complexity,
            insights: item.metadata?.insights || [],
            metrics: item.metadata?.metrics,
            recommendations: item.metadata?.recommendations || [],
            executionTime: item.metadata?.executionTime
          }) as AnalysisResult
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance metrics for a conversation
   */
  getPerformanceMetrics(conversationId: string): PerformanceMetric[] {
    const items = this.getContexts(conversationId, 'performance_metric');
    return items.map(
      (item) =>
        ({
          metricName: item.metadata?.metricName,
          value: item.metadata?.value,
          unit: item.metadata?.unit,
          timestamp: item.timestamp,
          threshold: item.metadata?.threshold,
          status: item.metadata?.status
        }) as PerformanceMetric
    );
  }

  /**
   * Get syntax validation history
   */
  getSyntaxValidationHistory(conversationId: string): SyntaxValidation[] {
    const items = this.getContexts(conversationId, 'syntax_validation');
    return items.map(
      (item) =>
        ({
          valid: item.metadata?.valid,
          errors: item.metadata?.errors || [],
          warnings: item.metadata?.warnings || [],
          timestamp: item.timestamp,
          lineCount: item.metadata?.lineCount
        }) as SyntaxValidation
    );
  }

  /**
   * Generate analysis summary
   */
  generateAnalysisSummary(conversationId: string): {
    totalAnalyses: number;
    averageConfidence: number;
    criticalIssues: number;
    recommendations: string[];
  } {
    const analyses = this.getAnalysisHistory(conversationId);
    const metrics = this.getPerformanceMetrics(conversationId);
    const validations = this.getSyntaxValidationHistory(conversationId);

    const totalAnalyses = analyses.length;
    const averageConfidence =
      analyses.length > 0
        ? analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
        : 0;
    const criticalIssues =
      metrics.filter((m) => m.status === 'critical').length +
      validations.filter((v) => !v.valid).length;

    const allRecommendations = analyses.flatMap((a) => a.recommendations || []);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      totalAnalyses,
      averageConfidence,
      criticalIssues,
      recommendations: uniqueRecommendations
    };
  }
}

// Singleton instance
export const contextEngine = new ContextEngine();
