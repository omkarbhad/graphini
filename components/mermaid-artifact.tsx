"use client";

import { Loader } from '@/components/ai-elements/loader';
import { Mermaid } from '@/components/ai-elements/mermaid';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

type MermaidArtifactStatus = 'detected' | 'streaming' | 'ready' | 'error';

interface MermaidArtifactProps {
  mermaidCode: string;
  status?: MermaidArtifactStatus;
  title?: string;
  onAddToCanvas?: (mermaidCode: string) => void;
  showAddButton?: boolean;
  isAutoAdded?: boolean;
}

export function MermaidArtifact({
  mermaidCode,
  status = 'ready',
  title,
  onAddToCanvas,
  showAddButton = true,
  isAutoAdded = false,
}: MermaidArtifactProps) {
  const trimmedCode = mermaidCode.trim();
  const isReady = status === 'ready' && trimmedCode.length > 0;
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCanvas = async () => {
    if (!onAddToCanvas) return;
    
    setIsAdding(true);
    try {
      await onAddToCanvas(trimmedCode);
    } finally {
      setIsAdding(false);
    }
  };

  if (status === 'error') {
    return (
      <div className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 text-center shadow-sm">
        <div className="flex flex-col items-center gap-1">
          <div className="text-rose-500 text-lg">⚠️</div>
          <div className="text-xs font-medium text-rose-600">Unable to render diagram</div>
        </div>
      </div>
    );
  }

  if (isReady) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            'flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'
          )}
          aria-label={title ?? 'Mermaid diagram'}
        >
          <Mermaid chart={trimmedCode} className="h-full w-full" minHeight={160} />
        </div>
        {isAutoAdded ? (
          <div className="flex items-center justify-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 border border-green-200">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Auto-added to Canvas
          </div>
        ) : showAddButton && onAddToCanvas ? (
          <Button
            onClick={handleAddToCanvas}
            disabled={isAdding}
            size="sm"
            className="h-7 text-xs"
            variant="outline"
          >
            <Plus className="h-3 w-3 mr-1" />
            {isAdding ? 'Adding...' : 'Add to Canvas'}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-40 w-40 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white text-center shadow-sm">
      <div className="flex flex-col items-center gap-2">
        <Loader className="text-blue-500" size={20} />
        <TextShimmer className="text-xs font-medium text-gray-600" duration={2} spread={1.5}>
          Generating...
        </TextShimmer>
      </div>
    </div>
  );
}
