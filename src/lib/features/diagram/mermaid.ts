import { injectAWSIcons } from '$lib/features/icons/iconInjector';
import { diagramData } from '@mermaid-js/examples';
import elkLayouts from '@mermaid-js/layout-elk';
import tidyTreeLayouts from '@mermaid-js/layout-tidy-tree';
import zenuml from '@mermaid-js/mermaid-zenuml';
import type { MermaidConfig, RenderResult } from 'mermaid';
import mermaid from 'mermaid';

mermaid.registerLayoutLoaders([...elkLayouts, ...tidyTreeLayouts]);
const init = mermaid.registerExternalDiagrams([zenuml]);

// ── Shared map: tracks icon nodes colored by the toolbar palette ──
// Key = mermaid node name (e.g. "A"), Value = CSS filter string
export const coloredIconNodes = new Map<string, string>();

// ── Cache for fetched external SVG icon content ──
// Key = URL, Value = { svg: string, isMonochrome: boolean }
const svgIconCache = new Map<string, { svg: string; isMonochrome: boolean }>();

/** Detect if SVG content is monochrome (only black/white/grey fills, no gradients, no real colors) */
function isSvgMonochrome(svgContent: string): boolean {
  if (svgContent.includes('linearGradient') || svgContent.includes('radialGradient')) return false;
  if (/stop-color=["']#[0-9a-fA-F]{3,6}["']/.test(svgContent)) return false;
  // Find all fill values that are actual colors (not none/transparent/currentColor)
  const fillMatches = svgContent.matchAll(/fill=["']([^"']+)["']/gi);
  for (const m of fillMatches) {
    const v = m[1].toLowerCase().trim();
    if (!v || v === 'none' || v === 'transparent' || v === 'currentcolor' || v.startsWith('url('))
      continue;
    // Allow monochrome values
    if (
      /^#(000|000000|111|111111|1a1a1a|222|222222|333|333333|fff|ffffff|eee|eeeeee|ddd|dddddd)$/i.test(
        v
      )
    )
      continue;
    if (v === 'black' || v === 'white') continue;
    return false; // has a real color
  }
  // Check stroke colors too
  const strokeMatches = svgContent.matchAll(/stroke=["']([^"']+)["']/gi);
  for (const m of strokeMatches) {
    const v = m[1].toLowerCase().trim();
    if (!v || v === 'none' || v === 'transparent' || v === 'currentcolor') continue;
    if (
      /^#(000|000000|111|111111|1a1a1a|222|222222|333|333333|fff|ffffff|eee|eeeeee|ddd|dddddd)$/i.test(
        v
      )
    )
      continue;
    if (v === 'black' || v === 'white') continue;
    return false;
  }
  // Check inline style fill/stroke
  const styleFillMatches = svgContent.matchAll(/fill\s*:\s*([^;"']+)/gi);
  for (const m of styleFillMatches) {
    const v = m[1].toLowerCase().trim();
    if (!v || v === 'none' || v === 'transparent' || v === 'currentcolor') continue;
    if (
      /^#(000|000000|111|111111|222|222222|333|333333|fff|ffffff|eee|eeeeee|ddd|dddddd)$/i.test(v)
    )
      continue;
    if (v === 'black' || v === 'white') continue;
    return false;
  }
  return true;
}

/** Fetch external SVG icon and cache the result */
async function fetchAndCacheSvgIcon(
  url: string
): Promise<{ svg: string; isMonochrome: boolean } | null> {
  if (svgIconCache.has(url)) return svgIconCache.get(url)!;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const svg = await res.text();
    if (!svg.includes('<svg')) return null;
    const isMonochrome = isSvgMonochrome(svg);
    const entry = { svg, isMonochrome };
    svgIconCache.set(url, entry);
    return entry;
  } catch {
    return null;
  }
}

// ── Performance: cache last config to skip redundant mermaid.initialize() ──
let lastConfigJson = '';

// ── Performance: cache AWS icons to avoid refetching ──
let cachedAWSIcons: Record<string, any> | null = null;
let awsIconsPromise: Promise<Record<string, any> | null> | null = null;

const getAWSIcons = async (): Promise<Record<string, any> | null> => {
  if (cachedAWSIcons) return cachedAWSIcons;
  if (awsIconsPromise) return awsIconsPromise;
  awsIconsPromise = fetch('/icons/aws/icons.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      cachedAWSIcons = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      awsIconsPromise = null;
    });
  return awsIconsPromise;
};

// ── Shared diagram type list for validation ──
const DIAGRAM_TYPES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'gantt',
  'pie',
  'gitgraph',
  'journey',
  'timeline',
  'quadrantChart',
  'mindmap',
  'architecture',
  'block',
  'packet',
  'network',
  'sankey',
  'requirement',
  'c4'
] as const;

const DIAGRAM_TYPES_LOWER = DIAGRAM_TYPES.map((t) => t.toLowerCase());

