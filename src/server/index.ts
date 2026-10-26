import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createChatRouter } from './routes/chat';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.use(
  '/api',
  createChatRouter(() => ({
    opencodeGo: process.env.OPENCODE_GO_API_KEY ?? '',
    gemini: process.env.GEMINI_API_KEY ?? '',
    openrouter: process.env.OPENROUTER_API_KEY ?? '',
  }))
);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, '0.0.0.0', () => {
  console.log(`[ThanhLLM Proxy] Listening on http://0.0.0.0:${port}`);
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    setInterval(() => {
      fetch(`${externalUrl.replace(/\/+$/, '')}/api/health`).catch(() => {
        // Ignore self-ping errors
      });
    }, 12 * 60 * 1000);
  }
});
