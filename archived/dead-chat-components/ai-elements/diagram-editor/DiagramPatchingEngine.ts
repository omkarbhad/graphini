import type {
  ConnectionPatch,
  DiagramPatch,
  NodePatch,
  PatchMode,
  PatchResult,
  StylePatch,
  TextPatch
} from './types';

export interface PatchingResult {
  code: string;
  appliedPatches: Array<{ patch: DiagramPatch; result: PatchResult }>;
  failedPatches: Array<{ patch: DiagramPatch; error: string }>;
  success: boolean;
}

export class DiagramPatchingEngine {
  static parsePatches(patches: unknown[]): DiagramPatch[] {
    return patches.map((patch) => this.validatePatch(patch));
  }

  static validatePatch(patch: unknown): DiagramPatch {
    if (!patch || typeof patch !== 'object') {
      throw new Error('Patch must be an object');
    }

    const p = patch as Record<string, unknown>;

    if (!p.type || typeof p.type !== 'string') {
      throw new Error('Patch must have a type');
    }

    switch (p.type) {
      case 'node_add':
      case 'node_remove':
      case 'node_modify':
      case 'node_style':
        return this.validateNodePatch(p);
      case 'connection_add':
      case 'connection_remove':
      case 'connection_modify':
        return this.validateConnectionPatch(p);
      case 'style_add':
      case 'style_remove':
      case 'style_modify':
        return this.validateStylePatch(p);
      case 'text_replace':
      case 'text_insert':
      case 'text_delete':
        return this.validateTextPatch(p);
      default:
        throw new Error(`Unknown patch type: ${p.type}`);
    }
  }

  private static validateNodePatch(patch: Record<string, unknown>): NodePatch {
    return {
      type: patch.type as NodePatch['type'],
      target: patch.target as string | undefined,
      content: patch.content as string | undefined,
      position: patch.position as NodePatch['position'],
      properties: patch.properties as Record<string, string> | undefined
    };
  }

  private static validateConnectionPatch(patch: Record<string, unknown>): ConnectionPatch {
    return {
      type: patch.type as ConnectionPatch['type'],
      source: patch.source as string | undefined,
      target: patch.target as string | undefined,
      content: patch.content as string | undefined,
      position: patch.position as number | undefined,
      properties: patch.properties as Record<string, string> | undefined
    };
  }

  private static validateStylePatch(patch: Record<string, unknown>): StylePatch {
    if (!patch.target || typeof patch.target !== 'string') {
      throw new Error('Style patch requires a target');
    }
    if (!patch.properties || typeof patch.properties !== 'object') {
      throw new Error('Style patch requires properties');
    }
    return {
      type: patch.type as StylePatch['type'],
      target: patch.target,
      properties: patch.properties as Record<string, string>,
      mode: patch.mode as StylePatch['mode']
    };
  }

  private static validateTextPatch(patch: Record<string, unknown>): TextPatch {
    if (!patch.position || typeof patch.position !== 'object') {
      throw new Error('Text patch requires a position');
    }
    const position = patch.position as Record<string, unknown>;
    if (typeof position.line !== 'number') {
      throw new Error('Text patch position requires a line number');
    }
    return {
      type: patch.type as TextPatch['type'],
      position: {
        line: position.line,
        column: position.column as number | undefined,
        length: position.length as number | undefined
      },
      content: (patch.content as string) || '',
      oldContent: patch.oldContent as string | undefined
    };
  }

  static applyPatches(
    currentCode: string,
    patches: DiagramPatch[],
    mode: PatchMode = 'safe'
  ): PatchingResult {
    const result: PatchingResult = {
      code: currentCode,
      appliedPatches: [],
      failedPatches: [],
      success: true
    };

    for (const patch of patches) {
      try {
        const patchResult = this.applyPatch(result.code, patch, mode);
        result.code = patchResult.code;
        result.appliedPatches.push({ patch, result: patchResult });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.failedPatches.push({ patch, error: errorMessage });

        if (mode === 'precise') {
          result.success = false;
          break;
        }
      }
    }

    if (result.failedPatches.length > 0 && mode !== 'aggressive') {
      result.success = false;
    }

    return result;
  }

