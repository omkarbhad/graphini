/**
 * Icon search and assignment utility — local-only, no external API calls.
 * Uses /icons/index.json for all icon lookups.
 */

interface IconEntry {
  id: string;
  path: string;
  category: string;
  keywords: string[];
}

export class IconSearchManager {
  private static instance: IconSearchManager;
  private icons: IconEntry[] = [];
  private loaded = false;

  static getInstance(): IconSearchManager {
    if (!IconSearchManager.instance) {
      IconSearchManager.instance = new IconSearchManager();
    }
    return IconSearchManager.instance;
  }

  /**
   * Load icon index from static file (cached after first load)
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const res = await fetch('/icons/index.json');
      if (res.ok) {
        const data = await res.json();
        this.icons = data.icons || [];
      }
    } catch (e) {
      console.error('Failed to load icon index:', e);
    }
    this.loaded = true;
  }

  /**
   * Search for icons by query string
   */
  async searchIcons(query: string): Promise<Record<string, string>> {
    await this.ensureLoaded();
    if (!query.trim()) return {};
    const q = query.toLowerCase();
    const results: Record<string, string> = {};
    for (const icon of this.icons) {
      if (
        icon.id.toLowerCase().includes(q) ||
        icon.keywords.some((kw) => kw.toLowerCase().includes(q))
      ) {
        results[icon.id] = icon.path;
      }
    }
    return results;
  }

  /**
   * Get all available icons
   */
  async getAllIcons(): Promise<Record<string, string>> {
    await this.ensureLoaded();
    const result: Record<string, string> = {};
    for (const icon of this.icons) {
      result[icon.id] = icon.path;
    }
    return result;
  }

  /**
   * Find exact icon match by id
   */
  async findExactIcon(serviceName: string): Promise<string | null> {
    await this.ensureLoaded();
    const lower = serviceName.toLowerCase();
    const exact = this.icons.find((i) => i.id.toLowerCase() === lower);
    if (exact) return exact.path;

    // Try with common prefixes
    for (const prefix of ['aws-', 'azure-', 'gcp-', 'k8s-']) {
      const prefixed = this.icons.find((i) => i.id.toLowerCase() === prefix + lower);
      if (prefixed) return prefixed.path;
    }

    // Try without prefix
    const stripped = lower.replace(/^(aws|azure|gcp|k8s)-/, '');
    const strippedMatch = this.icons.find((i) => i.id.toLowerCase() === stripped);
    if (strippedMatch) return strippedMatch.path;

    return null;
  }

  /**
   * Find best matching icon using scoring
   */
  async findBestMatch(serviceName: string): Promise<string | null> {
    await this.ensureLoaded();
    const lower = serviceName.toLowerCase();

    let bestPath: string | null = null;
    let bestScore = 0;

    for (const icon of this.icons) {
      const iconId = icon.id.toLowerCase();
      let score = 0;

      // Exact match
      if (iconId === lower) {
        score = 100;
      }
      // Icon id contains query
      else if (iconId.includes(lower)) {
        score = 85;
      }
      // Query contains icon id
      else if (lower.includes(iconId) && iconId.length > 3) {
        score = 80;
      }
      // Keyword match
      else if (icon.keywords.some((kw) => kw.toLowerCase() === lower)) {
        score = 90;
      }
      // Partial keyword match
      else {
        const queryWords = lower.split(/[\s\-_]+/).filter((w) => w.length > 2);
        const iconWords = icon.keywords.map((k) => k.toLowerCase());
        let matched = 0;
        for (const qw of queryWords) {
          if (iconId.includes(qw) || iconWords.some((iw) => iw.includes(qw) || qw.includes(iw))) {
            matched++;
          }
        }
        if (queryWords.length > 0 && matched > 0) {
          score = (matched / queryWords.length) * 70;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPath = icon.path;
      }
    }

    return bestScore >= 50 ? bestPath : null;
  }

  /**
   * Generate Mermaid icon annotation for a node
   */
  async generateIconAssignment(nodeId: string, serviceName: string): Promise<string> {
    const iconPath = await this.findBestMatch(serviceName);
    if (iconPath) {
      return `${nodeId}@{ img: "${iconPath}", label: "${serviceName}", pos: "b", w: 60, h: 60, constraint: "on" }`;
    }
    return '';
  }

  /**
   * Process Mermaid code to add icon assignments
   */
  async processMermaidCode(mermaidCode: string): Promise<string> {
    const lines = mermaidCode.split('\n');
    const processedLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      const nodeMatch = trimmedLine.match(/^(\w+)\["([^"]+)"\]$/);

      if (nodeMatch) {
        const [, nodeId, nodeLabel] = nodeMatch;
        const iconAssignment = await this.generateIconAssignment(nodeId, nodeLabel);
        processedLines.push(line);
        if (iconAssignment) {
          processedLines.push(`    ${iconAssignment}`);
        }
        continue;
      }

      processedLines.push(line);
    }

    return processedLines.join('\n');
  }

  /**
   * Clear cached icons
   */
  clearCache(): void {
    this.icons = [];
    this.loaded = false;
  }
}

// Export singleton instance
export const iconSearchManager = IconSearchManager.getInstance();
