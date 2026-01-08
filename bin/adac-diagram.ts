#!/usr/bin/env node

import { program } from "commander";
import { generateDiagram } from "../src/diagram.js";

program
  .name("adac")
  .description("ADAC CLI – generate architecture diagrams")
  .command("diagram <file>")
  .option("-o, --out <path>", "output svg file", "diagram.svg")
  .action(async (file, options) => {
    await generateDiagram(file, options.out);
  });

program.parse();
