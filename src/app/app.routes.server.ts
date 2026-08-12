import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'product/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'blog/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'blogs/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'order/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'subscription/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'traceability-journey/:crop_id',
    renderMode: RenderMode.Server
  },
  {
    path: 'traceability-journey',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