// Register icon packs from static assets and CDN
try {
  mermaid.registerIconPacks([
    {
      name: 'aws',
      loader: async () => {
        const res = await fetch('/icons/aws/icons.json');
        if (!res.ok) throw new Error(`Failed to load AWS icons: ${res.status}`);
        const icons = await res.json();
        return icons;
      }
    },
    {
      name: 'logos',
      loader: async () => {
        const res = await fetch('https://unpkg.com/@iconify-json/logos@1/icons.json');
        if (!res.ok) throw new Error(`Failed to load logos icons: ${res.status}`);
        const icons = await res.json();
        return icons;
      }
    }
  ]);
} catch (e) {
  // Non-fatal: mermaid versions without registerIconPacks or environments without fetch
  // Silently ignore - don't log to console
}

// Inline function to process AWS icons in Mermaid code using cached icons
const processAWSIcons = async (mermaidCode: string): Promise<string> => {
  try {
    const iconsData = await getAWSIcons();
    if (!iconsData) {
      return processStaticIconsFallback(mermaidCode);
    }

    const iconMap: Record<string, string> = {};

    if (iconsData.icons) {
      for (const [iconName] of Object.keys(iconsData.icons)) {
        const serviceName = iconName.replace(/^aws[:_]/, '').replace(/-/g, ' ');
        iconMap[serviceName] = `/icons/aws/${iconName}.svg`;
      }
    }

    let processedCode = mermaidCode;
    const iconPattern = /(\w+)@\{\s*icon:\s*["']aws:([^"']+)["']\s*}/g;

    processedCode = processedCode.replace(iconPattern, (match, nodeId, serviceName) => {
      const iconUrl = iconMap[serviceName] || iconMap[`aws-${serviceName}`];

      if (iconUrl) {
        return `${nodeId}["<img src='${iconUrl}' width='50' height='50' style='vertical-align: middle; margin-right: 8px;'/>"]`;
      } else {
        for (const [availableIconName, url] of Object.entries(iconMap)) {
          if (
            availableIconName.includes(serviceName) ||
            serviceName.includes(availableIconName.replace('aws-', ''))
          ) {
            return `${nodeId}["<img src='${url}' width='50' height='50' style='vertical-align: middle; margin-right: 8px;'/>"]`;
          }
        }
      }

      return match;
    });

    return processedCode;
  } catch (error) {
    return processStaticIconsFallback(mermaidCode);
  }
};

// Fallback function with predefined icons
const processStaticIconsFallback = (mermaidCode: string): string => {
  try {
    // Map of AWS service names to static icon URLs (updated to use existing SVG files)
    const iconMap: Record<string, string> = {
      'storage-storage-s3': '/icons/aws/storage/storage-s3.svg',
      'compute-compute-ec2': '/icons/aws/compute/compute-ec2.svg',
      'compute-lambda': '/icons/aws/compute/lambda.svg',
      'database-database-rds': '/icons/aws/database/database-rds.svg',
      'database-database-dynamodb': '/icons/aws/database/database-dynamodb.svg',
      'database-aurora': '/icons/aws/database/aurora.svg',
      'networking-content-delivery-cloudfront':
        '/icons/aws/networking-content-delivery/network-cloudfront.svg',
      'networking-content-delivery-elb': '/icons/aws/networking-content-delivery/network-elb.svg',
      'app-integration-api-gateway': '/icons/aws/app-integration/api-gateway.svg',
      'security-identity-compliance-iam':
        '/icons/aws/security-identity-compliance/iam-identity-center.svg',
      'networking-content-delivery-vpc-lattice':
        '/icons/aws/networking-content-delivery/vpc-lattice.svg',
      'analytics-analytics-athena': '/icons/aws/analytics/analytics-athena.svg'
    };

    // Replace @{ icon: "aws:service" } syntax with actual icon HTML
    let processedCode = mermaidCode;

    // Match the pattern: nodeId@{ icon: "aws:service-name" }
    const iconPattern = /(\w+)@\{\s*icon:\s*["']aws:([^"']+)["']\s*}/g;

    processedCode = processedCode.replace(iconPattern, (match, nodeId, serviceName) => {
      const iconUrl = iconMap[serviceName];
      if (iconUrl) {
        // Replace with HTML image syntax
        return `${nodeId}["<img src='${iconUrl}' width='50' height='50' style='vertical-align: middle; margin-right: 8px;'/>"]`;
      }
      return match; // Return original if no icon found
    });

    return processedCode;
  } catch (error) {
    return mermaidCode; // Return original code if injection fails
  }
};

