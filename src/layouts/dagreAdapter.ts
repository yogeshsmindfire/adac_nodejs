
import dagre from 'dagre';
import { ElkNode, ElkEdge } from '../types.js';

export async function layoutDagre(root: ElkNode): Promise<ElkNode> {
  const g = new dagre.graphlib.Graph({ compound: true });

  g.setGraph({
    rankdir: 'LR',
    align: 'DL', // UL, UR, DL, DR
    nodesep: 60,
    ranksep: 80,
    edgesep: 20,
    marginx: 40,
    marginy: 40,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Map to find nodes easily by ID to update them later
  const nodeMap = new Map<string, ElkNode>();
  const parentMap = new Map<string, string>();

  function traverse(node: ElkNode, parentId?: string) {
    const isRoot = node.id === root.id;
    
    // We strictly map ELK hierarchy to Dagre.
    // However, if we make the ELK root a node in Dagre, it draws a box around everything.
    // If we skip it, its children become top-level nodes in Dagre.
    // Let's TRY skipping the root node itself in Dagre, only adding its children.
    
    if (!isRoot) {
        nodeMap.set(node.id, node);

        const isContainer = node.children && node.children.length > 0;
        // Sanitize ID
        if (!node.id) return; 
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodeConfig: any = {
          label: node.id
        };
        
        if (!isContainer) {
          nodeConfig.width = node.width || 80;
          nodeConfig.height = node.height || 60;
        }
        
        g.setNode(node.id, nodeConfig);

        // Only set parent if it is NOT the root
        // If parentId is root.id, we don't set it in Dagre (making this node top-level)
        if (parentId && parentId !== root.id) {
          g.setParent(node.id, parentId);
          parentMap.set(node.id, parentId);
        }
    }

    if (node.children) {
      node.children.forEach(child => traverse(child, node.id));
    }
  }

  // 1. Add Nodes
  traverse(root);

  // 2. Add Edges
  // Edges in ELK can be at multiple levels, but in our current buildElkGraph they are mostly at root.
  // We need to find all edges.
  const allEdges: { edge: ElkEdge, containerId?: string }[] = [];

  function collectEdges(node: ElkNode) {
    if (node.edges) {
      node.edges.forEach(e => allEdges.push({ edge: e, containerId: node.id }));
    }
    if (node.children) {
      node.children.forEach(c => collectEdges(c));
    }
  }

  collectEdges(root);

  // Helper to find a leaf node inside a container (depth-first)
  // Used to redirect edges from container to content to avoid Dagre crashing on compound edges
  function findLeaf(nodeId: string): string {
    const node = nodeMap.get(nodeId);
    if (node && node.children && node.children.length > 0) {
        // Prefer first child? Or is there a "main" child?
        // Just pick the first one for now.
        return findLeaf(node.children[0].id);
    }
    return nodeId;
  }

  allEdges.forEach(({ edge }) => {
    // Dagre only supports 1 source -> 1 target
    if (edge.sources && edge.sources.length > 0 && edge.targets && edge.targets.length > 0) {
      let u = edge.sources[0];
      let v = edge.targets[0];
      
      // EXPERIMENTAL FIX: Redirect edges to container leaves
      // Dagre often fails with "rank" error if edges connect directly to Cluster Nodes (parents).
      // We try to drill down to the actual leaf node inside.
      u = findLeaf(u);
      v = findLeaf(v);

      // Check if nodes exist
      if (g.hasNode(u) && g.hasNode(v)) {
        // Prevent edges to self or direct parent (Dagre constraint?)
        // Cycles in compound graphs can be tricky.
        if (u === v) return; 

        // Check for parent/child relationship edge (often not useful in layout and can cause issues)
        const pU = parentMap.get(u);
        const pV = parentMap.get(v);
        // Direct parent/child edges are sometimes problematic if not strictly hierarchical
        if (pU === v || pV === u) return;

        try {
            g.setEdge(u, v, {
                id: edge.id
            });
        } catch (e) {
            console.warn(`Dagre failed to set edge ${u} -> ${v}`, e);
        }
      }
    }
  });

  // 3. Run Layout
  try {
      dagre.layout(g);
  } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // If Dagre fails, we might just fail the whole diagram or fallback to simple grid?
      // For now, rethrow so we know it failed, but maybe wrap with context.
      console.error('Dagre layout algorithm crashed:', msg);
      throw new Error('Dagre layout failed: ' + msg);
  }

  // 4. Update Node Positions (Convert Abs Center -> Rel TopLeft)
  // First, map get all Absolute TopLefts
  const absPos = new Map<string, { x: number, y: number }>();
  
  g.nodes().forEach(v => {
    const nodeFn = g.node(v);
    if (nodeFn) {
        absPos.set(v, {
            x: nodeFn.x - nodeFn.width / 2,
            y: nodeFn.y - nodeFn.height / 2
        });
        // Update dimensions in elkNode while we are here, as Dagre might have resized containers
        const elkNode = nodeMap.get(v);
        if (elkNode) {
            elkNode.width = nodeFn.width;
            elkNode.height = nodeFn.height;
        }
    }
  });

  // Now set x,y relative to parent
  g.nodes().forEach(v => {
    const elkNode = nodeMap.get(v);
    if (elkNode && absPos.has(v)) {
        const myAbs = absPos.get(v)!;
        const parentId = parentMap.get(v);
        
        if (parentId && absPos.has(parentId)) {
            const parentAbs = absPos.get(parentId)!;
            elkNode.x = myAbs.x - parentAbs.x;
            elkNode.y = myAbs.y - parentAbs.y;
        } else {
            // No parent, relative is absolute
            elkNode.x = myAbs.x;
            elkNode.y = myAbs.y;
        }
    }
  });

  // 5. Update Edge Paths
  // We need to map back to the original edge objects.
  // Since we flattened edges to add them, we iterate our flattened list.
  allEdges.forEach(({ edge, containerId }) => {
      const u = edge.sources[0];
      const v = edge.targets[0];
      if (g.hasNode(u) && g.hasNode(v)) {
          const dagreEdge = g.edge(u, v);
          if (dagreEdge && dagreEdge.points) {
              // Convert Dagre absolute points to relative to container
              let offsetX = 0;
              let offsetY = 0;
              
              const cId = containerId || root.id;
              if (cId && absPos.has(cId)) {
                  const cAbs = absPos.get(cId)!;
                  // SVG renderer adds container's absolute position (accumulated relative positions)
                  // Dagre points are already absolute.
                  // So we must subtract container's absolute position.
                  // Note: absPos here is Top-Left of the node/container.
                  // renderSvg uses Top-Left offsets.
                  offsetX = cAbs.x;
                  offsetY = cAbs.y;
              }

              const points = dagreEdge.points.map(p => ({
                  x: p.x - offsetX,
                  y: p.y - offsetY
              }));

              edge.sections = [{
                  startPoint: points[0],
                  endPoint: points[points.length - 1],
                  bendPoints: points.slice(1, points.length - 1)
              }];
          }
      }
  });

  return root;
}
