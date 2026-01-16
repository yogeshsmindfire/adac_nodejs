# ADAC - AWS Diagram Generator

ADAC (AWS Diagram As Code) is a powerful Node.js-based CLI tool designed to generate professional AWS architecture diagrams programmatically from YAML configuration files. It leverages the precision of `elkjs` for graph layout algorithms and outputs high-quality SVG diagrams, making it easy to version control and automate your architecture documentation.

## 📂 Folder Structure

```
adac_nodejs/
├── bin/                # CLI entry point scripts
│   └── adac-diagram.ts # Main CLI command definition
├── src/                # Core application source code
│   ├── buildElkGraph.ts # Logic to transform ADAC model to ELK graph
│   ├── diagram.ts       # Main orchestrator function
│   ├── layoutDagre.ts   # Adapter for Dagre layout engine
│   ├── mappings/        # Icon mapping definitions and assets
│   │   ├── definition.yaml # Raw ADAC definition file
│   │   └── icon-map.json   # Processed icon mapping
│   ├── parseAdac.ts     # YAML parsing logic
│   ├── renderSvg.ts     # SVG rendering engine
│   ├── setupIcons.ts    # Utility to download and setup AWS icons
│   └── types.ts        # TypeScript type definitions
├── yamls/              # Example and usage YAML input files
│   ├── adac_example_webapp.yaml
│   ├── aws.adac.yaml
│   └── ...
├── output_diagrams/    # Directory for generated SVG outputs
├── dist/               # Compiled JavaScript files (generated after build)
└── package.json        # Project manifest and dependencies
```

## 🛠 Tools & Technologies Used

- **Runtime**: Node.js
- **Language**: TypeScript
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js)
- **Graph Layouts**: 
  - [elkjs](https://github.com/kieler/elkjs) (Eclipse Layout Kernel) - *Default*
  - [dagre](https://github.com/dagrejs/dagre) (Directed Graph Layout)
- **YAML Parser**: [js-yaml](https://github.com/nodeca/js-yaml)
- **File System**: [fs-extra](https://github.com/jprichardson/node-fs-extra)
- **Utilities**:
  - `adm-zip`: For handling icon asset archives.
  - `axios`: For downloading external resources (icons).

## 📊 Layout Engines

You can choose between **ELK** and **Dagre** for your diagrams.

| Feature | **ELK (Default)** | **Dagre** |
| :--- | :--- | :--- |
| **Best For** | Complex, deeply nested architectures with many containers. | Simpler, standard directed graphs (flowcharts). |
| **Routing** | Advanced orthogonal routing. | Simple routing. |
| **Alignment** | Port-based alignment. | Rank-based alignment. |

## 📚 Reference Links

- **ELK Layout**: [https://www.eclipse.org/elk/](https://www.eclipse.org/elk/)
- **Dagre**: [https://github.com/dagrejs/dagre](https://github.com/dagrejs/dagre)
- **Node.js**: [https://nodejs.org/](https://nodejs.org/)
- **Blogging/Context**: Originally inspired by "Diagrams as Code" concepts (e.g., similar to the Python `diagrams` library or Structurizr).

## 🚀 Setup & Installation Guide

### Prerequisites

- Ensure you have **Node.js** (v16+ recommended) installed on your machine.

### 1. Clone & Install

Navigate to the project directory and install the dependencies:

```bash
npm install
```

### 2. Build the Project

Compile the TypeScript source code into JavaScript:

```bash
npm run build
```

This will generate the `dist/` directory containing the executable code.

### 3. Setup Icons (First Time Only)

If the project requires AWS icons that are not present, you may need to run the setup script (if applicable/available via npm scripts or direct execution) to download and extract them into `src/assets`.

### 4. Running the Tool

You can generate a diagram using the built CLI script.

**Syntax:**

```bash
node dist/bin/adac-diagram.js diagram <file> [options]
```

**Options:**
- `-o, --out <path>`: Output SVG file path (default: `diagram.svg`).
- `--layout <engine>`: Layout engine to use (`elk` or `dagre`).

**Examples:**

1. **Default Generation (ELK):**
   ```bash
   node dist/bin/adac-diagram.js diagram yamls/adac_example_webapp.yaml -o output_diagrams/webapp.svg
   ```

2. **Using Dagre Layout via CLI:**
   ```bash
   node dist/bin/adac-diagram.js diagram yamls/test_dagre.yaml --layout dagre -o output_diagrams/test_dagre.svg
   ```

3. **Defining Layout in YAML:**
   You can also specify the layout directly in your YAML file:
   ```yaml
   name: My Architecture
   layout: dagre # or 'elk'
   applications: ...
   ```

### 5. Development

For development, you can modify files in `src/` and rebuild using `npm run build`.