export const render = async (
  config: MermaidConfig,
  code: string,
  id: string
): Promise<RenderResult> => {
  await init;

  // Icon processing is now handled after AI response in Chat component
  const processedCode = code;

  // Handle empty or invalid code
  let finalCode = processedCode;
  const isEmptyDiagram = !finalCode || finalCode.trim() === '';
  if (isEmptyDiagram) {
    // Return a minimal valid diagram instead of throwing an error
    finalCode = `flowchart TD
    A[No diagram content]`;
  }

  // Consolidated syntax validation + default type insertion (single pass)
  let enhancedCode = finalCode.trim();
  const lines = enhancedCode.split('\n');
  const firstNonCommentLine = lines.find(
    (line) => !line.trim().startsWith('%%') && line.trim().length > 0
  );

  if (firstNonCommentLine) {
    const firstLine = firstNonCommentLine.trim().toLowerCase();
    const hasValidStart = DIAGRAM_TYPES_LOWER.some((type) => firstLine.startsWith(type));

    if (!hasValidStart) {
      // Default to flowchart if no recognized diagram type
      enhancedCode = `flowchart TD\n${enhancedCode}`;
    }
  }

  // Should be able to call this multiple times without any issues.
  // Ensure DOMPurify allows SVG gradient/defs used by colored icon packs
  // and avoid pre-sanitization path that strips gradients.
  const dp = (config.dompurifyConfig ?? {}) as Record<string, unknown>;
  const isDarkMode =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const mergedConfig: MermaidConfig = {
    ...config,
    // Add custom CSS for subgraph styling — adapt to current theme
    themeCSS: isDarkMode
      ? `
      .cluster rect {
        fill: #64748b !important;
        stroke: #475569 !important;
        stroke-width: 1.5px !important;
        rx: 12px !important;
        ry: 12px !important;
        fill-opacity: 0.12 !important;
      }
      .cluster-label span {
        background: #475569 !important;
        color: #f8fafc !important;
        padding: 4px 14px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
      }
    `
      : `
      .cluster rect {
        fill: #94a3b8 !important;
        stroke: #cbd5e1 !important;
        stroke-width: 1.5px !important;
        rx: 12px !important;
        ry: 12px !important;
        fill-opacity: 0.12 !important;
      }
      .cluster-label span {
        background: #e2e8f0 !important;
        color: #1e293b !important;
        padding: 4px 14px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
      }
    `,
    // Disable all animations and transitions
    flowchart: {
      ...config.flowchart,
      htmlLabels: true,
      curve: 'basis',
      subGraph: {
        margin: 20,
        useMaxWidth: true
      }
    },
    // Disable animations for all diagram types
    sequence: {
      ...config.sequence,
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: false,
      bottomMarginAdj: 1,
      useMaxWidth: true,
      rightAngles: false,
      showSequenceNumbers: false
    },
    // Security and performance settings
    dompurifyConfig: {
      ...dp,
      USE_PROFILES: {
        ...((dp.USE_PROFILES as Record<string, unknown>) ?? {}),
        svg: true,
        svgFilters: true
      },
      ADD_TAGS: [
        ...new Set([
          ...((dp.ADD_TAGS as unknown[]) ?? []),
          'svg',
          'g',
          'path',
          'defs',
          'linearGradient',
          'stop',
          'clipPath',
          'mask',
          'pattern',
          'title',
          'desc',
          'rect',
          'circle',
          'ellipse',
          'polygon',
          'polyline',
          'line'
        ])
      ],
      ADD_ATTR: [
        ...new Set([
          ...((dp.ADD_ATTR as unknown[]) ?? []),
          'fill',
          'stroke',
          'stroke-width',
          'stroke-linecap',
          'stroke-linejoin',
          'stroke-opacity',
          'fill-opacity',
          'clip-path',
          'mask',
          'filter',
          'gradientUnits',
          'gradientTransform',
          'x1',
          'y1',
          'x2',
          'y2',
          'offset',
          'stop-color',
          'stop-opacity',
          'style',
          'id',
          'class',
          'viewBox',
          'xmlns',
          'xmlns:xlink',
          'xml:space',
          'xlink:href'
        ])
      ]
    } as unknown as MermaidConfig['dompurifyConfig']
  } as MermaidConfig;

  // Only re-initialize if config actually changed (avoids expensive reinit on every render)
  const configJson = JSON.stringify(mergedConfig);
  if (configJson !== lastConfigJson) {
    // Suppress all console output during initialize (mermaid logs version info)
    const _log = console.log;
    const _err = console.error;
    const _warn = console.warn;
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    try {
      mermaid.initialize(mergedConfig);
    } finally {
      console.log = _log;
      console.error = _err;
      console.warn = _warn;
    }
    lastConfigJson = configJson;
  }

  // Pre-validate: parse first so we never render an error SVG into the DOM
  // Skip validation for empty diagrams (they have placeholder content)
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;

  if (!isEmptyDiagram) {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    try {
      await mermaid.parse(enhancedCode);
    } catch (parseErr: any) {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
      throw new Error(parseErr?.message || 'Syntax error in diagram');
    }
  }

  // Render into a hidden off-screen container so error SVGs are never visible
  let offscreen = document.getElementById('mermaid-offscreen');
  if (!offscreen) {
    offscreen = document.createElement('div');
    offscreen.id = 'mermaid-offscreen';
    offscreen.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
    document.body.appendChild(offscreen);
  }

  let result;
  try {
    result = await mermaid.render(id, enhancedCode, offscreen);
  } finally {
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;
  }

  // Always clean up the temporary DOM element mermaid creates
  const tempDiv = document.getElementById(`d${id}`);
  if (tempDiv) tempDiv.remove();
  // Also clean offscreen children
  if (offscreen) offscreen.innerHTML = '';

  // Safety check: if mermaid somehow still returned an error SVG, catch it
  // Skip this check for empty diagrams (they show placeholder content)
  if (
    !isEmptyDiagram &&
    typeof result.svg === 'string' &&
    (result.svg.includes('Syntax error in text') ||
      result.svg.includes('aria-roledescription="error"') ||
      result.svg.includes('class="error-icon"') ||
      result.svg.includes('class="error-text"'))
  ) {
    const errorDiv = document.getElementById(`d${id}`);
    if (errorDiv) errorDiv.remove();
    throw new Error('Syntax error in diagram');
  }

  // Remove icon-related CSS that overrides colors and inject AWS icons
  if (typeof result.svg === 'string') {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(result.svg, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg') as SVGSVGElement;
    if (svgElement) {
      // Remove Mermaid CSS that forces monochrome icons
      removeIconStylesFromSvg(svgElement, document.documentElement?.classList?.contains('dark'));
      // Inject AWS icons
      injectAWSIcons(svgElement);
      // Update the result with the modified SVG
      result.svg = new XMLSerializer().serializeToString(svgElement);
    }
  }

  return result;
};

export const parse = async (code: string) => {
  // Skip parsing for empty diagrams
  if (!code || !code.trim()) {
    return { diagramType: 'flowchart' };
  }

  // Suppress console.error/warn during mermaid.parse to eliminate "Syntax error in text" and "mermaid version" messages
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};

  try {
    return await mermaid.parse(code);
  } finally {
    // Restore console methods
    console.error = originalError;
    console.warn = originalWarn;
  }
};

