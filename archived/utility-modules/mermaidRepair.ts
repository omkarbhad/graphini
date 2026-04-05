import { get } from 'svelte/store';
import { stateStore, updateCode } from './state';

interface RepairResponse {
  success: boolean;
  code: string;
  originalLength: number;
  repairedLength: number;
  error?: string;
}

/**
 * Sends Mermaid code to the repair API and returns the fixed version
 * @param code The Mermaid code to repair
 * @returns Promise with the repair result
 */
export async function repairMermaidCode(code: string): Promise<RepairResponse> {
  try {
    const response = await fetch('/api/repair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to repair code');
    }

    return await response.json();
  } catch (error) {
    console.error('Error repairing Mermaid code:', error);
    return {
      code,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      originalLength: code.length,
      repairedLength: 0,
      success: false
    };
  }
}

/**
 * Gets the current editor code and sends it for repair
 * Updates the editor with the fixed code if successful
 */
export async function repairCurrentDiagram() {
  const currentCode = get(stateStore).code || '';

  if (!currentCode.trim()) {
    return { success: false, error: 'No code to repair' };
  }

  try {
    const result = await repairMermaidCode(currentCode);

    if (result.success) {
      // Update the editor with the fixed code
      updateCode(result.code);
    }

    return result;
  } catch (error) {
    console.error('Failed to repair diagram:', error);
    return {
      success: false,
      code: currentCode,
      originalLength: currentCode.length,
      error: error instanceof Error ? error.message : 'Failed to repair diagram'
    };
  }
}
