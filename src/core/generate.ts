import fs from 'fs-extra';
import { parseAdac } from '../parsers/adacParser.js';
import { buildElkGraph } from '../graph/elkBuilder.js';
import { renderSvg } from '../renderers/svgRenderer.js';

export async function generateDiagram(
  input: string,
  output: string,
  layoutOverride?: 'elk' | 'dagre'
): Promise<void> {
  const adac = parseAdac(input);

  const graph = buildElkGraph(adac);
  
  // CLI override > YAML config > Default (elk)
  const engine = layoutOverride || adac.layout || 'elk';
  const svg = await renderSvg(graph, engine);

  await fs.writeFile(output, svg);
  console.log(`✅ Diagram generated: ${output}`);
}