export const standardizeDiagramType = (diagramType: string) => {
  switch (diagramType) {
    case 'class':
    case 'classDiagram': {
      return 'classDiagram';
    }
    case 'graph':
    case 'flowchart':
    case 'flowchart-elk':
    case 'flowchart-v2': {
      return 'flowchart';
    }
    default: {
      return diagramType;
    }
  }
};

type DiagramDefinition = (typeof diagramData)[number];

const isValidDiagram = (diagram: DiagramDefinition): diagram is Required<DiagramDefinition> => {
  return Boolean(diagram.name && diagram.examples && diagram.examples.length > 0);
};

export const getSampleDiagrams = () => {
  const diagrams = diagramData
    .filter((d) => isValidDiagram(d))
    .map(({ examples, ...rest }) => ({
      ...rest,
      example: examples?.filter(({ isDefault }) => isDefault)[0]
    }));
  const examples: Record<string, string> = {};
  for (const diagram of diagrams) {
    examples[diagram.name.replace(/ (Diagram|Chart|Graph)/, '')] = diagram.example.code;
  }
  return examples;
};

/**
 * Removes icon-related CSS rules from the style tag in the rendered SVG.
 * This function finds the style tag and removes CSS rules targeting .label-icon, .icon-shape, and .image-shape
 * to prevent mermaid CSS from affecting icon appearance.
 */
