#!/usr/bin/env node

import { program } from 'commander';
import { generateDiagram } from '../src/core/generate.js';

program
  .name('adac')
  .description('ADAC CLI – generate architecture diagrams')
  .command('diagram <file>')
  .option('-o, --out <path>', 'output svg file', 'diagram.svg')
  .option('--layout <engine>', 'layout engine (elk | dagre)')
  .action(async (file, options) => {
    await generateDiagram(file, options.out, options.layout);
  });

program.parse();
