// @ts-ignore
import ELK from "elkjs";
import { ElkNode } from "./types.js";
import fs from "fs-extra";

const CSS_STYLES = `
  .aws-container { fill: none; stroke-width: 2px; }
  .aws-root { fill: #ffffff; stroke: none; }
  .aws-vpc { fill: #fcfcfc; stroke: #8C4FFF; stroke-dasharray: 5,5; }
  .aws-az { fill: none; stroke: #545b64; stroke-dasharray: 5,5; stroke-width: 1.5px; }
  .aws-subnet-public { fill: #e6f6e6; stroke: #6cae6c; } 
  .aws-subnet-private { fill: #e6f2f8; stroke: #007dbc; }
  .aws-vpc-rect { fill: #ffffff; stroke: #232f3e; stroke-width: 2px; }
  
  .aws-subnet-public { fill: #e6f6e6; stroke: #6cae6c; } /* Light Green */
  .aws-subnet-private { fill: #e6f2f8; stroke: #007dbc; } /* Light Blue */
  
  .aws-compute-cluster { fill: #fff; stroke: #d86613; stroke-dasharray: 4,4; }
  
  .aws-label { font-family: "Amazon Ember", sans-serif; font-size: 14px; fill: #232f3e; font-weight: bold;}
  .aws-label-sm { font-family: "Amazon Ember", sans-serif; font-size: 12px; fill: #545b64; }
  
  .aws-edge { stroke: #545b64; stroke-width: 2px; fill: none; }
`;

export async function renderSvg(graph: ElkNode): Promise<string> {
  const elk = new (ELK as any)();

  // Recursively layout? ELK handles hierarchy if structure is passed.
  const layout = await elk.layout(graph) as ElkNode;

  const width = layout.width || 800;
  const height = layout.height || 600;

  let svgContent = "";

  // Helper to read Icon as Base64
  const getIconDataUri = (params: { path?: string }) => {
    if (!params.path || !fs.existsSync(params.path)) return null;
    try {
      const data = fs.readFileSync(params.path);
      const b64 = data.toString('base64');
      const ext = params.path.split('.').pop()?.toLowerCase();
      let mime = "image/svg+xml";
      if (ext === "png") mime = "image/png";
      else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
      return `data:${mime};base64,${b64}`;
    } catch (e) {
      console.warn(`Failed to read icon: ${params.path}`, e);
      return null;
    }
  };

  // Recursive Render Function
  const renderNode = (node: ElkNode, indent: number = 0) => {
    let output = "";
    const nodeX = node.x || 0;
    const nodeY = node.y || 0;
    const nodeW = node.width || 0;
    const nodeH = node.height || 0;

    // Determine Style
    const props = node.properties || {};
    const label = node.labels && node.labels.length > 0 ? node.labels[0].text : "";

    // Group for this node (moves local coordinate system? No, ELK gives absolute or relative coords? 
    // ELK gives RELATIVE coords to parent. So we must use transform.)
    output += `<g transform="translate(${nodeX}, ${nodeY})">`;

    // Label Rendering Helper
    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
        }
        return c;
      });
    };

    const renderLabel = (text: string, x: number, y: number, cssClass: string, maxWidth: number) => {
       if (!text) return "";
       return `<text x="${x}" y="${y}" class="${cssClass}">${escapeXml(text)}</text>`;
    };

    if (props.type === "container") {
      // Render Container Rect
      let rectClass = "aws-container";
      if (props.cssClass) rectClass += ` ${props.cssClass}`;
      
      output += `<rect width="${nodeW}" height="${nodeH}" class="${rectClass}" rx="4" ry="4" opacity="0.9"/>`;
      
      // Label (Top Left for containers)
      output += renderLabel(label, 10, 25, "aws-label", nodeW - 40);

      // Render Icon for container if exists (e.g. VPC icon at corner)
      if (props.iconPath) {
        const iconUri = getIconDataUri({ path: props.iconPath });
        if (iconUri) {
          // Small icon for container header
          output += `<image href="${iconUri}" x="${nodeW - 28}" y="5" width="24" height="24" />`;
        }
      }

      // Render Children
      if (node.children) {
        node.children.forEach(child => {
          output += renderNode(child, indent + 1);
        });
      }

    } else {
      // App or Service Node
      const iconUri = getIconDataUri({ path: props.iconPath });
      
      const iy = 10;
      const textY = 65;

      if (iconUri) {
          // Stable fixed layout for 80x80 nodes
          const ix = (nodeW - 48) / 2;
          output += `<image href="${iconUri}" x="${ix}" y="${iy}" width="48" height="48" />`;
      } else {
        // Fallback Box
        output += `<rect width="${nodeW}" height="${nodeH}" fill="#eee" stroke="#ccc" />`;
      }

      // Label (Bottom center)
      // Split label if likely to be long
      const words = label.split(" ");
      let line1 = label;
      let line2 = "";
      if (words.length > 2) {
         const mid = Math.ceil(words.length / 2);
         line1 = words.slice(0, mid).join(" ");
         line2 = words.slice(mid).join(" ");
      }
      
      output += `<text x="${nodeW / 2}" y="${textY}" text-anchor="middle" class="aws-label-sm">${escapeXml(line1)}</text>`;
      if (line2) {
        output += `<text x="${nodeW / 2}" y="${textY + 12}" text-anchor="middle" class="aws-label-sm">${escapeXml(line2)}</text>`;
      }
    }
    
    // Edges (Edges in ELK are usually at the level where both nodes exist, or root. 
    // If ELK "include children" is on, edges might be localized. 
    // For now, assume top-level edges or edges in current children list.
    // Actually ELK outputs edges at the level they are defined in graph structure.
    if (node.edges) {
       node.edges.forEach(edge => {
         if (edge.sections) {
           edge.sections.forEach(sec => {
             // Points assume relative to this container.
             let d = `M ${sec.startPoint.x} ${sec.startPoint.y}`;
             if (sec.bendPoints) {
                sec.bendPoints.forEach(bp => { d += ` L ${bp.x} ${bp.y}`; });
             }
             d += ` L ${sec.endPoint.x} ${sec.endPoint.y}`;
             
             output += `<path d="${d}" class="aws-edge" marker-end="url(#arrow)" />`;
           });
         }
       });
    }

    output += `</g>`;
    return output;
  };

  svgContent += renderNode(layout);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-width: 100%; background-color: white;">
    <defs>
      <style>${CSS_STYLES}</style>
      <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#545b64" />
    </marker>
    </defs>
    ${svgContent}
  </svg>`;
}
