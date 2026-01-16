import fs from 'fs-extra';
import { parseAdac } from '../parsers/adacParser.js';
import { buildElkGraph } from '../graph/elkBuilder.js';
import { renderSvg } from '../renderers/svgRenderer.js';

// New function returning SVG string
export async function generateDiagramSvg(
  inputContent: string,
  layoutOverride?: 'elk' | 'dagre'
): Promise<string> {
  // Use the new parser that accepts content string
  const { parseAdacFromContent } = await import('../parsers/adacParser.js');
  const adac = parseAdacFromContent(inputContent);

  const graph = buildElkGraph(adac);
  
  // CLI override > YAML config > Default (elk)
  const engine = layoutOverride || adac.layout || 'elk';
  return await renderSvg(graph, engine);
}

export async function generateDiagram(
  input: string,
  output: string,
  layoutOverride?: 'elk' | 'dagre'
): Promise<void> {
  const raw = await fs.readFile(input, 'utf8');
  const svg = await generateDiagramSvg(raw, layoutOverride);

  await fs.writeFile(output, svg);
  console.log(`✅ Diagram generated: ${output}`);
}
