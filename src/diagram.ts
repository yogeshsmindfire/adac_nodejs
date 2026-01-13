import fs from "fs-extra";
import { parseAdac } from "./parseAdac.js";
import { buildElkGraph } from "./buildElkGraph.js";
import { renderSvg } from "./renderSvg.js";


export async function generateDiagram(input: string, output: string): Promise<void> {
  let adac = parseAdac(input);



  const graph = buildElkGraph(adac);
  const svg = await renderSvg(graph);

  await fs.writeFile(output, svg);
  console.log(`✅ Diagram generated: ${output}`);
}
