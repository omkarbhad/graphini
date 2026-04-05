import { loadDataFromUrl } from '$lib/features/filesystem/fileLoaders/loader';
import { env } from './env';
import { initLoading } from './loading';
import { applyMigrations } from './migrations';
import { initURLSubscription, loadState, updateCodeStore, verifyState } from './state';
import { initAnalytics, plausible } from './stats';

export const getDomain = (url?: string): string => {
  if (!url) return '';
  const domain = new URL(url).hostname;
  return domain;
};

/**
 * Parse /canvas/g-xxx/f-xxx/c-xxx URL segments.
 * Returns { folderId, fileId, chatId } — each null if not present.
 */
export const parseCanvasURL = (): {
  folderId: string | null;
  fileId: string | null;
  chatId: string | null;
} => {
  const path = window.location.pathname;
  if (!path.startsWith('/canvas')) return { folderId: null, fileId: null, chatId: null };
  const segments = path
    .replace(/^\/canvas\/?/, '')
    .split('/')
    .filter(Boolean);
  let folderId: string | null = null;
  let fileId: string | null = null;
  let chatId: string | null = null;
  for (const seg of segments) {
    if (seg.startsWith('g-')) folderId = seg;
    else if (seg.startsWith('f-')) fileId = seg;
    else if (seg.startsWith('c-')) chatId = seg;
  }
  return { folderId, fileId, chatId };
};

export const loadStateFromURL = (): void => {
  // /canvas/g-xxx/f-xxx/c-xxx — handled by the edit page's onMount (DB load)
  const { fileId } = parseCanvasURL();
  if (fileId) return;
  // Legacy: /edit#<hash> format (backward compat)
  if (window.location.hash.length > 1) {
    loadState(window.location.hash.slice(1));
  }
};

export const syncDiagram = (): void => {
  updateCodeStore({
    updateDiagram: true
  });
};

export const initHandler = async (): Promise<void> => {
  applyMigrations();
  loadStateFromURL();
  await initLoading('Loading Gist...', loadDataFromUrl().catch(console.error));
  syncDiagram();
  initURLSubscription();
  await initAnalytics();
  plausible?.trackPageview({ url: window.location.origin + window.location.pathname });
  verifyState();
};

export const isMac = navigator.platform.toUpperCase().includes('MAC');
export const cmdKey = isMac ? 'Cmd' : 'Ctrl';
export const MCBaseURL = env.isEnabledMermaidChartLinks
  ? 'https://mermaidchart.com' // 'http://localhost:5174'
  : 'https://example.com';

let count = 0;
export const errorDebug = (limit = 1000) => {
  count += 1;
  if (count > limit) {
    console.log(count, limit);
    // eslint-disable-next-line no-debugger
    debugger;
  }
};

export const formatJSON = (data: unknown): string => JSON.stringify(data, undefined, 2);
export const fetchJSON = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  return res.json() as T;
};
export const fetchText = async (url: string): Promise<string> => {
  const res = await fetch(url);
  return res.text();
};

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    fallbackCopyToClipboard(text);
  }
};

function fallbackCopyToClipboard(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  // Make the textarea out of viewport
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.append(textArea);

  textArea.focus();
  textArea.select();

  try {
    // The deprecated but widely supported method
    document.execCommand('copy');
  } catch (error) {
    console.error('Failed to copy:', error);
    throw error;
  } finally {
    textArea.remove();
  }
}
