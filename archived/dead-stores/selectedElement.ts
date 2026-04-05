import { writable } from 'svelte/store';

export interface SelectedElement {
  type: 'node' | 'edge' | null;
  id: string | null;
  index: number | null;
  clickedOnIcon?: boolean;
}

export const selectedElementStore = writable<SelectedElement>({
  type: null,
  id: null,
  index: null,
  clickedOnIcon: false
});

export const clearSelection = () => {
  selectedElementStore.set({ type: null, id: null, index: null, clickedOnIcon: false });

  // Also remove visual selection styling
  document.querySelectorAll('.diagram-element-selected').forEach((el) => {
    el.classList.remove('diagram-element-selected');
  });
};

export const selectNode = (nodeId: string, clickedOnIcon: boolean = false) => {
  selectedElementStore.set({ type: 'node', id: nodeId, index: null, clickedOnIcon });
};

export const selectEdge = (edgeIndex: number) => {
  selectedElementStore.set({ type: 'edge', id: null, index: edgeIndex, clickedOnIcon: false });
};

export const restoreSelection = (element: SelectedElement) => {
  selectedElementStore.set(element);
};