export const removeIconStylesFromSvg = (
  svgElement: SVGSVGElement,
  forceDarkMode?: boolean
): void => {
  try {
    // Find the style tag inside the SVG
    const styleTag = svgElement.querySelector('style');
    if (!styleTag || !styleTag.textContent) {
      return;
    }

    const cssText = styleTag.textContent;

    // Function to extract complete CSS rules with proper brace matching
    const extractRules = (css: string): string[] => {
      const rules: string[] = [];
      let currentRule = '';
      let braceDepth = 0;

      for (const char of css) {
        currentRule += char;

        if (char === '{') {
          braceDepth++;
        } else if (char === '}') {
          braceDepth--;
          if (braceDepth === 0) {
            rules.push(currentRule.trim());
            currentRule = '';
          }
        }
      }

      return rules;
    };

    // Extract all CSS rules
    const rules = extractRules(cssText);

    // Filter out icon-related rules that force monochrome colors
    const iconSelectors = [
      '.label-icon',
      '.icon-shape',
      '.image-shape',
      '.iconify',
      'svg.icon',
      '.node-icon'
    ];
    const filteredRules = rules.filter((rule) => {
      // Check if rule contains any icon-related selector
      return !iconSelectors.some((selector) => rule.includes(selector));
    });

    // Reconstruct CSS without icon rules
    const cleanedCss = filteredRules.join('');

    // Update the style tag with cleaned CSS
    styleTag.textContent = cleanedCss;

    // Fix icon colors - the key issue is that Mermaid sets fill:currentColor on icon containers
    // We need to remove this and let the embedded SVG colors show through
    const iconContainers = svgElement.querySelectorAll('.label-icon, .icon-shape, .image-shape');

    iconContainers.forEach((container) => {
      // Remove the fill attribute from the container that forces currentColor
      container.removeAttribute('fill');

      // Remove any inline style that might set fill
      const style = container.getAttribute('style');
      if (style) {
        container.setAttribute('style', style.replace(/fill\s*:\s*[^;]+;?/gi, ''));
      }

      // For each child element, preserve its original fill — but only for non-monochrome colors.
      // Monochrome fills (black/white) are left for the theme-aware code to handle.
      const monochromeSet = new Set([
        '#000',
        '#000000',
        '#111',
        '#111111',
        '#1a1a1a',
        '#222',
        '#222222',
        '#333',
        '#333333',
        '#fff',
        '#ffffff',
        '#eee',
        '#eeeeee',
        '#ddd',
        '#dddddd'
      ]);
      container.querySelectorAll('*').forEach((child) => {
        const fill = child.getAttribute('fill');
        // If it has a gradient fill (url(#...)), add inline style to preserve it
        if (fill && fill.startsWith('url(')) {
          child.setAttribute(
            'style',
            `fill: ${fill} !important; ${child.getAttribute('style') || ''}`
          );
        }
        // If it has a NON-monochrome color fill (#1B660F, etc.), add inline style to preserve it
        else if (fill && fill.startsWith('#') && !monochromeSet.has(fill.toLowerCase())) {
          child.setAttribute(
            'style',
            `fill: ${fill} !important; ${child.getAttribute('style') || ''}`
          );
        }
        // Remove currentColor fills so embedded SVG colors show through
        else if (fill === 'currentColor') {
          child.removeAttribute('fill');
        }
        // Monochrome fills (#000, #fff, etc.) — leave the attribute but don't add !important
        // so the theme-aware code can override them
      });
    });
    // Make web-icon node background shapes transparent — remove the visible rectangle
    // around nodes that use @{ img: "..." } (web icons with <image> tags).
    // IMPORTANT: Do NOT touch .icon-shape nodes — those contain inline <svg> icons
    // whose fills must be preserved.
    const hideNodeBg = (shape: Element) => {
      if (shape.classList.contains('graphini-selection-rect')) return;
      if (shape.closest('foreignObject') || shape.closest('marker') || shape.closest('defs'))
        return;
      const fill = shape.getAttribute('fill');
      if (fill && fill !== 'none' && fill !== 'transparent') {
        shape.setAttribute('fill', 'none');
        shape.setAttribute('fill-opacity', '0');
        shape.setAttribute(
          'style',
          (shape.getAttribute('style') || '').replace(/fill\s*:[^;]+;?/gi, '') +
            '; fill: none !important; fill-opacity: 0 !important;'
        );
      }
      const stroke = shape.getAttribute('stroke');
      if (stroke && stroke !== 'none' && stroke !== 'transparent') {
        shape.setAttribute('stroke', 'none');
        shape.setAttribute('stroke-opacity', '0');
        shape.setAttribute(
          'style',
          (shape.getAttribute('style') || '') + ' stroke: none !important;'
        );
      }
    };
    // Only target .image-shape nodes (web icons with <image> tags)
    svgElement.querySelectorAll('.image-shape').forEach((node) => {
      node.querySelectorAll('path, rect, circle, polygon, ellipse').forEach(hideNodeBg);
    });
    // Also handle generic .node elements that contain <image> tags
    svgElement.querySelectorAll('.node').forEach((node) => {
      if (!node.querySelector('image')) return;
      if (node.classList.contains('image-shape') || node.classList.contains('icon-shape')) return;
      node.querySelectorAll('path, rect, circle, polygon, ellipse').forEach(hideNodeBg);
    });

    // Fix icon node label text color — when backgrounds are hidden, label text
    // may be white (for dark-themed nodes) which is invisible in light mode,
    // or black which is invisible in dark mode.
    // Only fix text that would actually be invisible against the page background.
    const isDark = forceDarkMode ?? document.documentElement.classList.contains('dark');
    const isInvisibleColor = (color: string): boolean => {
      if (!color) return false;
      const c = color.toLowerCase().replace(/\s/g, '');
      if (isDark) {
        // In dark mode, very dark colors are invisible
        return (
          c === '#000' ||
          c === '#000000' ||
          c === '#0a0a0a' ||
          c === '#111' ||
          c === '#111111' ||
          c === 'rgb(0,0,0)' ||
          c === 'black'
        );
      } else {
        // In light mode, very light colors are invisible
        return (
          c === '#fff' ||
          c === '#ffffff' ||
          c === '#fafafa' ||
          c === '#f5f5f5' ||
          c === 'rgb(255,255,255)' ||
          c === 'white'
        );
      }
    };
    const fixLabelTextColor = (node: Element) => {
      const textEls = node.querySelectorAll(
        'text, tspan, .nodeLabel, .label, foreignObject span, foreignObject div, foreignObject p'
      );
      const themeColor = isDark ? '#e2e8f0' : '#1e293b';
      textEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computed = window.getComputedStyle(htmlEl);
        const fill = htmlEl.getAttribute('fill') || computed.fill || '';
        const color = computed.color || '';
        // Only override if the current color would be invisible
        if (isInvisibleColor(fill) || isInvisibleColor(color)) {
          htmlEl.style.setProperty('fill', themeColor, 'important');
          htmlEl.style.setProperty('color', themeColor, 'important');
        }
      });
    };
    // Apply to .image-shape and icon-containing .node elements
    svgElement.querySelectorAll('.image-shape').forEach(fixLabelTextColor);
    svgElement.querySelectorAll('.icon-shape').forEach(fixLabelTextColor);
    svgElement.querySelectorAll('.node').forEach((node) => {
      if (
        node.querySelector('image') ||
        node.querySelector('.icon-shape') ||
        node.querySelector('.label-icon')
      ) {
        fixLabelTextColor(node);
      }
    });

    // Theme-aware icon coloring: make colorless icons switch with the theme.
    // Icons with gradients, explicit fills (like fill="#4D27AA"), or toolbar-applied filters are left alone.
    // Dark mode: invert(1) on colorless icons so black→white.
    // Light mode: set fill to currentColor on colorless SVG shapes so they use the text color.
    const isDarkMode = isDark;
    const noColorValues = new Set(['', 'none', 'transparent', 'currentcolor']);
    const monochromeColors = new Set([
      '#000',
      '#000000',
      '#111',
      '#111111',
      '#1a1a1a',
      '#222',
      '#222222',
      '#333',
      '#333333',
      'black',
      '#fff',
      '#ffffff',
      '#eee',
      '#eeeeee',
      '#ddd',
      '#dddddd',
      'white'
    ]);

    // Check if an inline SVG icon has NO meaningful color (no fills, no gradients)
    const hasNoColor = (el: Element): boolean => {
      // If it has any gradient definitions, it has color
      if (el.querySelector('linearGradient, radialGradient')) return false;
      // If it already has a filter applied (e.g. from toolbar palette), skip
      const existingFilter = (el as HTMLElement).style?.filter;
      if (existingFilter && existingFilter !== '' && existingFilter !== 'none') return false;

      const shapes = el.querySelectorAll('path, rect, circle, polygon, ellipse, line, use');
      for (const child of shapes) {
        // Check fill attribute
        const f = (child.getAttribute('fill') || '').toLowerCase().trim();
        if (f && f.startsWith('url(')) return false; // gradient reference
        if (f && !noColorValues.has(f) && !monochromeColors.has(f)) return false;
        // Check inline style fill (may have !important from removeIconStylesFromSvg)
        const styleStr = (child.getAttribute('style') || '').toLowerCase();
        const fillMatch = styleStr.match(/fill\s*:\s*([^;!]+)/i);
        if (fillMatch) {
          const sv = fillMatch[1].trim();
          if (sv && sv.startsWith('url(')) return false;
          if (sv && !noColorValues.has(sv) && !monochromeColors.has(sv)) return false;
        }
        // Check stroke for color
        const stroke = (child.getAttribute('stroke') || '').toLowerCase().trim();
        if (stroke && !noColorValues.has(stroke) && !monochromeColors.has(stroke)) return false;
        const strokeMatch = styleStr.match(/stroke\s*:\s*([^;!]+)/i);
        if (strokeMatch) {
          const ssv = strokeMatch[1].trim();
          if (ssv && !noColorValues.has(ssv) && !monochromeColors.has(ssv)) return false;
        }
      }
      return true; // no color fills found, or only monochrome fills
    };

    // Helper: extract mermaid node name from an SVG element's closest node group ID
    const getNodeNameFromEl = (el: Element): string => {
      const nodeGroup = el.closest('[id*="flowchart-"], [id*="stateDiagram-"], .node');
      if (!nodeGroup) return '';
      const id = nodeGroup.getAttribute('id') || '';
      // Pattern: "flowchart-<NodeName>-<index>"
      const m = id.match(/^(?:flowchart|stateDiagram)-(.+?)-\d+$/);
      return m ? m[1] : id;
    };

    // Apply theme-aware coloring to colorless inline SVG icons
    const applyThemeColor = (container: Element) => {
      if (isDarkMode) {
        (container as HTMLElement).style.setProperty('filter', 'invert(1)', 'important');
        container.setAttribute('data-theme-switchable', 'true');
      } else {
        // Light mode: replace monochrome fills with currentColor using !important
        // to override the earlier !important inline styles from removeIconStylesFromSvg
        container
          .querySelectorAll('path, rect, circle, polygon, ellipse, line, use')
          .forEach((child) => {
            const f = (child.getAttribute('fill') || '').toLowerCase().trim();
            if (!f || noColorValues.has(f) || monochromeColors.has(f)) {
              (child as HTMLElement).style.setProperty('fill', 'currentColor', 'important');
              child.setAttribute('fill', 'currentColor');
            }
            const stroke = (child.getAttribute('stroke') || '').toLowerCase().trim();
            if (stroke && monochromeColors.has(stroke)) {
              (child as HTMLElement).style.setProperty('stroke', 'currentColor', 'important');
              child.setAttribute('stroke', 'currentColor');
            }
          });
        container.setAttribute('data-theme-switchable', 'true');
      }
    };

    // Inline SVG icons (.icon-shape, .label-icon)
    svgElement.querySelectorAll('.icon-shape, .label-icon').forEach((container) => {
      const nodeName = getNodeNameFromEl(container);
      // If this icon was colored by the toolbar, re-apply the toolbar color instead
      if (nodeName && coloredIconNodes.has(nodeName)) {
        (container as HTMLElement).style.filter = coloredIconNodes.get(nodeName)!;
        return;
      }
      if (hasNoColor(container)) {
        applyThemeColor(container);
      }
    });

    // External image icons — handle both data URIs and external URLs
    const imageNodes = svgElement.querySelectorAll('.image-shape, .node');
    const externalIconPromises: Promise<void>[] = [];
    imageNodes.forEach((node) => {
      const img = node.querySelector('image');
      if (!img) return;
      const nodeName = getNodeNameFromEl(node);
      // If this icon was colored by the toolbar, re-apply the toolbar color
      if (nodeName && coloredIconNodes.has(nodeName)) {
        (img as unknown as HTMLElement).style.filter = coloredIconNodes.get(nodeName)!;
        return;
      }
      const href = img.getAttribute('href') || img.getAttribute('xlink:href') || '';

      if (href.startsWith('data:image/svg+xml')) {
        // Data URI SVG — check inline
        try {
          const decoded = decodeURIComponent(href.split(',')[1] || '');
          if (!isSvgMonochrome(decoded)) return; // has color, don't touch
        } catch {
          return;
        }
        if (isDarkMode) {
          (img as unknown as HTMLElement).style.setProperty('filter', 'invert(1)', 'important');
        } else {
          (img as unknown as HTMLElement).style.removeProperty('filter');
        }
        img.setAttribute('data-theme-switchable', 'true');
      } else if (href.includes('.svg')) {
        // SVG URL (external or relative like /icons/*.svg) — fetch, detect, and apply theme
        const promise = fetchAndCacheSvgIcon(href).then((cached) => {
          if (!cached) return;
          if (!cached.isMonochrome) {
            // Colored icon — ensure NO filter is applied
            (img as unknown as HTMLElement).style.removeProperty('filter');
            return;
          }
          // Monochrome icon — convert to data URI and apply theme
          const dataUri = 'data:image/svg+xml,' + encodeURIComponent(cached.svg);
          img.setAttribute('href', dataUri);
          if (img.hasAttribute('xlink:href')) img.setAttribute('xlink:href', dataUri);
          if (isDarkMode) {
            (img as unknown as HTMLElement).style.setProperty('filter', 'invert(1)', 'important');
          } else {
            (img as unknown as HTMLElement).style.removeProperty('filter');
          }
          img.setAttribute('data-theme-switchable', 'true');
        });
        externalIconPromises.push(promise);
      }
    });
    // Wait for all external icon fetches to complete
    if (externalIconPromises.length > 0) {
      Promise.all(externalIconPromises).catch(() => {});
    }
  } catch (error) {
    // Failed to remove icon styles from SVG - continue without cleanup
  }
};

