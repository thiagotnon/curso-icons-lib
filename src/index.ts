import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import { optimize } from 'svgo';

const ICONS_DIR = 'src/assets';
const OUTPUT_DIR = 'src/components/icons';
const INDEX_FILE = 'src/components/index.ts';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function buildIcons() {
  const svgFiles = (await fg(`${ICONS_DIR}/*.svg`)).sort();

  const exportLines: string[] = [`export { type IconProps } from './IconBase';`];

  for (const filePath of svgFiles) {
    const baseName = path.basename(filePath, '.svg');
    const componentName = toPascalCase(baseName);

    const rawSvg = fs.readFileSync(filePath, 'utf-8');
    const optimizedSvg = cleanSvg(rawSvg);
    const viewBox = extractViewBox(optimizedSvg);

    const nodes = extractSvgNodes(optimizedSvg);

    if (nodes.length === 0) {
      console.warn(`No valid SVG nodes found in ${filePath}`);
      continue;
    }

    const componentCode = generateIconComponent(componentName, viewBox, nodes);

    fs.writeFileSync(path.join(OUTPUT_DIR, `${componentName}.tsx`), componentCode);

    exportLines.push(`export {${componentName}} from './icons/${componentName}';`);
  }

  fs.writeFileSync(INDEX_FILE, exportLines.join('\n') + '\n');
}

buildIcons();

function toPascalCase(str: string): string {
  return str.replace(/(^\w|-\w)/g, (match) => match.replace('-', '').toUpperCase());
}

function cleanSvg(svgContent: string): string {
  const result = optimize(svgContent, {
    multipass: true,
    plugins: [
      'removeDimensions',
      'removeStyleElement',
      'removeScriptElement',
      'removeMetadata',
      'removeTitle',
      'removeDesc',
      'removeComments',
      {
        name: 'removeAttrs',
        params: {
          attrs: [
            'class',
            'style',
            'data-name',
            'xmlns',
            'fill-rule',
            'clip-rule',
            'stroke-linecap',
            'stroke-linejoin',
          ],
        },
      },
    ],
  });

  if ('data' in result) return result.data;
  throw new Error('Failed to optimize SVG content');
}

function extractViewBox(svg: string): string {
  return svg.match(/viewBox=["']([\d\s.-]+)['"]/)?.[1] ?? '0 0 24 24';
}

type SvgNode = [string, Record<string, string>];

function extractSvgNodes(svg: string): SvgNode[] {
  const tagRegex = /<(\w+)([^>]*)\/?>/g;

  const attrRegex = /(\w+)=["'](.*?)["']/g;

  const nodes: SvgNode[] = [];
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(svg))) {
    const [_, tag, rawAttrs] = tagMatch;

    if (tag === 'svg') continue;

    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(rawAttrs))) {
      const [_, key, value] = attrMatch;
      attrs[key] = value;
    }

    if ('fill' in attrs) {
      attrs.fill = 'currentColor';
    }

    if (!('stroke' in attrs)) {
      attrs.stroke = 'none';
    }

    nodes.push([tag, attrs]);
  }

  return nodes;
}

export function generateIconComponent(name: string, viewBox: string, nodes: SvgNode[]): string {
  const elements = nodes.map(([tag, attrs]) => `["${tag}", ${JSON.stringify(attrs)}]`).join(',\n');

  return `
import { createElement, ReactElement } from 'react';
import { IconBase, IconProps } from '../IconBase';

const paths = [${elements}] as const;

export const ${name} = (props: IconProps): ReactElement<IconProps> =>
  createElement(
    IconBase,
    { viewBox: "${viewBox}", ...props },
    paths.map(([tag, attrs], i) =>
      createElement(tag, { key: i, ...attrs })
    )
  );
`;
}
