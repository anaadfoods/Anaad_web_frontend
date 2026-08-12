import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { HttpRequest, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { apiBaseInterceptor } from './core/interceptors/api-base.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/**
 * API path prefixes whose data changes frequently (products, cart, orders, etc.).
 * These must ALWAYS be fetched fresh from the backend on the client,
 * bypassing the prerendered TransferState cache baked into the static HTML.
 */
const DYNAMIC_API_PREFIXES = [
  '/api/products/',
  '/api/cart/',
  '/api/orders/',
  '/api/subscriptions/',
  '/api/blog/',
  '/api/core/banners/',
  '/api/notifications/',
  '/api/panchang-calender/',
  '/api/rfp/',
  '/api/core/crop-cycle-orders/',
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled'
    })),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        filter: (req: HttpRequest<unknown>) => {
          // Return false → skip transfer cache (force fresh fetch on client)
          // Return true  → allow transfer cache (use prerendered data)
          const url = req.url;
          const isDynamic = DYNAMIC_API_PREFIXES.some(prefix => url.includes(prefix));
          return !isDynamic;
        }
      })
    ),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([apiBaseInterceptor, authInterceptor])
    )
  ]
};
