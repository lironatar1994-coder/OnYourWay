import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyticsRouter } from './routes/analytics.js';
import { leadsRouter } from './routes/leads.js';
import { providersRouter } from './routes/providers.js';
import { startWhatsAppService } from './services/whatsapp/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'on-the-way-backend',
  });
});

app.use('/providers', providersRouter);
app.use('/leads', leadsRouter);
app.use('/api/leads', leadsRouter);
app.use('/analytics', analyticsRouter);
app.use('/api/analytics', analyticsRouter);

app.use((error, _req, res, _next) => {
  console.error('[api] Request failed:', error);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`[api] On The Way backend listening on port ${port}`);
});

startWhatsAppService().catch((error) => {
  console.error('[whatsapp] Failed to start service:', error);
});
