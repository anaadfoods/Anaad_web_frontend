import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import type { Request, Response } from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Lightweight proxy to avoid CORS and browser cross-origin issues during dev/SSR
app.get('/api/plans', async (req: Request, res: Response) => {
  const upstream = 'https://app.anaadfoods.com/api/subscriptions/plans/';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(upstream, { signal: controller.signal });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) {
      res.status(r.status).json({ error: 'upstream_error', status: r.status, statusText: r.statusText });
      return;
    }
    if (ct.includes('application/json')) {
      const data = await r.json();
      res.json(data);
    } else {
      const text = await r.text();
      res.type('text/plain').send(text);
    }
  } catch (err) {
    res.status(502).json({ error: 'proxy_fetch_failed', detail: String(err) });
  } finally {
    clearTimeout(timeout);
  }
});

// Proxy for product variants
app.get('/api/products/variants/', async (req: Request, res: Response) => {
  const upstream = 'https://app.anaadfoods.com/api/products/variants/';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(upstream, { signal: controller.signal });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) {
      res.status(r.status).json({ error: 'upstream_error', status: r.status, statusText: r.statusText });
      return;
    }
    if (ct.includes('application/json')) {
      const data = await r.json();
      res.json(data);
    } else {
      const text = await r.text();
      res.type('text/plain').send(text);
    }
  } catch (err) {
    res.status(502).json({ error: 'proxy_fetch_failed', detail: String(err) });
  } finally {
    clearTimeout(timeout);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
