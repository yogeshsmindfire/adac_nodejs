import { AdacConfig, ElkNode, ElkEdge } from "./types.js";
import path from "path";

// Mapping from subtype/type to Icon File Name (relative to src/assets)
const ICON_MAP: Record<string, string> = {
  // Compute
  "ecs-fargate": "Architecture-Service-Icons_07312025/Arch_Containers/48/Arch_Amazon-Elastic-Container-Service_48.svg",
  "eks": "Architecture-Service-Icons_07312025/Arch_Containers/48/Arch_Amazon-Elastic-Kubernetes-Service_48.svg",
  "lambda": "Architecture-Service-Icons_07312025/Arch_Compute/48/Arch_AWS-Lambda_48.svg",
  "ec2": "Resource-Icons_07312025/Res_Compute/Res_Amazon-EC2_Instance_48.svg", // Added EC2 generic
  
  // App types (generic)
  "frontend": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Client_48_Light.svg",
  "backend": "Architecture-Service-Icons_07312025/Arch_Compute/48/Arch_AWS-Lambda_48.svg",
  "microservice": "Architecture-Service-Icons_07312025/Arch_Compute/48/Arch_AWS-Lambda_48.svg", // Default for Generic MS
  "api": "Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/48/Arch_Amazon-API-Gateway_48.svg",
  "database": "Architecture-Service-Icons_07312025/Arch_Database/48/Arch_Amazon-RDS_48.svg",
  
  // Specific Microservices (Overrides based on ID or Name logic could go here, but map keys are types)
  // We will handle specific IDs in the code below
  
  // Database
  "rds-postgres": "Architecture-Service-Icons_07312025/Arch_Database/48/Arch_Amazon-RDS_48.svg",
  "rds-aurora-postgres": "Architecture-Service-Icons_07312025/Arch_Database/48/Arch_Amazon-Aurora_48.svg",
  "dynamodb": "Architecture-Service-Icons_07312025/Arch_Database/48/Arch_Amazon-DynamoDB_48.svg",
  "elasticache-redis": "Architecture-Service-Icons_07312025/Arch_Database/48/Arch_Amazon-ElastiCache_48.svg",

  // Networking
  "vpc": "Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/48/Arch_Amazon-Virtual-Private-Cloud_48.svg",
  "subnet": "Resource-Icons_07312025/Res_Networking-Content-Delivery/Res_Amazon-VPC_Subnet-Private_48.svg", // Fallback, usually container
  "application-load-balancer": "Resource-Icons_07312025/Res_Networking-Content-Delivery/Res_Elastic-Load-Balancing_Application-Load-Balancer_48.svg",
  "alb": "Resource-Icons_07312025/Res_Networking-Content-Delivery/Res_Elastic-Load-Balancing_Application-Load-Balancer_48.svg",
  "nat-gateway": "Resource-Icons_07312025/Res_Networking-Content-Delivery/Res_Amazon-VPC_NAT-Gateway_48.svg",
  "api-gateway-rest": "Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/48/Arch_Amazon-API-Gateway_48.svg",
  "cdn": "Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/48/Arch_Amazon-CloudFront_48.svg",
  "cloudfront": "Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/48/Arch_Amazon-CloudFront_48.svg",
  "internet": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Internet_48_Light.svg",
  
  // Integration
  "sqs": "Architecture-Service-Icons_07312025/Arch_App-Integration/48/Arch_Amazon-Simple-Queue-Service_48.svg",
  "sns": "Architecture-Service-Icons_07312025/Arch_App-Integration/48/Arch_Amazon-Simple-Notification-Service_48.svg",
  "kinesis-streams": "Architecture-Service-Icons_07312025/Arch_Analytics/48/Arch_Amazon-Kinesis-Data-Streams_48.svg",
  
  // Storage
  "s3": "Architecture-Service-Icons_07312025/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
  
  // Security & Management
  "security-group": "Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/48/Arch_AWS-Identity-and-Access-Management_48.svg",
  "waf": "Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/48/Arch_AWS-WAF_48.svg",
  "guardduty": "Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/48/Arch_Amazon-GuardDuty_48.svg",
  "secrets-manager": "Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/48/Arch_AWS-Secrets-Manager_48.svg",
  "cloudwatch": "Architecture-Service-Icons_07312025/Arch_Management-Governance/48/Arch_Amazon-CloudWatch_48.svg",

  // DevTools
  "codepipeline": "Architecture-Service-Icons_07312025/Arch_Developer-Tools/48/Arch_AWS-CodePipeline_48.svg",
  "codebuild": "Architecture-Service-Icons_07312025/Arch_Developer-Tools/48/Arch_AWS-CodeBuild_48.svg",
  
  // User/Client
  "user": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_User_48_Light.svg",
  "users": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Users_48_Light.svg",
  "client": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Client_48_Light.svg",
  "mobile": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Mobile-client_48_Light.svg",
  
  // Domain Specific (manual overrides)
  "payment": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Multimedia_48_Light.svg",
  "notification": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Email_48_Light.svg",
  "email": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Email_48_Light.svg",
  "analytics": "Resource-Icons_07312025/Res_General-Icons/Res_48_Light/Res_Metrics_48_Light.svg",
  "ml": "Architecture-Service-Icons_07312025/Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker_48.svg",
};

