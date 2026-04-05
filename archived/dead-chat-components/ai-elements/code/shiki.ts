// Follows the best practices established in https://shiki.matsu.io/guide/best-performance
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const bundledLanguages = {
  bash: () => import('shiki/langs/bash.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  svelte: () => import('shiki/langs/svelte.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  mermaid: () => import('shiki/langs/mermaid.mjs'),
  text: () => import('shiki/langs/markdown.mjs')
};

/** The languages configured for the highlighter */
export type SupportedLanguage = keyof typeof bundledLanguages;

/** A preloaded highlighter instance. */
export const highlighter = createHighlighterCore({
  themes: [
    import('shiki/themes/github-light-default.mjs'),
    import('shiki/themes/github-dark-default.mjs'),
    import('shiki/themes/vesper.mjs')
  ],
  langs: Object.entries(bundledLanguages).map(([_, lang]) => lang),
  engine: createJavaScriptRegexEngine()
});
