/**
 * Chat handler - processes chat requests and manages streaming
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool
} from 'openai/resources/chat/completions';

export interface ChatRequest {
  message: string;
  conversationId: string;
  currentDiagram?: string;
  mode?: 'plan' | 'create';
  model?: string;
}

export interface StreamEventHandler {
  onText: (content: string) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_diagram',
      description: 'Create a new Mermaid diagram',
      parameters: {
        type: 'object',
        properties: {
          diagram_type: {
            type: 'string',
            enum: [
              'flowchart',
              'sequenceDiagram',
              'classDiagram',
              'stateDiagram',
              'erDiagram',
              'gantt',
              'pie',
              'journey'
            ]
          },
          title: { type: 'string' },
          mermaid_code: { type: 'string' },
          explanation: { type: 'string' }
        },
        required: ['diagram_type', 'mermaid_code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_diagram',
      description: 'Update existing Mermaid diagram',
      parameters: {
        type: 'object',
        properties: {
          diagram_code: { type: 'string', description: 'Updated Mermaid diagram code' },
          diagram_type: { type: 'string', description: 'Type of diagram' },
          title: { type: 'string', description: 'Diagram title' },
          explanation: { type: 'string', description: 'Explanation of changes' }
        },
        required: ['diagram_code', 'diagram_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'thinking',
      description: 'Show thinking process',
      parameters: {
        type: 'object',
        properties: {
          thought: { type: 'string', description: 'Thought content' },
          step: { type: 'string', description: 'Current step' }
        },
        required: ['thought', 'step']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'comprehensive_questionnaire',
      description:
        'Conduct a comprehensive questionnaire with 3-5 MULTIPLE CHOICE questions (2-5 options each) to collect all necessary information for diagram creation. Use this for complex or ambiguous requests that require multiple data points. IMPORTANT: Questions and options MUST be self-explanatory and clear without additional context.',
      parameters: {
        type: 'object',
        properties: {
          context: {
            type: 'string',
            description: 'Context explaining why this questionnaire is needed'
          },
          questions: {
            type: 'array',
            description: 'Array of 3-5 multiple choice questions',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Question identifier' },
                question: { type: 'string', description: 'The question text' },
                required: { type: 'boolean', description: 'Whether this question is required' },
                type: { type: 'string', enum: ['multiple_choice'] },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of 2-5 answer options'
                }
              },
              required: ['id', 'question', 'required', 'type', 'options']
            }
          },
          estimated_completion_time: {
            type: 'string',
            description: 'Estimated time to complete (e.g., "2-3 minutes")'
          }
        },
        required: ['context', 'questions', 'estimated_completion_time']
      }
    }
  }
];

export class ChatHandler {
  constructor(private openai: OpenAI) {}

  static TOOLS = TOOLS;

  async handleRequest(request: ChatRequest, handler: StreamEventHandler): Promise<void> {
    const systemPrompt = this.buildSystemPrompt(request.currentDiagram, request.mode === 'plan');

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request.message }
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: request.model || 'gpt-5-mini',
        messages,
        tools: request.mode === 'plan' ? undefined : TOOLS,
        tool_choice: request.mode === 'plan' ? undefined : 'auto',
        stream: true
      });

      let toolCallArgs = '';
      let toolCallName = '';

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          handler.onText(delta.content);
        }

        if (delta?.tool_calls?.[0]) {
          const tc = delta.tool_calls[0];

          if (tc.function?.name) {
            toolCallName = tc.function.name;
          }

          if (tc.function?.arguments) {
            toolCallArgs += tc.function.arguments;
          }
        }

        if (chunk.choices[0]?.finish_reason === 'tool_calls' && toolCallArgs) {
          try {
            const args = JSON.parse(toolCallArgs);
            handler.onToolCall(toolCallName, args);
          } catch (e) {
            handler.onError('Failed to parse tool call');
          }
          toolCallArgs = '';
          toolCallName = '';
        }
      }

      handler.onDone();
    } catch (error) {
      handler.onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  buildSystemPrompt(diagram: string | undefined, isPlanMode: boolean): string {
    if (isPlanMode) {
      return 'You are a Mermaid diagram planning assistant. Help users plan diagrams step by step.';
    }

    const diagramContext = diagram
      ? `\n\nCurrent diagram:\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`
      : '\n\nNo diagram in editor.\n';

    return `You are a Mermaid diagram assistant.${diagramContext}

Use tools to create or update diagrams:
- create_diagram: Create new diagram
- update_diagram: Modify existing diagram

Always use valid Mermaid syntax. Supported types: flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, journey.`;
  }
}
