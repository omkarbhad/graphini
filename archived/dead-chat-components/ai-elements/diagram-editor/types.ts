/**
 * Diagram Editor Types
 */

export type DiagramEditorOperation = 'read' | 'create' | 'update' | 'clear' | 'patch';

export type DiagramEditorTaskType =
  | 'diagram_read'
  | 'diagram_create'
  | 'diagram_update'
  | 'diagram_clear'
  | 'diagram_patch';

export interface DiagramEditorTask {
  id: string;
  type: DiagramEditorTaskType;
  operation: DiagramEditorOperation;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  result?: any;
  error?: string;
  title?: string;
  details?: string;
  metadata?: {
    taskData?: {
      title?: string;
      status?: string;
      progress?: number;
      details?: string;
    };
  };
}

export interface DiagramEditorPatch {
  type:
    | 'node_add'
    | 'node_remove'
    | 'node_modify'
    | 'node_style'
    | 'connection_add'
    | 'connection_remove'
    | 'connection_modify'
    | 'style_add'
    | 'style_remove'
    | 'style_modify'
    | 'text_replace'
    | 'text_insert'
    | 'text_delete';
  target?: string;
  content?: any;
  position?: number;
}

// Patch types for DiagramPatchingEngine
export type NodePatch = DiagramEditorPatch & {
  type: 'node_add' | 'node_remove' | 'node_modify' | 'node_style';
};
export type ConnectionPatch = DiagramEditorPatch & {
  type: 'connection_add' | 'connection_remove' | 'connection_modify';
};
export type StylePatch = DiagramEditorPatch & {
  type: 'style_add' | 'style_remove' | 'style_modify';
};
export type TextPatch = DiagramEditorPatch & {
  type: 'text_replace' | 'text_insert' | 'text_delete';
};
export type DiagramPatch = NodePatch | ConnectionPatch | StylePatch | TextPatch;
export type PatchMode = 'lenient' | 'precise';

export interface PatchResult {
  success: boolean;
  code: string;
  appliedPatches: DiagramEditorPatch[];
  failedPatches: DiagramEditorPatch[];
  errors: string[];
}

export interface DiagramEditorEvent {
  type:
    | 'diagram_editor_start'
    | 'diagram_editor_progress'
    | 'diagram_editor_partial_code'
    | 'diagram_editor_complete'
    | 'diagram_editor_error'
    | 'diagram_editor_patch_start'
    | 'diagram_editor_patch_progress'
    | 'diagram_editor_patch_complete'
    // Validation events
    | 'diagram_editor_validation_start'
    | 'diagram_editor_validation_complete'
    | 'diagram_editor_validation_error'
    // Syntax analysis events
    | 'diagram_editor_syntax_check_start'
    | 'diagram_editor_syntax_check_complete'
    | 'diagram_editor_syntax_error'
    // Type detection events
    | 'diagram_editor_type_detected'
    | 'diagram_editor_type_detection_failed'
    // Code generation events
    | 'diagram_editor_code_generation_start'
    | 'diagram_editor_code_generation_progress'
    | 'diagram_editor_code_generation_complete'
    // Enhancement events
    | 'diagram_editor_enhancement_start'
    | 'diagram_editor_enhancement_complete';
  taskId: string;
  data?: any;
}

/**
 * Get operation title for display
 */
export function getOperationTitle(operation: DiagramEditorOperation): string {
  switch (operation) {
    case 'read':
      return 'Reading Diagram';
    case 'create':
      return 'Creating Diagram';
    case 'update':
      return 'Updating Diagram';
    case 'clear':
      return 'Clearing Editor';
    case 'patch':
      return 'Patching Diagram';
    default:
      return 'Processing Diagram';
  }
}
