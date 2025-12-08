import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
require('dotenv').config();

import { join } from 'node:path';
import type { Request, Response } from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Add JSON body parser for POST requests
app.use(express.json());

// Lightweight proxy to avoid CORS and browser cross-origin issues during dev/SSR
app.get('/api/plans', async (req: Request, res: Response) => {
  const upstream = `${process.env['BASE_API_CLIENT']}/api/subscriptions/plans/`;
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

// Proxy for user queries (registration and waitlist forms)
app.post('/api/user-queries/', async (req: Request, res: Response) => {
  const upstream = `${process.env['BASE_API_CLIENT']}/api/user-queries/`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {

    const r = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) {
      const errorData = ct.includes('application/json') ? await r.json() : { error: r.statusText };
      res.status(r.status).json(errorData);
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

// Proxy for user query count (member count for waitlist)
app.get('/api/user-query/count/', async (req: Request, res: Response) => {
  const upstream = `${process.env['BASE_API_CLIENT']}/api/user-query/count/`;
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
  const upstream = `${process.env['BASE_API_CLIENT']}/api/products/variants/`;
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

// Proxy for research papers (evidence archive)
app.get('/api/research-papers/', async (req: Request, res: Response) => {
  const upstream = `${process.env['BASE_API_CLIENT']}/api/blog/research-papers/`;
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

// Proxy for blog articles (list all - scrollable)
app.get('/api/blogs/', async (req: Request, res: Response) => {
  const upstream = `${process.env['BASE_API_CLIENT']}/api/blog/articles`;
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

// Proxy for featured blog articles (category=BLOG)
app.get('/api/blog/articles/', async (req: Request, res: Response) => {
  const category = req.query['category'] || 'BLOG';
  const upstream = `${process.env['BASE_API_CLIENT']}/api/blog/articles/?category=${category}`;
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

// Proxy for single blog article by ID
app.get('/api/blogs/:id', async (req: Request, res: Response) => {
  const articleId = req.params['id'];
  const upstream = `${process.env['BASE_API_CLIENT']}/api/blog/articles/${articleId}`;
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