// Colors matching AWS Diagrams
const STYLES = {
  vpc: { type: "container", style: "vpc", cssClass: "aws-vpc" },
  az: { type: "container", style: "az", cssClass: "aws-az" },
  subnet: { type: "container", style: "subnet", cssClass: "aws-subnet" },
  publicSubnet: { type: "container", style: "subnet-public", cssClass: "aws-subnet-public" },
  privateSubnet: { type: "container", style: "subnet-private", cssClass: "aws-subnet-private" },
  compute: { type: "container", style: "compute-cluster", cssClass: "aws-compute-cluster" },
  service: { type: "node", style: "service" },
  app: { type: "node", style: "app" },
};

export function buildElkGraph(adac: AdacConfig): ElkNode {
  const nodesMap = new Map<string, ElkNode>();
  const nodes: ElkNode[] = [];
  const edges: ElkEdge[] = [];
  
  // Root node (Cloud Region usually, or just canvas)
  const rootChildren: ElkNode[] = [];

  // Helper to get helper map
  const getIconPath = (key: string) => {
    if (ICON_MAP[key]) {
      return path.resolve("d:/Pre-training/adac/src/assets", ICON_MAP[key]);
    }
    return undefined;
  };

  const getServiceType = (service: any): string => {
    return service.subtype || service.service || service.type || "unknown";
  };
  
  const detectIconForApp = (app: any) => {
     // 1. Prefer AI Inference
     if (app.ai_tags?.icon) {
        const p = getIconPath(app.ai_tags.icon);
        if (p) return p;
     }

     // Check technology for generic matches
     const tech = (app.technology || "").toLowerCase();
     if (tech.includes("react") || tech.includes("vue") || tech.includes("angular")) return getIconPath("frontend");
     if (tech.includes("node") || tech.includes("java") || tech.includes("python")) return getIconPath("backend");

     // Fallbacks
     return getIconPath(app.type) || getIconPath("microservice");
  };

  // 1. Create Nodes for Applications
  adac.applications.forEach(app => {
    const node: ElkNode = {
      id: app.id,
      width: 80,
      height: 80,
      labels: [{ text: app.name }],
      properties: {
        type: "app",
        iconPath: detectIconForApp(app), 
        title: app.type
      }
    };
    nodesMap.set(app.id, node);
  });

  // 1.5 Create Nodes for Logical Groups (AI Suggested)
  // We scan everything to find unique group names
  const logicalGroups = new Set<string>();
  const collectGroup = (obj: any) => { if (obj.ai_tags?.group) logicalGroups.add(obj.ai_tags.group); };
  
  adac.applications.forEach(collectGroup);
  adac.infrastructure.clouds.forEach(c => c.services.forEach(collectGroup));

  logicalGroups.forEach(groupName => {
    const groupId = `group-${groupName.replace(/\s+/g, '-')}`;
    const node: ElkNode = {
       id: groupId,
       width: 400, // Dynamic? ELK resizes containers usually
       height: 300,
       labels: [{ text: groupName }],
       children: [],
       properties: {
          type: "container",
          cssClass: "aws-compute-cluster", // Reuse style
          title: "Logical Group"
       },
       layoutOptions: {
          "elk.padding": "[top=40,left=20,bottom=20,right=20]",
          "elk.spacing.nodeNode": "30"
       }
    };
    nodesMap.set(groupId, node);
    // These are top-level by default unless nested?
    // Let's assume logical groups are top-level concepts in this view (or inside VPC? No, usually cross-cutting or app layer)
    // We add them to rootChildren later if they have no parent.
  });

  // 2. Create Nodes for Infrastructure Services (Pass 1)
  adac.infrastructure.clouds.forEach(cloud => {
    cloud.services.forEach(service => {
      let width = 80;
      let height = 80;
      let style: { type: string; style: string; cssClass?: string } = STYLES.service;
      
      const typeKey = getServiceType(service);
      const cfg = service.config || service.configuration || {};

      // Identify Containers
      const runsApps = service.runs && service.runs.length > 0;
      
      if (typeKey === "vpc") {
        width = 400; height = 400; style = STYLES.vpc;
      } else if (typeKey === "subnet") {
        width = 250; height = 250;
        const isPublic = cfg.public_access === true || cfg.public === true;
        style = isPublic ? STYLES.publicSubnet : STYLES.privateSubnet;
      } else if (runsApps || ["ecs-fargate", "eks", "ecs", "ec2"].includes(typeKey)) {
        width = 300; height = 250; style = STYLES.compute;
      }

      // Icon Resolution strategy
      let iconPath = getIconPath(typeKey);
      if (service.ai_tags?.icon) {
         const aiIcon = getIconPath(service.ai_tags.icon);
         if (aiIcon) iconPath = aiIcon;
      }
      if (!iconPath) iconPath = getIconPath("backend"); // Fallback

      const node: ElkNode = {
        id: service.id,
        width,
        height,
        labels: [{ text: service.name || service.id }], 
        children: [],
        properties: {
          type: style.type,
          cssClass: style.cssClass,
          iconPath: iconPath,
          description: service.description || typeKey
        },
        layoutOptions: {
          "elk.padding": "[top=40,left=20,bottom=20,right=20]",
          "elk.spacing.nodeNode": "30"
        }
      };
      nodesMap.set(service.id, node);
    });
  });

  // 3. Build Hierarchy (Pass 2) 
  const placedNodeIds = new Set<string>();

  // Helper to place item in logical group if no infra parent
  const tryPlaceInLogicalGroup = (node: ElkNode, aiTags: any) => {
      if (aiTags?.group) {
          const groupId = `group-${aiTags.group.replace(/\s+/g, '-')}`;
          const groupNode = nodesMap.get(groupId);
          if (groupNode && !placedNodeIds.has(node.id)) {
              if (!groupNode.children) groupNode.children = [];
              groupNode.children.push(node);
              placedNodeIds.add(node.id);
              return true;
          }
      }
      return false;
  };

  // Place Apps
  adac.applications.forEach(app => {
     if (placedNodeIds.has(app.id)) return;
     // Apps often placed by 'runs' in Services. If NOT placed by service, put in Logical Group.
     // Getting app Node
     const node = nodesMap.get(app.id);
     if (node) {
         // We do this check AFTER services claim them?
         // No, services claim in their loop. We need to do a post-pass or let services loop run first.
         // Let's defer app placement logic to end of infra loop?
     }
     // Actually, let's wait until infra loop finishes claiming 'runs'.
  });

  // Process Services to assign Logic Parents
  adac.infrastructure.clouds.forEach(cloud => {
    cloud.services.forEach(service => {
      const node = nodesMap.get(service.id)!;
      let parentId: string | undefined;
      const cfg = service.config || service.configuration || {};

      // Check config for parent reference (VPC/Subnet)
      if (cfg) {
        // AZ Logic (Implicit AZ Container)
        const az = cfg.availability_zone; 
        if (typeof az === 'string' && cfg.vpc) {
           const vpcId = cfg.vpc;
           const azId = `${vpcId}-${az}`;
           
           if (!nodesMap.has(azId)) {
             // Create Implicit AZ Node in nodesMap... (Same as before)
             // [Code for AZ creation skipped for brevity, reused existing logic if block kept]
             // Wait, I am replacing the block, must include it.
             const azNode: ElkNode = {
               id: azId, width: 300, height: 300,
               labels: [{ text: `AZ: ${az}` }], children: [],
               properties: { type: "container", cssClass: "aws-az", title: "Availability Zone" },
               layoutOptions: { "elk.padding": "[top=40,left=20,bottom=20,right=20]", "elk.spacing.nodeNode":"30" }
             };
             nodesMap.set(azId, azNode);
             if (nodesMap.has(vpcId)) {
               const vpc = nodesMap.get(vpcId)!;
               if (!vpc.children) vpc.children=[];
               vpc.children.push(azNode);
               placedNodeIds.add(azId);
             }
           }
           if (getServiceType(service) === "subnet") parentId = azId;
        } else if (cfg.vpc) {
             parentId = cfg.vpc;
        }

        if (cfg.subnets && cfg.subnets.length > 0) {
             if (cfg.subnets.length === 1) parentId = cfg.subnets[0];
        }
      }
      
      // Fallback parent logic
      if (!parentId) {
         if (service.subnets && service.subnets.length === 1) parentId = service.subnets[0];
         else if (cfg?.vpc) parentId = cfg.vpc;
      }
      
      // Prevent Self-Cycle
      if (parentId === service.id) parentId = undefined;

      // Claim Apps (runs)
      const runsApps = service.runs && service.runs.length > 0;
      if (runsApps) { 
        service.runs?.forEach(appId => {
          if (placedNodeIds.has(appId)) return;
          const appNode = nodesMap.get(appId);
          if (appNode) {
            node.children?.push(appNode);
            placedNodeIds.add(appId);
          }
        });
      }

      // Place this service in Parent
      if (parentId && nodesMap.has(parentId) && parentId !== service.id && !placedNodeIds.has(service.id)) {
           const parent = nodesMap.get(parentId)!;
           if (!parent.children) parent.children = [];
           parent.children.push(node);
           placedNodeIds.add(service.id);
      }
      
      // If NOT placed in infra, try Logical Group
      if (!placedNodeIds.has(service.id)) {
         tryPlaceInLogicalGroup(node, service.ai_tags);
      }
    });
  });

  // 4. Handle Orphans (Services & Apps)
  // Create a default "Utility / Shared Infrastructure" Group for unplaced items
  const utilityGroupId = "group-utility-shared";
  let utilityGroupCreated = false;
  
  const ensureUtilityGroup = () => {
     if (utilityGroupCreated) return;
     if (nodesMap.has(utilityGroupId)) { utilityGroupCreated = true; return; }
     
     const node: ElkNode = {
        id: utilityGroupId, width: 400, height: 300,
        labels: [{ text: "Shared Infrastructure" }],
        children: [],
        properties: { type: "container", cssClass: "aws-compute-cluster", title: "Shared Services" },
        layoutOptions: { "elk.padding": "[top=40,left=20,bottom=20,right=20]", "elk.spacing.nodeNode": "30" }
     };
     nodesMap.set(utilityGroupId, node);
     rootChildren.push(node); // Add to root
     utilityGroupCreated = true;
  };

  // Scan Infrastructure for Orphans
  adac.infrastructure.clouds.forEach(cloud => {
      cloud.services.forEach(service => {
          if (!placedNodeIds.has(service.id)) {
              // Try logical group first (AI)
              if (tryPlaceInLogicalGroup(nodesMap.get(service.id)!, service.ai_tags)) return;
              
              // Else, place in Utility Group if it looks like a backend service
              // If it's a major container like VPC, it goes to root (already handled?)
              // VPCs are containers, usually not placed inside others.
              const type = getServiceType(service);
              if (type === "vpc") {
                  // VPCs go to root
                  const vpcNode = nodesMap.get(service.id)!;
                  if (!rootChildren.includes(vpcNode)) rootChildren.push(vpcNode);
                  placedNodeIds.add(service.id);
                  return;
              }

              ensureUtilityGroup();
              const group = nodesMap.get(utilityGroupId)!;
              group.children?.push(nodesMap.get(service.id)!);
              placedNodeIds.add(service.id);
          }
      });
  });

  // Scan Apps for Orphans
  adac.applications.forEach(app => {
      if (!placedNodeIds.has(app.id)) {
          if (tryPlaceInLogicalGroup(nodesMap.get(app.id)!, app.ai_tags)) return;
          
          // Place in Utility? Or just root?
          const type = (app.type || "").toLowerCase();
          if (["user", "client", "internet", "browser", "mobile"].includes(type)) {
              const n = nodesMap.get(app.id)!;
              if (!rootChildren.includes(n)) rootChildren.push(n); // Keep in root
          } else {
              ensureUtilityGroup();
              const group = nodesMap.get(utilityGroupId)!;
              group.children?.push(nodesMap.get(app.id)!);
          }
          placedNodeIds.add(app.id);
      }
  });

  // 5. Edges and Implicit Nodes
  (adac.connections || []).forEach(conn => {
    // Check if Endpoints exist, if not create implicit "External" nodes
    [conn.from, conn.to].forEach(endpointId => {
      if (!nodesMap.has(endpointId)) {
        // Smart Implicit Node Detection
        let icon = getIconPath("internet"); // Default
        const lowerId = endpointId.toLowerCase();
        
        if (lowerId.includes("user")) icon = getIconPath("user");
        else if (lowerId.includes("client")) icon = getIconPath("client");
        else if (lowerId.includes("frontend")) icon = getIconPath("frontend");
        else if (lowerId.includes("backend")) icon = getIconPath("backend");

        const implicitNode: ElkNode = {
          id: endpointId,
          width: 80,
          height: 80,
          labels: [{ text: endpointId }],
          properties: {
             type: "node",
             iconPath: icon, 
             description: "External System"
          }
        };
        nodesMap.set(endpointId, implicitNode);
        rootChildren.push(implicitNode); // Implicit nodes are always top-level
      }
    });

    edges.push({
      id: conn.id || `${conn.from}->${conn.to}`,
      sources: [conn.from],
      targets: [conn.to],
      labels: [{ text: conn.type }]
    });
  });

  // Final Sweep: Add any top-level nodes (Logical Groups) to root if not present
  nodesMap.forEach((node, id) => {
     if (id.startsWith("group-") && !rootChildren.includes(node)) {
         // Only add if it has children?
         if (node.children && node.children.length > 0) {
             rootChildren.push(node);
         }
     }
  });

  return {
    id: "root",
    properties: {
      type: "container",
      cssClass: "aws-root"
    },
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.spacing.nodeNode": "80",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: rootChildren,
    edges
  };
}
