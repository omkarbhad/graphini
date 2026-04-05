/**
 * URL construction and navigation utilities.
 * Handles building shareable URLs, canvas path routing,
 * and derived URL stores for the application.
 */

import { C } from '$/constants';
import { replaceState } from '$app/navigation';
import { derived } from 'svelte/store';
import { env } from '../env';
import { pakoSerde } from '../serialization/serde';
import { stateStore } from './state';

const MCBaseURL = env.isEnabledMermaidChartLinks
  ? 'https://mermaidchart.com'
  : 'https://example.com';

export const urlsStore = derived([stateStore], ([{ code, serialized }]) => {
  const { krokiRendererUrl, rendererUrl } = env;
  const png = rendererUrl ? `${rendererUrl}/img/${serialized}?type=png` : '';
  return {
    kroki: krokiRendererUrl ? `${krokiRendererUrl}/mermaid/svg/${pakoSerde.serialize(code)}` : '',
    mdCode: png
      ? `[![](${png})](${window.location.protocol}//${window.location.host}${window.location.pathname}#${serialized})`
      : '',
    mermaidChart: ({
      medium
    }: {
      medium: 'ai_repair' | 'main_menu' | 'save_diagram' | 'share' | 'toggle';
    }) => {
      const params = new URLSearchParams({
        utm_source: C.utmSource,
        utm_medium: medium
      }).toString();
      return {
        save: `${MCBaseURL}/app/plugin/save?state=${serialized}&${params}`,

        plugins: `${MCBaseURL}/plugins?${params}`,
        home: `${MCBaseURL}/?${params}`
      };
    },
    new: `${window.location.protocol}//${window.location.host}/canvas`,
    png,
    svg: rendererUrl ? `${rendererUrl}/svg/${serialized}` : '',
    view: `/view#${serialized}`
  };
});

// Track the last hash we programmatically set to prevent hashchange feedback loops
let lastProgrammaticHash = '';

export const getLastProgrammaticHash = (): string => lastProgrammaticHash;

/**
 * Build and push the canvas URL: /canvas/g-xxx/f-xxx/c-xxx
 * Each segment is optional — only included if the ID is provided.
 */
export const pushCanvasURL = (
  opts: {
    folderId?: string | null;
    fileId?: string | null;
    chatId?: string | null;
  } = {}
): void => {
  let path = '/canvas';
  if (opts.folderId) path += `/${opts.folderId}`;
  if (opts.fileId) path += `/${opts.fileId}`;
  if (opts.chatId) path += `/${opts.chatId}`;
  const current = window.location.pathname;
  if (current === path) return;
  lastProgrammaticHash = path;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- path is dynamically constructed
  replaceState(path, {});
};

export const initURLSubscription = (): void => {
  // No-op: URLs are now driven by file UUID via pushCanvasURL, not serialized state
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