/**
 * Re-process icon theme coloring on an existing SVG without full re-render.
 * Called when theme changes to update icon colors in-place.
 */
export const reprocessIconTheme = (svgElement: SVGSVGElement, isDark: boolean): void => {
  try {
    const noColorValues = new Set(['', 'none', 'transparent', 'currentcolor']);
    const monochromeColors = new Set([
      '#000',
      '#000000',
      '#111',
      '#111111',
      '#1a1a1a',
      '#222',
      '#222222',
      '#333',
      '#333333',
      'black',
      '#fff',
      '#ffffff',
      '#eee',
      '#eeeeee',
      '#ddd',
      '#dddddd',
      'white'
    ]);

    // Re-process inline SVG icons
    svgElement.querySelectorAll('.icon-shape, .label-icon').forEach((container) => {
      // Skip toolbar-colored icons
      const nodeGroup = container.closest('[id*="flowchart-"], [id*="stateDiagram-"], .node');
      if (nodeGroup) {
        const id = nodeGroup.getAttribute('id') || '';
        const m = id.match(/^(?:flowchart|stateDiagram)-(.+?)-\d+$/);
        const nodeName = m ? m[1] : id;
        if (nodeName && coloredIconNodes.has(nodeName)) return;
      }

      // Check if this icon has real colors (gradients, non-monochrome fills)
      if (container.querySelector('linearGradient, radialGradient')) return;
      const existingFilter = (container as HTMLElement).style?.filter;
      // Allow overriding previous invert filter
      if (
        existingFilter &&
        existingFilter !== '' &&
        existingFilter !== 'none' &&
        !existingFilter.includes('invert')
      )
        return;

      // Check child shapes for non-monochrome colors
      let hasColor = false;
      const shapes = container.querySelectorAll('path, rect, circle, polygon, ellipse, line, use');
      for (const child of shapes) {
        const f = (child.getAttribute('fill') || '').toLowerCase().trim();
        if (f && f.startsWith('url(')) {
          hasColor = true;
          break;
        }
        // Check inline style for non-monochrome !important fills
        const styleStr = (child.getAttribute('style') || '').toLowerCase();
        const fillMatch = styleStr.match(/fill\s*:\s*([^;!]+)/i);
        if (fillMatch) {
          const sv = fillMatch[1].trim();
          if (sv && sv.startsWith('url(')) {
            hasColor = true;
            break;
          }
          if (sv && !noColorValues.has(sv) && !monochromeColors.has(sv) && sv !== 'currentcolor') {
            hasColor = true;
            break;
          }
        }
        if (f && !noColorValues.has(f) && !monochromeColors.has(f)) {
          hasColor = true;
          break;
        }
      }
      if (hasColor) return;

      // Apply theme color
      if (isDark) {
        (container as HTMLElement).style.setProperty('filter', 'invert(1)', 'important');
        // Remove any currentColor overrides from light mode
        shapes.forEach((child) => {
          const f = (child.getAttribute('fill') || '').toLowerCase().trim();
          if (f === 'currentcolor') {
            child.removeAttribute('fill');
            (child as HTMLElement).style.removeProperty('fill');
          }
        });
      } else {
        // Remove invert filter
        (container as HTMLElement).style.removeProperty('filter');
        // Set monochrome fills to currentColor
        shapes.forEach((child) => {
          const f = (child.getAttribute('fill') || '').toLowerCase().trim();
          if (!f || noColorValues.has(f) || monochromeColors.has(f)) {
            (child as HTMLElement).style.setProperty('fill', 'currentColor', 'important');
            child.setAttribute('fill', 'currentColor');
          }
          const stroke = (child.getAttribute('stroke') || '').toLowerCase().trim();
          if (stroke && monochromeColors.has(stroke)) {
            (child as HTMLElement).style.setProperty('stroke', 'currentColor', 'important');
            child.setAttribute('stroke', 'currentColor');
          }
        });
      }
    });

    // Re-process external image icons (data URIs + external URLs)
    svgElement.querySelectorAll('.image-shape, .node').forEach((node) => {
      const img = node.querySelector('image');
      if (!img) return;
      const nodeGroup = node.closest('[id*="flowchart-"], [id*="stateDiagram-"], .node') || node;
      const id = nodeGroup.getAttribute('id') || '';
      const m = id.match(/^(?:flowchart|stateDiagram)-(.+?)-\d+$/);
      const nodeName = m ? m[1] : id;
      if (nodeName && coloredIconNodes.has(nodeName)) return;

      const href = img.getAttribute('href') || img.getAttribute('xlink:href') || '';
      if (href.startsWith('data:image/svg+xml')) {
        try {
          const decoded = decodeURIComponent(href.split(',')[1] || '');
          if (!isSvgMonochrome(decoded)) {
            // Colored icon — remove any filter
            (img as unknown as HTMLElement).style.removeProperty('filter');
            return;
          }
        } catch {
          return;
        }

        if (isDark) {
          (img as unknown as HTMLElement).style.setProperty('filter', 'invert(1)', 'important');
        } else {
          (img as unknown as HTMLElement).style.removeProperty('filter');
        }
      } else if (href.includes('.svg')) {
        // SVG URL (external or relative like /icons/*.svg) — use cache or fetch
        const cached = svgIconCache.get(href);
        if (cached) {
          if (!cached.isMonochrome) {
            (img as unknown as HTMLElement).style.removeProperty('filter');
            return;
          }
          // Convert to data URI and apply theme
          const dataUri = 'data:image/svg+xml,' + encodeURIComponent(cached.svg);
          img.setAttribute('href', dataUri);
          if (img.hasAttribute('xlink:href')) img.setAttribute('xlink:href', dataUri);
          if (isDark) {
            (img as unknown as HTMLElement).style.setProperty('filter', 'invert(1)', 'important');
          } else {
            (img as unknown as HTMLElement).style.removeProperty('filter');
          }
        } else {
          // Not cached yet — fetch async
          fetchAndCacheSvgIcon(href)
            .then((entry) => {
              if (!entry) return;
              if (!entry.isMonochrome) {
                (img as unknown as HTMLElement).style.removeProperty('filter');
                return;
              }
              const dataUri = 'data:image/svg+xml,' + encodeURIComponent(entry.svg);
              img.setAttribute('href', dataUri);
              if (img.hasAttribute('xlink:href')) img.setAttribute('xlink:href', dataUri);
              if (isDark) {
                (img as unknown as HTMLElement).style.setProperty(
                  'filter',
                  'invert(1)',
                  'important'
                );
              } else {
                (img as unknown as HTMLElement).style.removeProperty('filter');
              }
            })
            .catch(() => {});
        }
      }
    });

    // Re-fix icon node label text colors on theme change
    // Only fix text that would be invisible against the page background
    const themeColor = isDark ? '#e2e8f0' : '#1e293b';
    const isInvisible = (color: string): boolean => {
      if (!color) return false;
      const c = color.toLowerCase().replace(/\s/g, '');
      if (isDark) {
        return (
          c === '#000' ||
          c === '#000000' ||
          c === '#0a0a0a' ||
          c === '#111' ||
          c === '#111111' ||
          c === 'rgb(0,0,0)' ||
          c === 'black'
        );
      } else {
        return (
          c === '#fff' ||
          c === '#ffffff' ||
          c === '#fafafa' ||
          c === '#f5f5f5' ||
          c === 'rgb(255,255,255)' ||
          c === 'white'
        );
      }
    };
    const fixLabelText = (node: Element) => {
      node
        .querySelectorAll(
          'text, tspan, .nodeLabel, .label, foreignObject span, foreignObject div, foreignObject p'
        )
        .forEach((el) => {
          const htmlEl = el as HTMLElement;
          const computed = window.getComputedStyle(htmlEl);
          const fill = htmlEl.getAttribute('fill') || computed.fill || '';
          const color = computed.color || '';
          if (isInvisible(fill) || isInvisible(color)) {
            htmlEl.style.setProperty('fill', themeColor, 'important');
            htmlEl.style.setProperty('color', themeColor, 'important');
          }
        });
    };
    svgElement.querySelectorAll('.image-shape').forEach(fixLabelText);
    svgElement.querySelectorAll('.icon-shape').forEach(fixLabelText);
    svgElement.querySelectorAll('.node').forEach((node) => {
      if (
        node.querySelector('image') ||
        node.querySelector('.icon-shape') ||
        node.querySelector('.label-icon')
      ) {
        fixLabelText(node);
      }
    });
  } catch {
    // Silently fail
  }
};
