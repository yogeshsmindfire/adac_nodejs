import fs from 'fs';
import yaml from 'js-yaml';
import { AdacConfig } from '../types.js';

export function parseAdacFromContent(content: string): AdacConfig {
  return yaml.load(content) as AdacConfig;
}

export function parseAdac(filePath: string): AdacConfig {
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseAdacFromContent(raw);
}
