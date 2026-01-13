import fs from 'fs-extra';
import { parseAdac } from './parseAdac.js';
import { buildElkGraph } from './buildElkGraph.js';
import ELK from 'elkjs';

async function run() {
  const adac = parseAdac('yamls/adac_example_webapp.yaml');
  const graph = buildElkGraph(adac);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elk = new (ELK as any)();
  const layout = await elk.layout(graph);

  await fs.writeFile('debug_layout.json', JSON.stringify(layout, null, 2));
  console.log('Dumped layout to debug_layout.json');
}

run().catch(console.error);
