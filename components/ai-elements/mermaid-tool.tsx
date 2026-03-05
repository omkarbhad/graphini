"use client";

import { Tool, ToolHeader, ToolContent } from '@/components/ai-elements/tool';
import { Mermaid } from '@/components/ai-elements/mermaid';

interface MermaidToolProps {
  toolCall: {
    type: string;
    toolCallId: string;
    state: string;
    input: { description: string };
    output: { code: string };
    errorText?: string;
  };
}

export function MermaidTool({ toolCall }: MermaidToolProps) {
  return (
    <div style={{ height: '500px' }}>
      <Tool>
        <ToolHeader type={`tool-${toolCall.type}` as any} state={toolCall.state as any} />
        <ToolContent>
          <Mermaid chart={toolCall.output.code} />
        </ToolContent>
      </Tool>
    </div>
  );
}