  static applyPatch(code: string, patch: DiagramPatch, mode: PatchMode): PatchResult {
    switch (patch.type) {
      case 'node_add':
        return this.addNodePatch(code, patch as NodePatch);
      case 'node_remove':
        return this.removeNodePatch(code, patch as NodePatch);
      case 'node_modify':
        return this.modifyNodePatch(code, patch as NodePatch);
      case 'node_style':
        return this.styleNodePatch(code, patch as NodePatch);
      case 'connection_add':
        return this.addConnectionPatch(code, patch as ConnectionPatch);
      case 'connection_remove':
        return this.removeConnectionPatch(code, patch as ConnectionPatch);
      case 'connection_modify':
        return this.modifyConnectionPatch(code, patch as ConnectionPatch);
      case 'style_add':
      case 'style_modify':
        return this.modifyStylePatch(code, patch as StylePatch);
      case 'style_remove':
        return this.removeStylePatch(code, patch as StylePatch);
      case 'text_replace':
        return this.replaceTextPatch(code, patch as TextPatch);
      case 'text_insert':
        return this.insertTextPatch(code, patch as TextPatch);
      case 'text_delete':
        return this.deleteTextPatch(code, patch as TextPatch);
      default:
        throw new Error(`Unsupported patch type: ${(patch as DiagramPatch).type}`);
    }
  }

  // Node operations
  private static addNodePatch(code: string, patch: NodePatch): PatchResult {
    const lines = code.split('\n');
    const newContent = patch.content || '';

    let insertIndex = lines.length;

    if (patch.position?.line !== undefined) {
      insertIndex = Math.min(patch.position.line, lines.length);
    } else if (patch.position?.after) {
      const targetIndex = lines.findIndex((line) => line.includes(patch.position!.after!));
      if (targetIndex !== -1) {
        insertIndex = targetIndex + 1;
      }
    } else if (patch.position?.before) {
      const targetIndex = lines.findIndex((line) => line.includes(patch.position!.before!));
      if (targetIndex !== -1) {
        insertIndex = targetIndex;
      }
    }

    lines.splice(insertIndex, 0, newContent);

    return {
      code: lines.join('\n'),
      changes: [{ type: 'insert', line: insertIndex, content: newContent }],
      success: true
    };
  }

  private static removeNodePatch(code: string, patch: NodePatch): PatchResult {
    if (!patch.target) {
      throw new Error('Node remove patch requires a target node ID');
    }

    const lines = code.split('\n');
    const nodeRegex = new RegExp(`^\\s*${this.escapeRegex(patch.target)}\\s*[\\[\\(\\{\\>]`, 'm');

    let removedLine = -1;
    let removedContent = '';

    const newLines = lines.filter((line, index) => {
      if (nodeRegex.test(line)) {
        removedLine = index;
        removedContent = line;
        return false;
      }
      return true;
    });

    if (removedLine === -1) {
      throw new Error(`Node "${patch.target}" not found`);
    }

    return {
      code: newLines.join('\n'),
      changes: [{ type: 'delete', line: removedLine, oldContent: removedContent }],
      success: true
    };
  }

  private static modifyNodePatch(code: string, patch: NodePatch): PatchResult {
    if (!patch.target) {
      throw new Error('Node modify patch requires a target node ID');
    }

    const lines = code.split('\n');
    const nodeRegex = new RegExp(
      `^(\\s*)${this.escapeRegex(patch.target)}\\s*[\\[\\(\\{\\>].*$`,
      'm'
    );

    let modified = false;
    let oldContent = '';
    let modifiedLine = -1;

    const newLines = lines.map((line, index) => {
      if (nodeRegex.test(line) && !modified) {
        modified = true;
        oldContent = line;
        modifiedLine = index;
        const indent = line.match(/^\s*/)?.[0] || '';
        return indent + (patch.content || line.trim());
      }
      return line;
    });

    if (!modified) {
      throw new Error(`Node "${patch.target}" not found`);
    }

    return {
      code: newLines.join('\n'),
      changes: [
        {
          type: 'modify',
          line: modifiedLine,
          target: patch.target,
          oldContent,
          newContent: patch.content
        }
      ],
      success: true
    };
  }

