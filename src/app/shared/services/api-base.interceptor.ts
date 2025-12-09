import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  // Always prepend base URL to relative API URLs
  if (req.url.startsWith('/api/')) {
    const fullUrl = `${environment.apiBaseUrl}${req.url}`;
    req = req.clone({ url: fullUrl });
  }
  
  return next(req);
};
