import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDiagramSvg } from './core/generate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Serve static files from the 'public' directory
// We are in dist/src/server.js, so public is ../../public
const publicPath = path.join(__dirname, '..', '..', 'public');
app.use(express.static(publicPath));

// API Endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { content, layout } = req.body;
        
        if (!content) {
             res.status(400).json({ error: 'Missing content' });
             return;
        }

        const result = await generateDiagramSvg(content, layout);
        res.status(200).json(result);
    } catch (e: any) {
        console.error('Generation failed:', e);
        res.status(500).json({ error: e.message || 'Internal Server Error', logs: e.logs });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Serving static files from: ${publicPath}`);
});
