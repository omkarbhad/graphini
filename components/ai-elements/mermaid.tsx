"use client";

import { useEffect, useState } from 'react';
import { TextShimmer } from '@/components/ui/text-shimmer';

interface MermaidProps {
  chart: string;
  className?: string;
  minHeight?: number;
  onRetry?: (error: string, code: string) => void;
}

export function Mermaid({ chart, className, minHeight = 200, onRetry }: MermaidProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (!chart) {
      setIsLoading(false);
      setSvgContent('');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setSvgContent('');

    // Import and render mermaid
    const renderMermaid = async () => {
      try {
        const mermaid = await import('mermaid');

        // Initialize mermaid with better configuration
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Arial, sans-serif',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: {
            useMaxWidth: true,
            wrap: true
          },
          gantt: {
            useMaxWidth: true
          }
        });

        // Validate the chart syntax first
        if (!chart.trim()) {
          throw new Error('Empty Mermaid chart');
        }

        // Render the diagram
        const { svg } = await mermaid.default.render(id, chart);

        // Update state with the rendered SVG only if still mounted
        if (isMounted) {
          setSvgContent(svg);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error rendering mermaid diagram:', error);
        if (!isMounted) return;

        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    renderMermaid();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200`} style={{ minHeight }}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <TextShimmer className="text-gray-600 text-sm font-medium" duration={2.5} spread={1.2}>
            Rendering diagram...
          </TextShimmer>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} p-4 bg-red-50 border border-red-200 rounded-lg`} style={{ minHeight }}>
        <div className="text-red-600 text-sm font-medium mb-2">Mermaid Rendering Error</div>
        <div className="text-red-500 text-xs mb-3">{error}</div>
        <pre className="text-xs text-gray-700 bg-gray-100 p-3 rounded border overflow-auto mb-3">{chart}</pre>
        {onRetry && (
          <button
            onClick={() => onRetry(error, chart)}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            🔄 Retry with AI Fix
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ minHeight }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
