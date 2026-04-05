import { getContext, setContext } from 'svelte';
import { get, writable, type Writable } from 'svelte/store';

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

export interface PromptAttachment {
  id: string;
  file: File;
}

export interface PromptInputMessage {
  text: string;
  files?: File[];
}

interface PromptInputContext {
  attachments: Writable<PromptAttachment[]>;
  addAttachments: (files: FileList | File[]) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  multiple: () => boolean;
  registerTextarea: (textarea: HTMLTextAreaElement | null) => void;
  getTextareaValue: () => string;
  resetTextareaValue: () => void;
}

export interface PromptInputActionMenuContext {
  readonly open: () => boolean;
  toggle: () => void;
  close: () => void;
}

export interface PromptInputModelSelectContext {
  readonly open: () => boolean;
  setOpen: (open: boolean) => void;
  readonly value: () => string | null;
  setValue: (value: string) => void;
}

const PROMPT_INPUT_KEY = Symbol('prompt-input-context');
const PROMPT_INPUT_ACTION_MENU_KEY = Symbol('prompt-input-action-menu-context');
const PROMPT_INPUT_MODEL_SELECT_KEY = Symbol('prompt-input-model-select-context');

export function createPromptInputContext(multiple: boolean) {
  const attachments = writable<PromptAttachment[]>([]);
  let textarea: HTMLTextAreaElement | null = null;

  const addAttachments = (incoming: FileList | File[]) => {
    const files = Array.from(incoming ?? []);
    if (files.length === 0) return;

    attachments.update((current) => {
      const next = multiple ? [...current] : [];
      for (const file of files) {
        next.push({ id: crypto.randomUUID(), file });
      }
      return next;
    });
  };

  const removeAttachment = (id: string) => {
    attachments.update((current) => current.filter((item) => item.id !== id));
  };

  const clearAttachments = () => {
    attachments.set([]);
  };

  const registerTextarea = (element: HTMLTextAreaElement | null) => {
    textarea = element;
  };

  const getTextareaValue = () => textarea?.value ?? '';

  const resetTextareaValue = () => {
    if (!textarea) return;
    textarea.value = '';
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);
  };

  const context: PromptInputContext = {
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    multiple: () => multiple,
    registerTextarea,
    getTextareaValue,
    resetTextareaValue
  };

  setContext(PROMPT_INPUT_KEY, context);

  return context;
}

export function getPromptInputContext(): PromptInputContext {
  const context = getContext<PromptInputContext | undefined>(PROMPT_INPUT_KEY);
  if (!context) {
    throw new Error('PromptInput components must be used inside <PromptInput>');
  }
  return context;
}

export function getAttachmentsArray(context: PromptInputContext) {
  return get(context.attachments);
}

export function setPromptInputActionMenuContext(context: PromptInputActionMenuContext) {
  setContext(PROMPT_INPUT_ACTION_MENU_KEY, context);
}

export function getPromptInputActionMenuContext(): PromptInputActionMenuContext {
  const context = getContext<PromptInputActionMenuContext | undefined>(
    PROMPT_INPUT_ACTION_MENU_KEY
  );
  if (!context) {
    throw new Error(
      'PromptInput action menu components must be used inside <PromptInputActionMenu>'
    );
  }
  return context;
}

export function setPromptInputModelSelectContext(context: PromptInputModelSelectContext) {
  setContext(PROMPT_INPUT_MODEL_SELECT_KEY, context);
}

export function getPromptInputModelSelectContext(): PromptInputModelSelectContext {
  const context = getContext<PromptInputModelSelectContext | undefined>(
    PROMPT_INPUT_MODEL_SELECT_KEY
  );
  if (!context) {
    throw new Error(
      'PromptInput model select components must be used inside <PromptInputModelSelect>'
    );
  }
  return context;
}