  private static styleNodePatch(code: string, patch: NodePatch): PatchResult {
    if (!patch.target || !patch.properties) {
      throw new Error('Node style patch requires target and properties');
    }

    return this.modifyStylePatch(code, {
      type: 'style_modify',
      target: patch.target,
      properties: patch.properties,
      mode: 'merge'
    });
  }

  // Connection operations
  private static addConnectionPatch(code: string, patch: ConnectionPatch): PatchResult {
    const lines = code.split('\n');
    const newContent = patch.content || '';

    // Find a good place to insert - after the last connection or node definition
    let insertIndex = lines.length;

    // Look for existing connections or nodes to insert after
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('-->') || lines[i].includes('---') || lines[i].includes('==>')) {
        insertIndex = i + 1;
        break;
      }
    }

    lines.splice(insertIndex, 0, newContent);

    return {
      code: lines.join('\n'),
      changes: [{ type: 'insert', line: insertIndex, content: newContent }],
      success: true
    };
  }

  private static removeConnectionPatch(code: string, patch: ConnectionPatch): PatchResult {
    if (!patch.source || !patch.target) {
      throw new Error('Connection remove patch requires source and target');
    }

    const lines = code.split('\n');
    const connectionRegex = new RegExp(
      `^\\s*${this.escapeRegex(patch.source)}\\s*[-=]+>\\s*${this.escapeRegex(patch.target)}`,
      'm'
    );

    let removedLine = -1;
    let removedContent = '';

    const newLines = lines.filter((line, index) => {
      if (connectionRegex.test(line)) {
        removedLine = index;
        removedContent = line;
        return false;
      }
      return true;
    });

    if (removedLine === -1) {
      throw new Error(`Connection from "${patch.source}" to "${patch.target}" not found`);
    }

    return {
      code: newLines.join('\n'),
      changes: [{ type: 'delete', line: removedLine, oldContent: removedContent }],
      success: true
    };
  }

  private static modifyConnectionPatch(code: string, patch: ConnectionPatch): PatchResult {
    if (!patch.source || !patch.target) {
      throw new Error('Connection modify patch requires source and target');
    }

    const lines = code.split('\n');
    const connectionRegex = new RegExp(
      `^(\\s*)${this.escapeRegex(patch.source)}\\s*[-=]+>\\s*${this.escapeRegex(patch.target)}.*$`,
      'm'
    );

    let modified = false;
    let oldContent = '';
    let modifiedLine = -1;

    const newLines = lines.map((line, index) => {
      if (connectionRegex.test(line) && !modified) {
        modified = true;
        oldContent = line;
        modifiedLine = index;
        const indent = line.match(/^\s*/)?.[0] || '';
        return indent + (patch.content || line.trim());
      }
      return line;
    });

    if (!modified) {
      throw new Error(`Connection from "${patch.source}" to "${patch.target}" not found`);
    }

    return {
      code: newLines.join('\n'),
      changes: [{ type: 'modify', line: modifiedLine, oldContent, newContent: patch.content }],
      success: true
    };
  }

  // Style operations
  private static modifyStylePatch(code: string, patch: StylePatch): PatchResult {
    if (!patch.target) {
      throw new Error('Style patch requires a target');
    }

    const lines = code.split('\n');
    const styleRegex = new RegExp(`^\\s*style\\s+${this.escapeRegex(patch.target)}\\s+(.*)$`, 'm');

    let styleLine: string | null = null;
    let styleLineIndex = -1;

    lines.forEach((line, index) => {
      const match = line.match(styleRegex);
      if (match) {
        styleLine = line;
        styleLineIndex = index;
      }
    });

    const newLines = [...lines];

    if (styleLine !== null && styleLineIndex !== -1) {
      // Modify existing style
      const existingMatch = (styleLine as string).match(styleRegex);
      const existingStyle = existingMatch ? existingMatch[1] : '';
      const newStyle = this.mergeStyleProperties(
        existingStyle,
        patch.properties,
        patch.mode || 'merge'
      );
      const indent = (styleLine as string).match(/^\s*/)?.[0] || '    ';
      newLines[styleLineIndex] = `${indent}style ${patch.target} ${newStyle}`;
    } else {
      // Add new style line
      const styleString = Object.entries(patch.properties)
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      newLines.push(`    style ${patch.target} ${styleString}`);
    }

    return {
      code: newLines.join('\n'),
      changes: [{ type: 'style', target: patch.target, properties: patch.properties }],
      success: true
    };
  }

  private static removeStylePatch(code: string, patch: StylePatch): PatchResult {
    if (!patch.target) {
      throw new Error('Style remove patch requires a target');
    }

    const lines = code.split('\n');
    const styleRegex = new RegExp(`^\\s*style\\s+${this.escapeRegex(patch.target)}\\s+.*$`, 'm');

    let removedLine = -1;
    let removedContent = '';

    const newLines = lines.filter((line, index) => {
      if (styleRegex.test(line)) {
        removedLine = index;
        removedContent = line;
        return false;
      }
      return true;
    });

    if (removedLine === -1) {
      throw new Error(`Style for "${patch.target}" not found`);
    }

    return {
      code: newLines.join('\n'),
      changes: [{ type: 'delete', line: removedLine, oldContent: removedContent }],
      success: true
    };
  }

  // Text operations
  private static replaceTextPatch(code: string, patch: TextPatch): PatchResult {
    const lines = code.split('\n');
    const lineIndex = patch.position.line;

    if (lineIndex < 0 || lineIndex >= lines.length) {
      throw new Error(`Line ${lineIndex} out of range`);
    }

    const oldContent = lines[lineIndex];

    if (patch.position.column !== undefined && patch.position.length !== undefined) {
      // Replace specific portion
      const before = oldContent.substring(0, patch.position.column);
      const after = oldContent.substring(patch.position.column + patch.position.length);
      lines[lineIndex] = before + patch.content + after;
    } else {
      // Replace entire line
      lines[lineIndex] = patch.content;
    }

    return {
      code: lines.join('\n'),
      changes: [{ type: 'modify', line: lineIndex, oldContent, newContent: lines[lineIndex] }],
      success: true
    };
  }

  private static insertTextPatch(code: string, patch: TextPatch): PatchResult {
    const lines = code.split('\n');
    const lineIndex = Math.min(patch.position.line, lines.length);

    lines.splice(lineIndex, 0, patch.content);

    return {
      code: lines.join('\n'),
      changes: [{ type: 'insert', line: lineIndex, content: patch.content }],
      success: true
    };
  }

  private static deleteTextPatch(code: string, patch: TextPatch): PatchResult {
    const lines = code.split('\n');
    const lineIndex = patch.position.line;

    if (lineIndex < 0 || lineIndex >= lines.length) {
      throw new Error(`Line ${lineIndex} out of range`);
    }

    const oldContent = lines[lineIndex];
    lines.splice(lineIndex, 1);

    return {
      code: lines.join('\n'),
      changes: [{ type: 'delete', line: lineIndex, oldContent }],
      success: true
    };
  }

  // Helper methods
  private static mergeStyleProperties(
    existing: string,
    newProps: Record<string, string>,
    mode: StylePatch['mode'] = 'merge'
  ): string {
    const styleProps: Record<string, string> = {};

    // Parse existing properties
    if (existing) {
      existing.split(',').forEach((prop) => {
        const [key, value] = prop.split(':');
        if (key && value) {
          styleProps[key.trim()] = value.trim();
        }
      });
    }

    // Apply new properties based on mode
    if (mode === 'replace') {
      return Object.entries(newProps)
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
    }

    Object.entries(newProps).forEach(([key, value]) => {
      if (mode === 'remove_property') {
        delete styleProps[key];
      } else {
        styleProps[key] = value;
      }
    });

    return Object.entries(styleProps)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default DiagramPatchingEngine;
