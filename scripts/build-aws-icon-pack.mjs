#!/usr/bin/env node
/**
 * Build an Iconify-style icons.json for AWS icons under static/icons/aws.
 *
 * Output: static/icons/aws/icons.json
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AWS_ICONS_DIR = path.join(ROOT, 'static', 'icons', 'aws');
const OUTPUT_FILE = path.join(AWS_ICONS_DIR, 'icons.json');

/** Recursively collect all SVG file paths under a directory */
async function collectSvgs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectSvgs(full);
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) return [full];
      return [];
    })
  );
  return files.flat();
}

/** Extract inner SVG body and size from raw SVG content */
function parseSvg(svgText) {
  // Normalize whitespace
  const text = svgText.replace(/\r/g, '');

  // Extract opening <svg ...> tag
  const svgOpenMatch = text.match(/<svg\b[^>]*>/i);
  const svgCloseIndex = text.lastIndexOf('</svg>');
  if (!svgOpenMatch || svgCloseIndex === -1) {
    return { body: text.trim(), width: undefined, height: undefined };
  }
  const openTag = svgOpenMatch[0];
  const startOfContent = svgOpenMatch.index + openTag.length;
  const body = text.substring(startOfContent, svgCloseIndex).trim();

  // Get size from viewBox or width/height
  let width, height;
  const viewBoxMatch = openTag.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/);
    if (parts.length === 4) {
      const w = Number(parts[2]);
      const h = Number(parts[3]);
      if (!Number.isNaN(w) && !Number.isNaN(h)) {
        width = w;
        height = h;
      }
    }
  }
  if (!width || !height) {
    const wMatch = openTag.match(/\bwidth\s*=\s*"(\d+(?:\.\d+)?)"/i);
    const hMatch = openTag.match(/\bheight\s*=\s*"(\d+(?:\.\d+)?)"/i);
    if (wMatch && hMatch) {
      width = Number(wMatch[1]);
      height = Number(hMatch[1]);
    }
  }

  return { body, width, height };
}

