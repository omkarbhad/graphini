<script lang="ts">
  import {
    Tool,
    ToolContent,
    ToolHeader,
    ToolInput,
    ToolOutput
  } from '$lib/components/ai-elements/tool';
  import { cn } from '$lib/utils';
  import { CheckCircle, Database, Lightbulb, Package, Search } from '@lucide/svelte';

  interface MCPToolProps {
    toolName: string;
    state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
    input?: any;
    output?: any;
    errorText?: string;
    class?: string;
    [key: string]: any;
  }

  let {
    toolName,
    state,
    input,
    output,
    errorText,
    class: className = '',
    ...restProps
  }: MCPToolProps = $props();

  // MCP tool type configuration
  const mcpToolConfig = {
    'mcp-search_icons': {
      icon: Search,
      label: 'Icon Search',
      description: 'Search for icons by service name',
      color: 'blue'
    },
    'mcp-get_available_icons': {
      icon: Database,
      label: 'Available Icons',
      description: 'Get all available icons',
      color: 'green'
    },
    'mcp-validate_icon_reference': {
      icon: CheckCircle,
      label: 'Validate Icon',
      description: 'Validate icon reference exists',
      color: 'purple'
    },
    'mcp-get_icon_packages': {
      icon: Package,
      label: 'Icon Packages',
      description: 'Get curated icon packages',
      color: 'orange'
    },
    'mcp-suggest_icons_for_context': {
      icon: Lightbulb,
      label: 'Icon Suggestions',
      description: 'Get context-aware icon suggestions',
      color: 'yellow'
    },
    // Analysis tools
    'analyze-diagram': {
      icon: Search,
      label: 'Diagram Analysis',
      description: 'Analyze diagram structure and complexity',
      color: 'blue',
      category: 'analysis'
    },
    'analyze-performance': {
      icon: Search,
      label: 'Performance Analysis',
      description: 'Analyze rendering performance metrics',
      color: 'green',
      category: 'analysis'
    },
    'analyze-syntax': {
      icon: CheckCircle,
      label: 'Syntax Analysis',
      description: 'Validate and analyze diagram syntax',
      color: 'purple',
      category: 'analysis'
    },
    'analyze-compatibility': {
      icon: Package,
      label: 'Compatibility Analysis',
      description: 'Check Mermaid version compatibility',
      color: 'orange',
      category: 'analysis'
    }
  };

  let config = $derived.by(() => {
    return (
      mcpToolConfig[toolName] || {
        icon: Search,
        label: toolName,
        description: 'MCP Tool Operation',
        color: 'gray'
      }
    );
  });

  let IconComponent = $derived(config.icon);

  // Format MCP-specific output
  function formatMCPOutput(toolName: string, output: any) {
    if (!output) return output;

    switch (toolName) {
      case 'mcp-search_icons':
        return formatIconSearchResults(output);
      case 'mcp-get_available_icons':
        return formatAvailableIcons(output);
      case 'mcp-validate_icon_reference':
        return formatValidationResult(output);
      case 'mcp-suggest_icons_for_context':
        return formatIconSuggestions(output);
      // Analysis tools
      case 'analyze-diagram':
        return formatDiagramAnalysis(output);
      case 'analyze-performance':
        return formatPerformanceAnalysis(output);
      case 'analyze-syntax':
        return formatSyntaxAnalysis(output);
      case 'analyze-compatibility':
        return formatCompatibilityAnalysis(output);
      default:
        return output;
    }
  }

  function formatIconSearchResults(results: any) {
    if (!results || !Array.isArray(results)) return results;

    return {
      type: 'icon-search-results',
      count: results.length,
      icons: results.map((icon) => ({
        name: icon.name || icon.serviceName,
        category: icon.category,
        path: icon.path || icon.url,
        confidence: icon.confidence || 1.0
      }))
    };
  }

  function formatAvailableIcons(icons: any) {
    if (!icons || typeof icons !== 'object') return icons;

    return {
      type: 'available-icons',
      count: Object.keys(icons).length,
      categories: Object.values(icons).reduce((cats: any[], icon: any) => {
        const category = icon.category || 'general';
        if (!cats.includes(category)) cats.push(category);
        return cats;
      }, [])
    };
  }

  function formatValidationResult(result: any) {
    if (!result || typeof result !== 'object') return result;

    return {
      type: 'validation-result',
      valid: result.valid || result.exists,
      iconPath: result.iconPath || result.path,
      suggestedAlternative: result.suggestedAlternative
    };
  }

  function formatIconSuggestions(suggestions: any) {
    if (!suggestions || !Array.isArray(suggestions)) return suggestions;

    return {
      type: 'icon-suggestions',
      suggestions: suggestions.map((suggestion) => ({
        name: suggestion.name,
        reason: suggestion.reason || 'Contextual match',
        confidence: suggestion.confidence || 0.8
      }))
    };
  }

  // Analysis formatting functions
  function formatDiagramAnalysis(analysis: any) {
    if (!analysis || typeof analysis !== 'object') return analysis;

    return {
      type: 'diagram-analysis',
      ...analysis,
      analysisData: {
        executionTime: analysis.executionTime,
        confidence: analysis.confidence || 0.8,
        complexity: analysis.complexity || 'medium',
        insights: analysis.insights || [],
        metrics: analysis.metrics,
        recommendations: analysis.recommendations || []
      }
    };
  }

  function formatPerformanceAnalysis(analysis: any) {
    if (!analysis || typeof analysis !== 'object') return analysis;

    return {
      type: 'performance-analysis',
      ...analysis,
      analysisData: {
        executionTime: analysis.executionTime,
        confidence: analysis.confidence || 0.9,
        complexity: 'low',
        insights: analysis.insights || ['Performance metrics collected'],
        metrics: analysis.metrics || { renderTime: 0, nodeCount: 0 },
        recommendations: analysis.recommendations || []
      }
    };
  }

  function formatSyntaxAnalysis(analysis: any) {
    if (!analysis || typeof analysis !== 'object') return analysis;

    return {
      type: 'syntax-analysis',
      ...analysis,
      analysisData: {
        executionTime: analysis.executionTime,
        confidence: analysis.valid ? 1.0 : 0.0,
        complexity: analysis.complexity || 'medium',
        insights: analysis.insights || [],
        metrics: analysis.metrics || { errorCount: 0, warningCount: 0 },
        recommendations: analysis.recommendations || []
      }
    };
  }

  function formatCompatibilityAnalysis(analysis: any) {
    if (!analysis || typeof analysis !== 'object') return analysis;

    return {
      type: 'compatibility-analysis',
      ...analysis,
      analysisData: {
        executionTime: analysis.executionTime,
        confidence: analysis.confidence || 0.8,
        complexity: 'low',
        insights: analysis.insights || [],
        metrics: analysis.metrics || { versionScore: 0 },
        recommendations: analysis.recommendations || []
      }
    };
  }

  let formattedOutput = $derived.by(() => formatMCPOutput(toolName, output));

  // Custom styling based on tool type and state
  let toolStyles = $derived.by(() => {
    const baseStyles = 'border-l-4';
    const colorStyles = {
      blue: 'border-blue-500',
      green: 'border-green-500',
      purple: 'border-purple-500',
      orange: 'border-orange-500',
      yellow: 'border-yellow-500',
      gray: 'border-gray-500'
    };

    return cn(baseStyles, colorStyles[config.color]);
  });
</script>

<Tool class={cn(toolStyles, className)} {...restProps}>
  <ToolHeader type={config.label} {state} />
  <ToolContent>
    <ToolInput {input} />
    <ToolOutput
      output={formattedOutput}
      {errorText}
      toolType={toolName}
      analysisData={formattedOutput?.analysisData} />
  </ToolContent>
</Tool>

<style>
  /* MCP-specific styling */
  :global(.mcp-tool-header) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  }

  :global(.mcp-icon-result) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.05);
    border: 1px solid rgba(99, 102, 241, 0.2);
  }

  :global(.mcp-icon-preview) {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
</style>
