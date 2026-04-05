/// <reference types="@sveltejs/kit" />

declare module '*.svelte' {
  import { SvelteComponentDev } from 'svelte/internal';
  const defaultExport: SvelteComponentDev;
  export default defaultExport;
}
