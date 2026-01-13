import fs from 'fs-extra';
import { parseAdac } from './parseAdac.js';
import { buildElkGraph } from './buildElkGraph.js';
import { ElkNode, ElkEdge } from './types.js';
import ELK from 'elkjs';

async function diagnose() {
  const adac = parseAdac('yamls/adac_example_microservices.yaml');
  const graph = buildElkGraph(adac);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elk = new (ELK as any)();
  const layout = await elk.layout(graph);

  // Dump full layout
  await fs.writeFile('diagnose_layout.json', JSON.stringify(layout, null, 2));

  // Simulate Coordinate Calculation
  const nodeAbsPos = new Map<string, { x: number; y: number }>();
  const log: string[] = [];

  const mapNodePositions = (
    node: ElkNode,
    offsetX: number,
    offsetY: number
  ) => {
    const currentX = offsetX + (node.x || 0);
    const currentY = offsetY + (node.y || 0);
    nodeAbsPos.set(node.id, { x: currentX, y: currentY });
    log.push(
      `Node ${node.id}: Rel(${node.x},${node.y}) -> Abs(${currentX},${currentY}) ParentOffset(${offsetX},${offsetY})`
    );
    if (node.children) {
      node.children.forEach((child: ElkNode) =>
        mapNodePositions(child, currentX, currentY)
      );
    }
  };
  mapNodePositions(layout, 0, 0); // Assuming layout is at 0,0 relative to "World"

  const checkEdges = (node: ElkNode) => {
    if (node.edges) {
      node.edges.forEach((edge: ElkEdge) => {
        const containerId = edge.container;
        let containerOffset = { x: 0, y: 0 };
        let containerSource = 'ROOT-DEFAULT';

        if (containerId && nodeAbsPos.has(containerId)) {
          containerOffset = nodeAbsPos.get(containerId)!;
          containerSource = `Container(${containerId})`;
        } else if (nodeAbsPos.has(node.id)) {
          containerOffset = nodeAbsPos.get(node.id)!;
          containerSource = `Node(${node.id})`;
        }

        if (!edge.sections || edge.sections.length === 0) return;

        const start = edge.sections[0].startPoint;
        const absStart = {
          x: start.x + containerOffset.x,
          y: start.y + containerOffset.y,
        };

        log.push(
          `Edge ${edge.id}: Container=${containerId || 'N/A'} Source=${containerSource}. RelStart(${start.x},${start.y}) -> AbsStart(${absStart.x},${absStart.y})`
        );
      });
    }
    if (node.children) node.children.forEach((c) => checkEdges(c));
  };
  checkEdges(layout);

  await fs.writeFile('diagnose_coords.log', log.join('\n'));
  console.log('Diagnosis complete. Check diagnose_coords.log');
}

diagnose().catch(console.error);
