import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // JSON body parser with limit for base64 images
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  const uploadsDir = path.resolve(__dirname, 'public/uploads/reviews');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static uploads folder directly
  app.use('/uploads', express.static(path.resolve(__dirname, 'public/uploads')));

  // Review photo upload API
  app.post('/api/upload-review-photo', (req, res) => {
    try {
      const { filename, base64 } = req.body;
      if (!base64) {
        return res.status(400).json({ error: 'Nenhum dado de imagem recebido.' });
      }

      const rawExt = path.extname(filename || '');
      const ext = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(rawExt.toLowerCase()) ? rawExt.toLowerCase() : '.jpg';
      const uniqueName = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadsDir, uniqueName);

      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/reviews/${uniqueName}`;
      return res.json({ url: publicUrl, success: true });
    } catch (err: any) {
      console.error('Erro ao salvar foto da avaliação:', err);
      return res.status(500).json({ error: 'Erro interno ao processar e salvar a imagem.' });
    }
  });

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Plazzio Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
