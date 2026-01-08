import fs from "fs";
import yaml from "js-yaml";
import { AdacConfig } from "./types.js";

export function parseAdac(filePath: string): AdacConfig {
  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw) as AdacConfig;
}
