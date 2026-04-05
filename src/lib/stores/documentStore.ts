/**
 * Shared Document Markdown Store
 * Allows the chat (markdownWrite tool) to update the Document panel content.
 * The DocumentPanel subscribes to this store and reflects changes in real-time.
 */
import { writable } from 'svelte/store';

export const documentMarkdownStore = writable<string>('');
