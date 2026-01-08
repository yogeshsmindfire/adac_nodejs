import { AdacConfig } from "./types.js";
import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";

// Llamafile uses OpenAI compatible API on port 8080 by default
// Llamafile uses OpenAI compatible API on port 8080 by default
const API_URL = "http://localhost:8080/v1/chat/completions";
const MODEL_FILE_NAME = "phi3.gguf";

const PROJECT_AI_DIR = path.resolve(process.cwd(), "ollama");
const LLAMAFILE_EXE = path.join(PROJECT_AI_DIR, "llamafile.exe");
const LLAMAFILE_MODEL = path.join(PROJECT_AI_DIR, MODEL_FILE_NAME);

// Check if Llamafile is running
export async function isLocalAiAvailable(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:8080/health");
    if (res.ok) return true;
    return false;
  } catch (e) {
    return false;
  }
}

// Helper to auto-start Llamafile
async function startLlamafile(): Promise<void> {
  // 1. Check Engine
  if (!fs.existsSync(LLAMAFILE_EXE)) {
      console.log(`   ⚠️  Llamafile Engine not found at: ${LLAMAFILE_EXE}`);
      console.log(`       Please download llamafile-0.8.x and rename to llamafile.exe in 'ollama/' folder.`);
      return;
  }

  // 2. Check Model
  if (!fs.existsSync(LLAMAFILE_MODEL)) {
      console.log(`   ⚠️  Model file not found at: ${LLAMAFILE_MODEL}`);
      console.log(`       Please download 'Phi-3-mini-4k-instruct-q4.gguf' and save it as 'phi3.gguf' in 'ollama/' folder.`);
      console.log(`       URL: https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf`);
      return; // Can't start without model
  }

  console.log(`   🔄 Launching Project-Local Llamafile (Phi-3)...`);
  
  // Spawn: llamafile -m model.gguf --server --nobrowser
  const subprocess = spawn(LLAMAFILE_EXE, ["-m", MODEL_FILE_NAME, "--server", "--nobrowser", "--port", "8080"], {
    detached: true,
    cwd: PROJECT_AI_DIR, // Run in directory so it finds local files easily
    stdio: "ignore", 
    shell: true 
  });
  subprocess.unref();
}

// Helper to wait for availability
async function waitForAi(timeoutMs: number = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isLocalAiAvailable()) return true;
    await new Promise(r => setTimeout(r, 2000)); 
    console.log("   ⏳ Waiting for Llamafile to become ready...");
  }
  return false;
}

async function queryLocalAi(systemPrompt: string): Promise<string> {
  try {
    // Chat API: Merge system info into user prompt to ensure it's treated as the instruction
    const combinedPrompt = `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nTASK:\nAnalyze the provided architecture components and output the requested JSON mapping.`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi3", // Llamafile might ignore, but good to send
        messages: [
            { role: "user", content: combinedPrompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) return "";
    const data = await response.json() as any;
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch (e) {
    console.warn("AI Query Failed:", e);
    return "";
  }
}

export async function enrichAdacWithAi(adac: AdacConfig): Promise<AdacConfig> {
  let available = await isLocalAiAvailable();
  
  if (!available) {
    console.log("⚠️  Local AI Service is not detected.");
    await startLlamafile();
    available = await waitForAi(30000); 
  }

  if (!available) {
    console.log("❌ Failed to start/connect to Local AI (Llamafile). Smart features disabled.");
    return adac;
  }
  
  console.log("🤖 Local AI Connected (Llamafile). Analyzing full architecture...");

  // 1. Prepare Context
  const items: any[] = [];
  adac.applications.forEach(app => items.push({ id: app.id, name: app.name, desc: (app as any).description, type: app.type }));
  adac.infrastructure.clouds.forEach(c => c.services.forEach(s => items.push({ id: s.id, name: s.name, desc: s.description, type: s.type || s.subtype })));

  const systemPrompt = `
You are a Senior Cloud Architect. Analyze this system manifest.
For each component, determine:
1. The most specific AWS Icon Key (from list below).
2. A Logical Group Name to group related components (e.g. "Payment Module", "Frontend Layer", "Data Lake").

Available Icon Keys:
- ecs-fargate, lambda, ec2, eks
- rds-postgres, dynamodb, elasticache-redis
- s3, cloudfront
- api-gateway-rest, alb, waf
- sqs, sns, kinesis-streams
- secret-manager, codepipeline
- payment, ml, analytics, user, email, notification

Components:
${items.map(i => `- ID: ${i.id} | Name: ${i.name} | Type: ${i.type} | Desc: ${i.desc}`).join("\n")}

Output strictly a JSON object mapping ID to { "icon": "key", "group": "GroupName" }.
IMPORTANT: Return RAW JSON ONLY. No Markdown code blocks. No explanations.
Example:
{
  "payment-service": { "icon": "lambda", "group": "Payment System" },
  "user-db": { "icon": "rds-postgres", "group": "User Management" }
}
`;

  // 2. Query AI
  const result = await queryLocalAi(systemPrompt);

  console.log("   🧠 AI Analysis Complete. Parsing results...");

  // 3. Robust Parsing
  let analysis: Record<string, any> = {};
  const cleanResult = result.trim();
  
  try {
     // Strategy 1: Direct Parse
     analysis = JSON.parse(cleanResult);
  } catch (e1) {
     try {
        // Strategy 2: Extract from Markdown ```json ... ```
        const match = cleanResult.match(/```json([\s\S]*?)```/);
        if (match) {
            analysis = JSON.parse(match[1]);
        } else {
             // Strategy 3: Find first { and last }
             const start = cleanResult.indexOf("{");
             const end = cleanResult.lastIndexOf("}");
             if (start >= 0 && end > start) {
                 analysis = JSON.parse(cleanResult.substring(start, end + 1));
             } else {
                 throw new Error("No JSON structure found");
             }
        }
     } catch (e2) {
        console.warn("   ⚠️ Failed to parse AI JSON response.");
        console.warn("   Debugging - Raw Output Snippet:", cleanResult.substring(0, 500));
     }
  }

  // 4. Apply Tags

  // 4. Apply Tags
  let appliedCount = 0;
  const applyTags = (id: string, obj: any) => {
     if (analysis[id]) {
        if (!obj.ai_tags) obj.ai_tags = {};
        if (analysis[id].icon) obj.ai_tags.icon = analysis[id].icon;
        if (analysis[id].group) obj.ai_tags.group = analysis[id].group;
        appliedCount++;
     }
  };

  adac.applications.forEach(app => applyTags(app.id, app));
  adac.infrastructure.clouds.forEach(c => c.services.forEach(s => applyTags(s.id, s)));

  console.log(`   ✨ Applied smart tags to ${appliedCount} components.`);
  return adac;
}
