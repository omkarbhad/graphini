'use client';

import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from '@/components/ai-elements/branch';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import {
  Suggestion,
  Suggestions,
} from '@/components/ai-elements/suggestion';
import { ArrowUp, Circle, CheckCircle2 } from 'lucide-react';
import { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ai-elements/loader';
import { Mermaid } from '@/components/ai-elements/mermaid';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning';
import { ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtContent, ChainOfThoughtStep } from '@/components/ai-elements/chain-of-thought';
import { TextShimmer } from '@/components/ui/text-shimmer';

type MessageType = {
  key: string;
  from: 'user' | 'assistant';
  versions: {
    id: string;
    content: string;
    createdAt: Date;
  }[];
  avatar: string;
  name: string;
  mermaidDiagrams?: {
    code: string;
    status: 'converting' | 'added' | 'error';
    error?: string;
  }[];
};

const initialMessages: MessageType[] = [];

type ThinkingParseResult = {
  cleanContent: string;
  reasoningText: string;
  hasReasoning: boolean;
  isStreaming: boolean;
};

const THINKING_TAG_START = '<think>';
const THINKING_TAG_END = '</think>';

const extractThinking = (raw: string): ThinkingParseResult => {
  const lowerRaw = raw.toLowerCase();
  const startIndex = lowerRaw.indexOf(THINKING_TAG_START);

  if (startIndex === -1) {
    return {
      cleanContent: raw,
      reasoningText: '',
      hasReasoning: false,
      isStreaming: false,
    };
  }

  const afterStart = raw.slice(startIndex + THINKING_TAG_START.length);
  const lowerAfterStart = lowerRaw.slice(startIndex + THINKING_TAG_START.length);
  const endIndex = lowerAfterStart.indexOf(THINKING_TAG_END);
  const hasClosingTag = endIndex !== -1;

  const reasoningSegment = hasClosingTag
    ? afterStart.slice(0, endIndex)
    : afterStart;

  const before = raw.slice(0, startIndex);
  const after = hasClosingTag
    ? afterStart.slice(endIndex + THINKING_TAG_END.length)
    : '';

  const cleanContent = `${before}${after}`.replace(/^\s+/, '');

  return {
    cleanContent,
    reasoningText: reasoningSegment.replace(/^\s+/, '').trimEnd(),
    hasReasoning: true,
    isStreaming: !hasClosingTag,
  };
};

const models = [
  // Latest Free Models (Support Tools) - Verified Working
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder 480B (Free)' },
  { id: 'qwen/qwen3-4b:free', name: 'Qwen3 4B (Free)' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM-4.5 Air (Free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 24B (Free)' },
  { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B (Free)' },
  { id: 'stepfun/step-3.5-flash:free', name: 'Step 3.5 Flash (Free)' },
  { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'Nemotron Nano 9B V2 (Free)' },
  { id: 'openrouter/aurora-alpha', name: 'Aurora Alpha (Free)' },
  { id: 'upstage/solar-pro-3:free', name: 'Solar Pro 3 (Free)' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', name: 'Qwen3 Next 80B (Free)' },
  { id: 'arcee-ai/trinity-large-preview:free', name: 'Trinity Large Preview (Free)' },
  
  // Additional Free Models (May have availability issues)
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron 3 Nano 30B (Free)' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'Nemotron Nano 12B VL (Free)' },
  { id: 'arcee-ai/trinity-mini:free', name: 'Trinity Mini 26B (Free)' },
  
  // Premium Models (Low Cost)
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
  { id: 'nousresearch/deephermes-3-mistral-24b-preview', name: 'DeepHermes 3 Mistral 24B' },
  { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B Instruct' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', name: 'Mistral Small 3.1 24B' },
  { id: 'amazon/nova-micro-v1', name: 'Amazon Nova Micro' },
  { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen2.5 7B Instruct' },
  { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B' },
  { id: 'nvidia/nemotron-nano-9b-v2', name: 'Nemotron Nano 9B V2' },
  { id: 'arcee-ai/trinity-mini', name: 'Trinity Mini 26B' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b', name: 'Nemotron 3 Nano 30B' },
  { id: 'qwen/qwen-turbo', name: 'Qwen Turbo' },
  { id: 'qwen/qwen3-14b', name: 'Qwen3 14B' },
  
  // High-End Models
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano' },
  { id: 'openai/o4-mini-deep-research', name: 'OpenAI o4 Mini Deep Research' },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
  { id: 'openai/gpt-5-image-mini', name: 'GPT-5 Image Mini' },
  { id: 'openai/gpt-4o-audio-preview', name: 'GPT-4o Audio' },
  { id: 'openai/gpt-4o-2024-11-20', name: 'GPT-4o (2024-11-20)' },
  { id: 'openai/gpt-4o-2024-08-06', name: 'GPT-4o (2024-08-06)' },
  { id: 'cohere/command-r-plus-08-2024', name: 'Command R+ (08-2024)' },
  { id: 'amazon/nova-premier-v1', name: 'Amazon Nova Premier' },
  { id: 'openai/gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k' },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
  { id: 'x-ai/grok-3', name: 'Grok 3' },
  { id: 'x-ai/grok-4', name: 'Grok 4' },
  { id: 'x-ai/grok-3-beta', name: 'Grok 3 Beta' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' },
  { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'openai/gpt-4o-2024-05-13', name: 'GPT-4o (2024-05-13)' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct' },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
  { id: 'openai/gpt-4o:extended', name: 'GPT-4o (Extended)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-5-image', name: 'GPT-5 Image' },
  { id: 'openai/gpt-4-1106-preview', name: 'GPT-4 Turbo (1106)' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview' },
  { id: 'openai/o3-deep-research', name: 'OpenAI o3 Deep Research' },
  { id: 'openai/o1', name: 'OpenAI o1' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
  { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1' },
  { id: 'openai/gpt-5-pro', name: 'GPT-5 Pro' },
  { id: 'openai/o3-pro', name: 'OpenAI o3 Pro' },
  { id: 'openai/gpt-5.2-pro', name: 'GPT-5.2 Pro' },
  { id: 'openai/gpt-4', name: 'GPT-4' },
  { id: 'openai/gpt-4-0314', name: 'GPT-4 (0314)' },
];

const suggestions = [
  // Reasoning & Analysis
  'Analyze the pros and cons of microservices vs monolith architecture',
  'Explain the reasoning behind React\'s virtual DOM design',
  'Compare different database types and their use cases',
  'Break down the steps to optimize a slow API endpoint',
  
  // Diagram Creation (one diagram per prompt)
  'Create a flowchart for user authentication',
  'Explain React hooks with a diagram',
  'Show me a sequence diagram for API calls',
  'Create a class diagram for e-commerce system',
  'Visualize a state machine',
  'Generate a Gantt chart for project timeline',
];

interface ChatBoxProps {
  onAddMermaidToCanvas?: (mermaidCode: string) => void;
  className?: string;
  hidden?: boolean;
}

function ChatBoxInner({ onAddMermaidToCanvas, className, hidden }: ChatBoxProps) {
  const [model, setModel] = useState<string>(models[0].id);
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready');
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processedMermaidCodes = useRef<Set<string>>(new Set());
  const [autoAddedDiagram, setAutoAddedDiagram] = useState<string | null>(null);
  const [failedDiagrams, setFailedDiagrams] = useState<Set<string>>(new Set());
  const [parsingErrors, setParsingErrors] = useState<Map<string, string>>(new Map());
  const thinkingCleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMermaidRef = useRef<{ code: string; messageKey: string } | null>(null);

  const handleDiagramAutoInsert = useCallback(
    async (mermaidCode: string, messageKey: string) => {
      
      const trimmedCode = mermaidCode.trim();
      if (!trimmedCode) {
        return;
      }

      const codeHash = `${messageKey}-${trimmedCode}`;
      if (processedMermaidCodes.current.has(codeHash)) {
        return;
      }

      try {
        if (onAddMermaidToCanvas) {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Diagram insertion timeout')), 10000);
          });
          
          await Promise.race([
            onAddMermaidToCanvas(trimmedCode),
            timeoutPromise
          ]);
          
          processedMermaidCodes.current.add(codeHash);
          setAutoAddedDiagram(codeHash);
        } else {
          throw new Error('Canvas integration not available');
        }
      } catch (error) {
        toast.error('Unable to add diagram to canvas automatically.');
        
        // Mark as failed and processed to prevent retry loops
        processedMermaidCodes.current.add(codeHash);
        setFailedDiagrams(prev => new Set(prev).add(codeHash));
      }
    },
    [onAddMermaidToCanvas]
  );


  // Auto-detect and insert only the first mermaid diagram
  useEffect(() => {
    if (status !== 'ready') return;

    // Find the first unprocessed Mermaid diagram
    for (const message of messages) {
      if (message.from !== 'assistant') continue;

      for (const version of message.versions) {
        const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
        let match;

        while ((match = mermaidRegex.exec(version.content)) !== null) {
          const mermaidCode = match[1].trim();
          const codeHash = `${message.key}-${mermaidCode}`;

          if (!processedMermaidCodes.current.has(codeHash)) {
            processedMermaidCodes.current.add(codeHash);
            // Auto-insert only the first diagram to canvas
            onAddMermaidToCanvas?.(mermaidCode);
            setAutoAddedDiagram(codeHash);
            return; // Exit after adding the first diagram
          }
        }
      }
    }
  }, [messages, status, onAddMermaidToCanvas]);

  const stop = useCallback(() => {

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStatus('ready');
    setStreamingMessageId(null);
    setIsThinking(false);

    // Clear any existing cleanup timer
    if (thinkingCleanupTimerRef.current) {
      clearTimeout(thinkingCleanupTimerRef.current);
    }

    // Don't clear thinkingContent immediately - let the Reasoning component's auto-close animation complete
    thinkingCleanupTimerRef.current = setTimeout(() => {
      setThinkingContent('');
      thinkingCleanupTimerRef.current = null;
    }, 1500);
  }, []);

  const streamResponse = useCallback(
    async (messageId: string, userMessage: string) => {
      // Clear any existing cleanup timer when starting new stream
      if (thinkingCleanupTimerRef.current) {
        clearTimeout(thinkingCleanupTimerRef.current);
        thinkingCleanupTimerRef.current = null;
      }

      setStatus('streaming');
      setStreamingMessageId(messageId);
      setErrorMessage(null);
      setIsThinking(false);
      setThinkingContent('');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messages
                .filter(m => m.from !== 'assistant' || !m.versions.some(v => v.id === messageId))
                .flatMap(m => m.versions.map(v => ({
                  role: m.from === 'user' ? 'user' : 'assistant',
                  content: v.content,
                }))),
              { role: 'user', content: userMessage },
            ],
            model,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `API error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let currentContent = '';
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          sseBuffer += decoder.decode(value, { stream: true });

          let eventEnd: number;
          while ((eventEnd = sseBuffer.indexOf('\n\n')) !== -1) {
            const rawEvent = sseBuffer.slice(0, eventEnd);
            sseBuffer = sseBuffer.slice(eventEnd + 2);

            const dataLines = rawEvent
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim());

            if (dataLines.length === 0) {
              continue;
            }

            const payload = dataLines.join('');
            if (!payload) {
              continue;
            }

            let parsed: any;
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }

            if (parsed.type === 'data-mermaidDelta') {
              const mermaidCode =
                typeof parsed.data === 'string' ? parsed.data.trim() : '';
              if (mermaidCode) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('📊 Received mermaid delta:', {
                    code: mermaidCode.substring(0, 100) + '...',
                    messageId
                  });
                }
                pendingMermaidRef.current = { code: mermaidCode, messageKey: messageId };
              }
              continue;
            }

            if (parsed.type === 'content') {
              const delta = typeof parsed.data === 'string' ? parsed.data : '';
              if (!delta) {
                continue;
              }

              currentContent += delta;

              const thinking = extractThinking(currentContent);

              if (thinking.hasReasoning) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('🧠 Thinking content detected:', {
                    hasReasoning: thinking.hasReasoning,
                    isStreaming: thinking.isStreaming,
                    contentLength: thinking.reasoningText.length,
                    cleanContentLength: thinking.cleanContent.length,
                    cleanContent: thinking.cleanContent.substring(0, 100) + '...',
                    currentContent: currentContent.substring(0, 100) + '...'
                  });
                }
                setThinkingContent(thinking.reasoningText);
                setIsThinking(thinking.isStreaming);
              }

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.versions.some((v) => v.id === messageId)) {
                    return {
                      ...msg,
                      versions: msg.versions.map((v) =>
                        v.id === messageId
                          ? {
                              ...v,
                              content: thinking.hasReasoning
                                ? thinking.cleanContent
                                : currentContent,
                            }
                          : v,
                      ),
                    };
                  }
                  return msg;
                })
              );
            } else if (parsed.type === 'finish') {
              setIsThinking(false);
              const pendingDiagram = pendingMermaidRef.current;
              if (pendingDiagram) {
                
                // Set a timeout to mark as failed if insertion takes too long
                const timeoutId = setTimeout(() => {
                  const codeHash = `${pendingDiagram.messageKey}-${pendingDiagram.code.trim()}`;
                  if (!autoAddedDiagram || autoAddedDiagram !== codeHash) {
                    setFailedDiagrams(prev => new Set(prev).add(codeHash));
                    processedMermaidCodes.current.add(codeHash);
                  }
                }, 15000); // 15 second timeout
                
                try {
                  await handleDiagramAutoInsert(
                    pendingDiagram.code,
                    pendingDiagram.messageKey
                  );
                  clearTimeout(timeoutId); // Clear timeout if successful
                } catch (error) {
                  clearTimeout(timeoutId);
                  throw error;
                }
                
                pendingMermaidRef.current = null;
              } else {
              }
            }
          }
        }

        setStatus('ready');
        setStreamingMessageId(null);
        setIsThinking(false);

        // Clear any existing cleanup timer
        if (thinkingCleanupTimerRef.current) {
          clearTimeout(thinkingCleanupTimerRef.current);
        }

        // Don't clear thinkingContent immediately - let the Reasoning component's auto-close animation complete
        // Only clear if the user hasn't manually opened the reasoning section
        thinkingCleanupTimerRef.current = setTimeout(() => {
          setThinkingContent('');
          thinkingCleanupTimerRef.current = null;
        }, 5000); // Increased delay to 5 seconds
      } catch (error: any) {
        if (error.name === 'AbortError') {
        } else {
          
          // Extract detailed error information
          let errorMessage = 'Unknown error occurred';
          let errorDetails = '';
          
          if (error instanceof Error) {
            errorMessage = error.message;
            errorDetails = error.stack || '';
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && error.message) {
            errorMessage = error.message;
          }
          
          // Check for specific error types
          const needsApiKey = errorMessage.includes('OpenRouter API key not configured');
          const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
          const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('AbortError');
          const isServerError = errorMessage.includes('500') || errorMessage.includes('Internal server error');
          
          let displayMessage = errorMessage;
          let toastTitle = 'Chat request failed';
          
          if (needsApiKey) {
            displayMessage = 'Chat requires a valid OpenRouter API key. Add OPENROUTER_API_KEY to your .env.local and restart the dev server.';
            toastTitle = 'API Key Required';
          } else if (isNetworkError) {
            displayMessage = `Network Error: ${errorMessage}`;
            toastTitle = 'Network Error';
          } else if (isTimeoutError) {
            displayMessage = `Request Timeout: ${errorMessage}`;
            toastTitle = 'Request Timeout';
          } else if (isServerError) {
            displayMessage = `Server Error: ${errorMessage}`;
            toastTitle = 'Server Error';
          } else {
            displayMessage = `Error: ${errorMessage}`;
            toastTitle = 'Request Failed';
          }

          setErrorMessage(displayMessage);
          toast.error(toastTitle, {
            description: displayMessage,
            duration: 10000, // Show for 10 seconds to allow reading
          });
          setStatus('error');
          
        }
      } finally {
        setStreamingMessageId(null);
        setIsThinking(false);
      }
    },
    [messages, model, autoAddedDiagram, handleDiagramAutoInsert]
  );

  const handleMermaidRetry = useCallback(
    async (error: string, code: string) => {
      // Create a new message asking AI to fix the Mermaid diagram
      const retryPrompt = `The following Mermaid diagram failed to render with error: "${error}". Please fix the syntax and generate a corrected version:

\`\`\`mermaid
${code}
\`\`\`

Please provide the corrected Mermaid diagram code.`;

      // Add the retry message to the conversation
      const retryMessage: MessageType = {
        key: `retry-${Date.now()}`,
        from: 'user',
        versions: [
          {
            id: `retry-${Date.now()}`,
            content: retryPrompt,
            createdAt: new Date(),
          },
        ],
        avatar: 'https://github.com/shadcn.png',
        name: 'User',
      };

      // Add to messages and trigger streaming
      setMessages(prev => [...prev, retryMessage]);
      
      // Start streaming the AI response
      const messageId = `assistant-${Date.now()}`;
      await streamResponse(messageId, retryPrompt);
    },
    [streamResponse]
  );

  const handleSubmit = (message: PromptInputMessage) => {
    // If currently streaming, stop instead of submitting
    if (status === 'streaming' || status === 'submitted') {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    setStatus('submitted');
    setErrorMessage(null);

    if (message.files?.length) {
      toast.success('Files attached', {
        description: `${message.files.length} file(s) attached to message`,
      });
    }

    const userContent = message.text || 'Sent with attachments';

    // Add user message
    const userMessage: MessageType = {
      key: `user-${Date.now()}`,
      from: 'user',
      versions: [
        {
          id: `user-${Date.now()}`,
          content: userContent,
          createdAt: new Date(),
        },
      ],
      avatar: 'https://github.com/shadcn.png',
      name: 'User',
    };

    // Add empty assistant message
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: MessageType = {
      key: `assistant-${Date.now()}`,
      from: 'assistant',
      versions: [
        {
          id: assistantMessageId,
          content: '',
          createdAt: new Date(),
        },
      ],
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant',
      name: 'Assistant',
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setText('');

    // Start streaming response
    streamResponse(assistantMessageId, userContent);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
    textareaRef.current?.focus();
  };

  // Memoized message content renderer to prevent unnecessary re-renders
  const renderMessageContent = useCallback((content: string, isStreaming: boolean, messageKey?: string) => {
    const parts: JSX.Element[] = [];
    // Match both complete and incomplete mermaid blocks
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)(?:\n```|$)/g;
    let lastIndex = 0;
    let match;
    let diagramCount = 0;

    while ((match = mermaidRegex.exec(content)) !== null) {
      // Add text before mermaid block
      if (match.index > lastIndex) {
        parts.push(
          <Response key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </Response>
        );
      }

      const mermaidCode = match[1].trim();
      const codeHash = messageKey ? `${messageKey}-${mermaidCode}` : '';
      const isComplete = match[0].includes('\n```');
      const isAutoAdded = messageKey ? autoAddedDiagram === codeHash : false;
      const isFailed = messageKey ? failedDiagrams.has(codeHash) : false;
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Mermaid block detected:', {
          isComplete,
          codeLength: mermaidCode.length,
          matchLength: match[0].length,
          endsWithNewline: match[0].endsWith('\n```'),
          containsNewline: match[0].includes('\n```'),
          codeHash: codeHash.substring(0, 50) + '...'
        });
      }
      
      diagramCount += 1;

      // Show a simple message instead of rendering the diagram
      if (isComplete && isAutoAdded) {
        parts.push(
          <div key={`diagram-added-${match.index}`} className="my-4 -mx-4 px-4">
            <details className="w-full">
              <summary className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 text-sm font-medium text-green-900 border border-green-200 shadow-sm cursor-pointer hover:bg-green-100 transition-colors w-full list-none">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="flex-1">Diagram added to canvas</span>
                <span className="text-xs text-green-600">View code ▼</span>
              </summary>
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                  <code>{mermaidCode}</code>
                </pre>
              </div>
            </details>
          </div>
        );
      } else if (isComplete && isFailed) {
        parts.push(
          <div key={`diagram-failed-${match.index}`} className="my-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              <Circle className="h-3 w-3" />
              Failed to add diagram to canvas
              <button
                onClick={() => {
                  // Remove from failed set and retry
                  setFailedDiagrams(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(codeHash);
                    return newSet;
                  });
                  processedMermaidCodes.current.delete(codeHash);
                  if (onAddMermaidToCanvas) {
                    onAddMermaidToCanvas(mermaidCode);
                  }
                }}
                className="ml-2 text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
              <button
                onClick={() => handleMermaidRetry('Canvas insertion failed', mermaidCode)}
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                🤖 AI Fix
              </button>
            </div>
          </div>
        );
      } else if (isComplete) {
        // Diagram completed - check for errors, but don't render in chat
        const parsingError = messageKey ? parsingErrors.get(codeHash) : null;
        
        if (parsingError) {
          // Show parsing error with code
          parts.push(
            <div key={`diagram-error-${match.index}`} className="my-4 -mx-4 px-4">
              <div className="w-full rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <div className="text-red-600 text-sm font-medium">Diagram generation failed</div>
                </div>
                <div className="text-red-500 text-xs mb-3">{parsingError}</div>
                <details className="mb-3">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">View code</summary>
                  <pre className="text-xs text-gray-700 bg-gray-100 p-3 rounded border overflow-auto mt-2">{mermaidCode}</pre>
                </details>
                <button
                  onClick={() => handleMermaidRetry(parsingError, mermaidCode)}
                  className="px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  🔄 Retry with AI Fix
                </button>
              </div>
            </div>
          );
        } else {
          // Diagram completed successfully but not auto-added (shouldn't normally happen)
          // Show same success state as auto-added
          parts.push(
            <div key={`diagram-complete-${match.index}`} className="my-4 -mx-4 px-4">
              <details className="w-full">
                <summary className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 text-sm font-medium text-green-900 border border-green-200 shadow-sm cursor-pointer hover:bg-green-100 transition-colors w-full list-none">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="flex-1">Diagram added to canvas</span>
                  <span className="text-xs text-green-600">View code ▼</span>
                </summary>
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                    <code>{mermaidCode}</code>
                  </pre>
                </div>
              </details>
            </div>
          );
        }
      } else if (mermaidCode.length > 0) {
        parts.push(
          <div key={`diagram-generating-${match.index}`} className="my-4 -mx-4 px-4">
            <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-sm font-medium text-blue-900 border border-blue-200 shadow-sm w-full">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent flex-shrink-0"></div>
              <TextShimmer className="text-blue-900" duration={2} spread={1.5}>
                Generating diagram...
              </TextShimmer>
            </div>
          </div>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <Response key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </Response>
      );
    }

    return parts.length > 0 ? parts : <Response>{content}</Response>;
  }, [autoAddedDiagram, failedDiagrams, parsingErrors, onAddMermaidToCanvas, handleMermaidRetry]);

  // Memoized message component to prevent unnecessary re-renders
  const MemoizedMessage = memo(({ 
    message, 
    version, 
    isStreaming, 
    streamingMessageId, 
    renderMessageContent 
  }: {
    message: MessageType;
    version: any;
    isStreaming: boolean;
    streamingMessageId: string | null;
    renderMessageContent: (content: string, isStreaming: boolean, messageKey?: string) => JSX.Element | JSX.Element[];
  }) => (
    <Message from={message.from} key={`${message.key}-${version.id}`}>
      <div>
        <MessageContent>
          {!isStreaming &&
          streamingMessageId === version.id &&
          version.content.trim().length === 0 ? (
            <TextShimmer className="text-sm text-gray-500" duration={2} spread={1.5}>
              Generating response...
            </TextShimmer>
          ) : (
            renderMessageContent(
              version.content,
              isStreaming && streamingMessageId === version.id,
              message.key
            )
          )}
        </MessageContent>
      </div>
    </Message>
  ));

  MemoizedMessage.displayName = 'MemoizedMessage';

  // Memoized messages list to prevent re-rendering all messages
  const memoizedMessages = useMemo(() => {
    return messages.map((message) => (
      <Branch defaultBranch={0} key={message.key}>
        <BranchMessages>
          {message.versions.map((version) => (
            <MemoizedMessage
              key={`${message.key}-${version.id}`}
              message={message}
              version={version}
              isStreaming={status !== 'ready'}
              streamingMessageId={streamingMessageId}
              renderMessageContent={renderMessageContent}
            />
          ))}
        </BranchMessages>
        {message.versions.length > 1 && (
          <BranchSelector from={message.from}>
            <BranchPrevious />
            <BranchPage />
            <BranchNext />
          </BranchSelector>
        )}
      </Branch>
    ));
  }, [messages, status, streamingMessageId, renderMessageContent, MemoizedMessage]);

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_0_24px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-opacity duration-300',
        hidden && 'pointer-events-none opacity-0',
        className
      )}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent className="space-y-4 px-4 pb-12 pt-4">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">
                Start a conversation to generate diagrams.
              </div>
            ) : (
              memoizedMessages
            )}
            
            {/* Thinking Component */}
            {thinkingContent ? (
              <div key="thinking-wrapper" className="px-4">
                <Reasoning
                  isStreaming={status === 'streaming' && isThinking}
                  defaultOpen={true}
                >
                  <ReasoningTrigger />
                  <ReasoningContent>
                    <div className="mb-4 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                          <p className="font-semibold text-blue-800">
                            AI Thinking Process
                          </p>
                        </div>
                        {status === 'streaming' && isThinking && (
                          <div className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                            Live
                          </div>
                        )}
                      </div>
                      <div className="bg-white rounded-md p-3 border border-blue-200 shadow-sm">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">
                          {thinkingContent}
                        </pre>
                      </div>
                    </div>
                    <ChainOfThought>
                      <ChainOfThoughtHeader>
                        Processing Steps
                      </ChainOfThoughtHeader>
                      <ChainOfThoughtContent>
                        <ChainOfThoughtStep
                          label="Understanding Request"
                          description="Analyzing your input and requirements"
                          status="complete"
                        />
                        <ChainOfThoughtStep
                          label="Planning Diagram"
                          description="Designing the diagram structure and layout"
                          status={status === 'streaming' && isThinking ? 'active' : 'complete'}
                        />
                        <ChainOfThoughtStep
                          label="Generating Code"
                          description="Creating Mermaid diagram code"
                          status={status === 'streaming' && isThinking ? 'active' : 'complete'}
                        />
                        <ChainOfThoughtStep
                          label="Finalizing Response"
                          description="Preparing explanation and adding to canvas"
                          status={status === 'streaming' && isThinking ? 'pending' : 'complete'}
                        />
                      </ChainOfThoughtContent>
                    </ChainOfThought>
                  </ReasoningContent>
                </Reasoning>
              </div>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="grid shrink-0 gap-3 border-t border-gray-200 bg-white px-3 pb-3 pt-3 text-sm">
          {errorMessage ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}
          {messages.length === 0 ? (
            <Suggestions className="px-1">
              {suggestions.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  className="border border-gray-200 bg-gray-100 text-xs font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          ) : null}
          <div className="w-full">
            <PromptInput
              className="group [&_[data-slot=input-group]]:min-h-[36px] [&_[data-slot=input-group]]:rounded-lg [&_[data-slot=input-group]]:border [&_[data-slot=input-group]]:border-gray-200 [&_[data-slot=input-group]]:bg-white [&_[data-slot=input-group]]:px-2 [&_[data-slot=input-group]]:py-1"
              globalDrop
              multiple
              onSubmit={handleSubmit}
            >
              <PromptInputBody>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputTextarea
                  className="text-xs text-gray-900 placeholder:text-gray-500"
                  onChange={(event) => setText(event.target.value)}
                  ref={textareaRef}
                  value={text}
                  placeholder="Ask me to create diagrams..."
                />
              </PromptInputBody>
              <PromptInputToolbar className="mt-1.5 border-t border-gray-200 pt-1.5">
                <PromptInputTools className="flex items-center justify-between gap-2">
                  <PromptInputModelSelect onValueChange={setModel} value={model}>
                    <PromptInputModelSelectTrigger className='rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-100 [&[aria-expanded="true"]]:border-gray-900 [&[aria-expanded="true"]]:bg-gray-900 [&[aria-expanded="true"]]:text-white flex items-center justify-between gap-1 min-w-0'>
                      <PromptInputModelSelectValue className="truncate" />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {models.map((model) => (
                        <PromptInputModelSelectItem
                          key={model.id}
                          value={model.id}
                        >
                          {model.name}
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>
                  <PromptInputSubmit
                    className="rounded-full bg-primary px-1 py-0.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                    disabled={!text.trim() && status !== 'streaming'}
                    status={status}
                >
                  <ArrowUp className="size-2.5" />
                </PromptInputSubmit>
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatBox(props: ChatBoxProps) {
  return <ChatBoxInner {...props} />;
}
