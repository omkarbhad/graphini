"use client";

import { useCallback, useRef } from 'react';
import type { PlaitBoard } from '@plait/core';
import { WritableClipboardOperationType } from '@plait/core';

export function useMermaidToCanvas() {
  const mermaidLibRef = useRef<any>(null);

  // Load the mermaid-to-drawnix library
  const loadMermaidLib = useCallback(async () => {
    if (mermaidLibRef.current) return mermaidLibRef.current;
    
    try {
      const mermaidModule = await import('@plait-board/mermaid-to-drawnix');
      mermaidLibRef.current = mermaidModule;
      return mermaidModule;
    } catch (err) {
      console.error('Failed to load mermaid-to-drawnix:', err);
      return null;
    }
  }, []);

  // Convert Mermaid code to canvas elements
  const renderMermaidToCanvas = useCallback(async (
    mermaidCode: string,
    board: any,
    position?: { x: number; y: number }
  ) => {
    console.log('renderMermaidToCanvas called with:', { mermaidCode, board, position });
    
    if (!mermaidCode.trim()) {
      console.log('Mermaid code is empty');
      return;
    }

    console.log('Loading mermaid library...');
    const mermaidLib = await loadMermaidLib();
    if (!mermaidLib) {
      console.error('Mermaid library not loaded');
      return;
    }

    console.log('Mermaid library loaded successfully');

    try {
      // Clean the Mermaid code - remove HTML tags and fix common issues
      const cleanMermaidCode = mermaidCode
        .replace(/<br\s*\/?>/gi, '\n')  // Replace <br/> with newlines
        .replace(/<[^>]*>/g, '')        // Remove any remaining HTML tags
        .replace(/&amp;/g, '&')         // Fix HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");

      console.log('Converting Mermaid to elements...');
      let result;
      try {
        result = await mermaidLib.parseMermaidToDrawnix(cleanMermaidCode);
      } catch (err: any) {
        console.log('First attempt failed, trying with quotes replaced...');
        // Try with quotes replaced if first attempt fails
        result = await mermaidLib.parseMermaidToDrawnix(cleanMermaidCode.replace(/"/g, "'"));
      }
      
      console.log('Conversion result:', result);
      const { elements } = result;
      
      if (!elements || elements.length === 0) {
        console.warn('No elements generated from Mermaid code');
        return;
      }

      console.log('Generated elements:', elements);

      // Calculate position (center of canvas if not provided)
      const centerX = position?.x ?? 400; // Default center position
      const centerY = position?.y ?? 300;

      console.log('Inserting elements at position:', [centerX, centerY]);
      console.log('Board insertFragment method:', typeof board.insertFragment);

      // Create a text element to display the diagram code
      const codeTextElement = {
        id: `diagram-code-${Date.now()}`,
        type: 'text',
        points: [
          [centerX - 20, centerY - 40],
          [centerX + 300, centerY - 10]
        ],
        text: {
          children: [
            {
              text: `Diagram Code:\n${cleanMermaidCode}`,
              color: '#666666',
              fontSize: 12,
              fontFamily: 'monospace'
            }
          ]
        },
        strokeColor: '#e0e0e0',
        strokeWidth: 1,
        fill: '#f8f8f8'
      };

      // Add the code text element to the elements array
      const elementsWithCode = [...elements, codeTextElement];

      // Add elements to the board using insertFragment
      board.insertFragment(
        {
          elements: JSON.parse(JSON.stringify(elementsWithCode)),
        },
        [centerX, centerY],
        WritableClipboardOperationType.paste
      );
      
      console.log('✅ Mermaid diagram rendered to canvas successfully');
    } catch (error) {
      console.error('❌ Error rendering Mermaid to canvas:', error);
    }
  }, [loadMermaidLib]);

  return {
    renderMermaidToCanvas,
    loadMermaidLib
  };
}
