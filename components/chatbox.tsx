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
import { ArrowUp } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { useMermaidToCanvas } from './use-mermaid-to-canvas';
import { cn } from '@/lib/utils';

type MessageType = {
  key: string;
  from: 'user' | 'assistant';
  versions: {
    id: string;
    content: string;
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

const models = [
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
];

const suggestions = [
  'Create a flowchart for user authentication',
  'Explain React hooks with a diagram',
  'Show me a sequence diagram for API calls',
  'Create a class diagram for e-commerce system',
  'Visualize a state machine',
  'Generate a Gantt chart for project timeline',
];

interface ChatBoxProps {
  onAddMermaidToCanvas: (mermaidCode: string) => void;
  className?: string;
  hidden?: boolean;
}

export default function ChatBox({ onAddMermaidToCanvas, className, hidden }: ChatBoxProps) {
  const [model, setModel] = useState<string>(models[0].id);
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready');
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { convertMermaid, ready: mermaidReady } = useMermaidToCanvas();
  const processedMermaidCodes = useRef<Set<string>>(new Set());

  // Auto-detect and insert mermaid diagrams
  useEffect(() => {
    if (status !== 'ready') return;

    messages.forEach((message) => {
      if (message.from !== 'assistant') return;

      message.versions.forEach((version) => {
        const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
        let match;

        while ((match = mermaidRegex.exec(version.content)) !== null) {
          const mermaidCode = match[1].trim();
          const codeHash = `${message.key}-${mermaidCode}`;

          if (!processedMermaidCodes.current.has(codeHash)) {
            processedMermaidCodes.current.add(codeHash);
            // Auto-insert to canvas
            onAddMermaidToCanvas(mermaidCode);
          }
        }
      });
    });
  }, [messages, status, onAddMermaidToCanvas]);

  const stop = useCallback(() => {
    console.log('Stopping generation...');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStatus('ready');
    setStreamingMessageId(null);
  }, []);

  const streamResponse = useCallback(
    async (messageId: string, userMessage: string) => {
      setStatus('streaming');
      setStreamingMessageId(messageId);
      setErrorMessage(null);

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

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          currentContent += chunk;

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.versions.some((v) => v.id === messageId)) {
                return {
                  ...msg,
                  versions: msg.versions.map((v) =>
                    v.id === messageId ? { ...v, content: currentContent } : v,
                  ),
                };
              }
              return msg;
            }),
          );
        }

        setStatus('ready');
        setStreamingMessageId(null);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          console.error('Streaming error:', error);
          const message = error instanceof Error ? error.message : 'Unknown error';
          const needsApiKey = message.includes('OpenRouter API key not configured');
          setErrorMessage(
            needsApiKey
              ? 'Chat requires a valid OpenRouter API key. Add OPENROUTER_API_KEY to your .env.local and restart the dev server.'
              : 'Something went wrong while contacting the chat service. Please try again.'
          );
          toast.error('Failed to get response', {
            description: needsApiKey
              ? 'Add OPENROUTER_API_KEY to .env.local before retrying.'
              : message,
          });
          setStatus('error');
        }
        setStreamingMessageId(null);
      }
    },
    [messages, model],
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

  // Render message content with Mermaid support
  const renderMessageContent = (content: string) => {
    const parts: JSX.Element[] = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(content)) !== null) {
      // Add text before mermaid block
      if (match.index > lastIndex) {
        parts.push(
          <Response key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </Response>
        );
      }

      // Add mermaid diagram with auto-converting status
      const mermaidCode = match[1];
      const isConverting = status === 'streaming';

      parts.push(
        <div
          key={`mermaid-${match.index}`}
          className="my-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              Mermaid Diagram
            </span>
            {isConverting ? (
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                <span>Generating...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    fillRule="evenodd"
                  />
                </svg>
                <span>Added to Canvas</span>
              </div>
            )}
          </div>
          <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">{mermaidCode}</pre>
          </div>
        </div>
      );

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
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300',
        hidden && 'pointer-events-none opacity-0',
        className
      )}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent className="space-y-4 px-6 pb-16 pt-6">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-sm text-gray-600">
                Start a conversation to generate diagrams.
              </div>
            ) : (
              messages.map(({ versions, ...message }) => (
                <Branch defaultBranch={0} key={message.key}>
                  <BranchMessages>
                    {versions.map((version) => (
                      <Message
                        from={message.from}
                        key={`${message.key}-${version.id}`}
                      >
                        <div>
                          <MessageContent>
                            {renderMessageContent(version.content)}
                          </MessageContent>
                        </div>
                      </Message>
                    ))}
                  </BranchMessages>
                  {versions.length > 1 && (
                    <BranchSelector from={message.from}>
                      <BranchPrevious />
                      <BranchPage />
                      <BranchNext />
                    </BranchSelector>
                  )}
                </Branch>
              ))
            )}
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
          ) : (
            <div className="px-1 text-[10px] uppercase tracking-[0.3em] text-gray-500">
              Quick tools
            </div>
          )}
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