function toIconName(absPath) {
  const rel = path.relative(AWS_ICONS_DIR, absPath).replace(/\\/g, '/');
  // e.g. compute/lambda.svg -> compute-lambda
  const noExt = rel.replace(/\.svg$/i, '');
  return noExt.replace(/\//g, '-');
}

async function main() {
  // Check if the new flat icon index already exists — skip legacy AWS build
  const flatIndex = path.join(ROOT, 'static', 'icons', 'index.json');
  try {
    await fs.access(flatIndex);
    console.log(`Icon index already exists at ${flatIndex} — skipping legacy AWS icon pack build.`);
    return;
  } catch {
    // index.json doesn't exist, try legacy build
  }

  try {
    await fs.access(AWS_ICONS_DIR);
  } catch {
    console.log(
      `AWS icons directory not found: ${AWS_ICONS_DIR} — skipping (icons are now flat in /static/icons/).`
    );
    return;
  }

  const files = await collectSvgs(AWS_ICONS_DIR);
  const icons = {};
  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const { body, width, height } = parseSvg(raw);
      const name = toIconName(file);
      const iconDef = { body };
      if (width && height) {
        iconDef.width = width;
        iconDef.height = height;
      }
      icons[name] = iconDef;
    } catch (e) {
      console.warn(`Failed to parse ${file}:`, e?.message ?? e);
    }
  }

  // Add common shorthand aliases -> point to existing icons
  const aliases = buildAliases(icons);

  const out = {
    prefix: 'aws',
    icons,
    aliases,
    // Hint to Iconify renderers that this collection contains colored icons.
    info: { name: 'AWS Architecture Icons', palette: true }
  };
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(out));
  console.log(`Generated ${OUTPUT_FILE} with ${Object.keys(icons).length} icons.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

function buildAliases(icons) {
  const has = (name) => Object.prototype.hasOwnProperty.call(icons, name);

  // Heuristic to resolve a desired target name to an actual key in `icons`
  const resolveTo = (desired) => {
    if (has(desired)) return desired;
    const keys = Object.keys(icons);
    const parts = desired.split('-');
    if (parts.length >= 2) {
      const scope = parts[0];
      const tail = parts.slice(1).join('-');
      // Prefer keys that start with scope- and end with -tail
      const scopedEnd = keys.filter((k) => k.startsWith(scope + '-') && k.endsWith('-' + tail));
      if (scopedEnd.length) return shortest(scopedEnd);
      // Otherwise, any key that starts with scope- and contains -tail
      const scopedContains = keys.filter(
        (k) => k.startsWith(scope + '-') && k.includes('-' + tail)
      );
      if (scopedContains.length) return shortest(scopedContains);
    }
    // Fallback: any key that ends with -tail
    const tail = parts[parts.length - 1];
    const endMatches = Object.keys(icons).filter((k) => k.endsWith('-' + tail));
    if (endMatches.length) return shortest(endMatches);
    return undefined;
  };

  const shortest = (arr) => arr.sort((a, b) => a.length - b.length)[0];
  const tryAlias = (from, toDesired) => {
    const to = resolveTo(toDesired);
    return to ? { [from]: { parent: to } } : {};
  };

  // Map of common shorthands -> approximate full icon names (resolved heuristically)
  const map = [
    ['user', 'end-user-computing-workspaces-family'],
    // no direct 'user' icon in this set; skip unless found
    ['network-elb', 'networking-content-delivery-network-elb'],
    ['compute-ec2', 'compute-compute-ec2'],
    ['database-rds', 'database-database-rds'],
    ['database-dynamodb', 'database-database-dynamodb'],
    ['analytics-athena', 'analytics-analytics-athena'],
    ['analytics-kinesis', 'analytics-analytics-kinesis'],
    ['analytics-opensearch', 'analytics-analytics-opensearch'],
    ['storage-s3', 'storage-storage-s3'],
    ['management-cloudwatch', 'management-governance-management-cloudwatch'],
    ['networking-content-delivery-cloudfront', 'networking-content-delivery-network-cloudfront'],
    ['media-mediaconvert', 'media-services-media-mediaconvert'],
    ['integration-sns', 'app-integration-integration-sns'],
    ['integration-sqs', 'app-integration-integration-sqs']
  ];

  const aliases = {};
  for (const [shortName, fullName] of map) {
    Object.assign(aliases, tryAlias(shortName, fullName));
  }
  return aliases;
}

// --- helpers ---
function preserveOriginalColors(svgBody) {
  const shapeTags = new Set([
    'path',
    'rect',
    'circle',
    'ellipse',
    'polygon',
    'polyline',
    'line',
    'text',
    'g',
    'use'
  ]);

  return svgBody.replace(/<([a-zA-Z][^\s>/]*)([^>]*)>/g, (full, tagName, attrs) => {
    const tag = tagName.toLowerCase();
    if (!shapeTags.has(tag)) return full; // leave other tags as is (e.g., defs, gradients)

    let styleMatch = attrs.match(/\sstyle=("([^"]*)"|'([^']*)')/);
    let styleValue = styleMatch ? styleMatch[2] || styleMatch[3] : '';

    const grab = (prop) => {
      const m = attrs.match(new RegExp(`\\s${prop}=("([^"]*)"|'([^']*)')`, 'i'));
      return m ? m[2] || m[3] : undefined;
    };
    const removeAttr = (prop) => {
      attrs = attrs.replace(new RegExp(`\\s${prop}=("[^"]*"|'[^']*')`, 'gi'), '');
    };

    const props = [
      'fill',
      'fill-opacity',
      'stroke',
      'stroke-width',
      'stroke-opacity',
      'stroke-linecap',
      'stroke-linejoin'
    ];

    const styleParts = [];
    for (const p of props) {
      const v = grab(p);
      if (v !== undefined) {
        // Only add if not already present in style
        if (!new RegExp(`(^|;|\\s)${p}\\s*:`, 'i').test(styleValue)) {
          styleParts.push(`${p}: ${v}`);
        }
        removeAttr(p);
      }
    }

    if (styleParts.length) {
      const newStyle =
        (styleValue ? styleValue.replace(/;?\s*$/, '; ') : '') + styleParts.join('; ');
      if (styleMatch) {
        // Replace existing style attribute value
        attrs = attrs.replace(styleMatch[0], ` style="${newStyle}"`);
      } else {
        attrs += ` style="${newStyle}"`;
      }
    }

    return `<${tagName}${attrs}>`;
  });
}
