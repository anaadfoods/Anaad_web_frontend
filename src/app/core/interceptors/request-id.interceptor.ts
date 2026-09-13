import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const requestIdInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach X-Request-ID to internal APIs, avoiding CORS rejection on third-party services
  const isOurApi =
    req.url.startsWith('/api/') ||
    (environment.apiBaseUrl && req.url.startsWith(environment.apiBaseUrl)) ||
    (environment.sutraBaseUrl && req.url.startsWith(environment.sutraBaseUrl));

  if (isOurApi && !req.headers.has('X-Request-ID')) {
    const reqId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'req-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    req = req.clone({
      setHeaders: {
        'X-Request-ID': reqId,
      },
    });
  }
  return next(req);
};
