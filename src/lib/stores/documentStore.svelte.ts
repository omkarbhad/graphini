/**
 * Shared Document Markdown Store (Svelte 5 runes)
 * Allows the chat (markdownWrite tool) to update the Document panel content.
 * The DocumentPanel subscribes to this store and reflects changes in real-time.
 */

let markdown = $state<string>('');

export const documentMarkdownStore = {
  get value() {
    return markdown;
  },
  set(v: string) {
    markdown = v;
  }
};
