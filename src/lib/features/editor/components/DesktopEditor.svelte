<script lang="ts">
  import type { EditorProps } from '$/types';
  import { stateStore } from '$/util/state/state';
  import { kv } from '$lib/stores/kvStore.svelte';
  import { initEditor } from '$lib/util/editor/monacoExtra';
  import { errorDebug } from '$lib/util/util';
  import mermaid from 'mermaid';
  import { mode } from 'mode-watcher';
  import * as monaco from 'monaco-editor';
  import monacoEditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import monacoJsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  const { onUpdate }: EditorProps = $props();

  let divElement: HTMLDivElement | undefined = $state();
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  let validationTimeout: ReturnType<typeof setTimeout> | undefined;
  let lastValidatedCode = '';
  let lastValidationResult: { valid: boolean; error?: string } | null = null;

  // Validation trigger function with caching - immediate for errors
  async function triggerValidation(code: string, immediate = false) {
    // Clear existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Immediate validation for error detection
    if (immediate) {
      await performValidation(code);
      return;
    }

    // Debounce validation to avoid excessive calls
    validationTimeout = setTimeout(() => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => performValidation(code), { timeout: 500 });
      } else {
        performValidation(code);
      }
    }, 400);
  }

  async function performValidation(code: string) {
    if (!code || code.trim().length < 5) {
      lastValidatedCode = code;
      lastValidationResult = null;
      kv.set('editor', 'editorValidationError', null);
      return;
    }

    // Check if we already validated this exact code
    if (lastValidatedCode === code && lastValidationResult) {
      if (!lastValidationResult.valid && lastValidationResult.error) {
        kv.set('editor', 'editorValidationError', lastValidationResult.error);
      } else {
        kv.set('editor', 'editorValidationError', null);
      }
      return;
    }

    // Fast validation - only check critical syntax errors
    try {
      // Quick syntax check without full parsing
      const lines = code.split('\n');
      let hasError = false;
      let errorMessage = '';

      // Check for basic syntax errors
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('%%')) continue;

        // Check for unclosed brackets
        const openBrackets = (line.match(/[\[\(\{]/g) || []).length;
        const closeBrackets = (line.match(/[\]\)\}]/g) || []).length;
        if (openBrackets !== closeBrackets) {
          hasError = true;
          errorMessage = `Unclosed bracket on line ${i + 1}`;
          break;
        }

        // Check for unclosed quotes
        const quotes = (line.match(/"/g) || []).length;
        if (quotes % 2 !== 0) {
          hasError = true;
          errorMessage = `Unclosed quote on line ${i + 1}`;
          break;
        }
      }

      if (!hasError) {
        // Only do full mermaid parse if basic checks pass
        // Suppress console to prevent "Syntax error in text" / "mermaid version" messages
        const _origError = console.error;
        const _origWarn = console.warn;
        console.error = () => {};
        console.warn = () => {};
        try {
          await mermaid.parse(code);
        } finally {
          console.error = _origError;
          console.warn = _origWarn;
        }
        lastValidatedCode = code;
        lastValidationResult = { valid: true };
        kv.set('editor', 'editorValidationError', null);
      } else {
        lastValidatedCode = code;
        lastValidationResult = { valid: false, error: errorMessage };
        kv.set('editor', 'editorValidationError', errorMessage);
      }
    } catch (e: any) {
      lastValidatedCode = code;
      lastValidationResult = { valid: false, error: e?.message || 'Invalid diagram syntax' };
      kv.set('editor', 'editorValidationError', e?.message || 'Invalid diagram syntax');
    }
  }
  let editorOptions = {
    minimap: {
      enabled: false
    },
    overviewRulerLanes: 0,
    fontSize: 13,
    lineHeight: 20,
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    renderLineHighlight: 'gutter' as const,
    lineNumbers: 'on' as const,
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    // Enhanced validation indicators
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on' as const,
    tabCompletion: 'on' as const,
    wordBasedSuggestions: 'allDocuments' as const,
    // Enhanced error display
    hover: {
      enabled: true,
      delay: 200
    },
    // Modern appearance
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    smoothScrolling: true,
    bracketPairColorization: {
      enabled: true
    },
    guides: {
      indentation: true,
      bracketPairs: true
    },
    // Better selection and highlighting
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile' as const,
    codeLens: false,
    scrollbar: {
      vertical: 'visible' as const,
      horizontal: 'visible' as const,
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false
    }
  };
  let currentText = '';

  const jsonModel = monaco.editor.createModel(
    '',
    'json',
    monaco.Uri.parse('internal://config.json')
  );
  const mermaidModel = monaco.editor.createModel(
    '',
    'mermaid',
    monaco.Uri.parse('internal://mermaid.mmd')
  );

  onMount(() => {
    self.MonacoEnvironment = {
      getWorker(_, label) {
        if (label === 'json') {
          return new monacoJsonWorker();
        }
        return new monacoEditorWorker();
      }
    };

    if (!divElement) {
      throw new Error('divEl is undefined');
    }

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      enableSchemaRequest: true,
      schemas: [
        {
          fileMatch: ['config.json'],
          uri: 'https://mermaid.js.org/schemas/config.schema.json'
        }
      ]
    });

    initEditor(monaco);
    errorDebug();
    editor = monaco.editor.create(divElement, editorOptions);

    // Initialize editor with current state immediately
    const currentState = get(stateStore);
    const model = currentState.editorMode === 'code' ? mermaidModel : jsonModel;
    editor.setModel(model);

    const initialText =
      currentState.editorMode === 'code' ? currentState.code : currentState.mermaid;
    editor.setValue(initialText);
    currentText = initialText;

    editor.onDidChangeModelContent(({ isFlush }) => {
      const newText = editor?.getValue();
      if (!newText || currentText === newText || isFlush) {
        return;
      }
      currentText = newText;
      onUpdate(newText);

      // Immediate validation for potential errors (check for common error patterns)
      const hasPotentialError = /[^\]]*\[[^\]]*$|[^\)]*\([^\)]*$|[^\}]*\{[^\}]*$|"[^"]*$/.test(
        newText
      );

      // Trigger immediate validation if potential error detected, otherwise use debounce
      triggerValidation(newText, hasPotentialError);
    });

    const unsubscribeState = stateStore.subscribe(({ errorMarkers, editorMode, code, mermaid }) => {
      if (!editor) {
        return;
      }

      const model = editorMode === 'code' ? mermaidModel : jsonModel;

      if (editor.getModel()?.id !== model.id) {
        editor.setModel(model);
      }

      // Update editor text if it's different or if this is the first load
      const newText = (editorMode === 'code' ? code : mermaid) || '';

      // Always update on first load or if text is different
      if (currentText === '' || newText !== currentText) {
        try {
          editor.setValue(newText);
          editor.setScrollTop(0);
        } catch {
          // Guard against "Illegal value for lineNumber" when editor is in transitional state
        }
        currentText = newText;

        // Trigger validation when switching to code mode
        if (editorMode === 'code') {
          triggerValidation(newText);
        }
      }

      // Display/clear errors
      monaco.editor.setModelMarkers(model, 'mermaid', errorMarkers);
    });

    const unsubscribeMode = mode.subscribe((mode) => {
      if (editor) {
        monaco.editor.setTheme(`mermaid${mode === 'dark' ? '-dark' : ''}`);
      }
    });
    const resizeObserver = new ResizeObserver((entries) => {
      editor?.layout({
        height: entries[0].contentRect.height,
        width: entries[0].contentRect.width
      });
    });

    if (divElement.parentElement) {
      resizeObserver.observe(divElement);
    }

    // Suppress Monaco's internal "Canceled" promise rejections that fire after dispose
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (
        e.reason?.message === 'Canceled' ||
        e.reason?.name === 'Canceled' ||
        (typeof e.reason === 'string' && e.reason === 'Canceled')
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      if (validationTimeout) clearTimeout(validationTimeout);
      unsubscribeState();
      unsubscribeMode();
      resizeObserver.disconnect();
      try {
        jsonModel.dispose();
      } catch {}
      try {
        mermaidModel.dispose();
      } catch {}
      try {
        editor?.dispose();
      } catch {}
      // Remove handler after a delay to catch any lingering rejections
      setTimeout(() => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }, 1000);
    };
  });
</script>

<div class="relative h-full flex-1 overflow-hidden bg-card">
  <div bind:this={divElement} id="editor" class="h-full flex-1 overflow-hidden"></div>
</div>
