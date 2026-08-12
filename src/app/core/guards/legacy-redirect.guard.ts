import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { LEGACY_REDIRECTS } from '../legacy-redirects.map';

export const legacyRedirectGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Clean the requested path: strip leading and trailing slashes and query params
  const urlPath = state.url.split('?')[0];
  const requestedPath = urlPath.replace(/^\/|\/$/g, '');
  const requestedSegments = requestedPath.split('/');
  const queryParams = route.queryParams;

  for (const [legacyPath, targetPath] of Object.entries(LEGACY_REDIRECTS)) {
    const legacySegments = legacyPath.split('/');
    if (legacySegments.length !== requestedSegments.length) {
      continue;
    }

    let isMatch = true;
    const params: Record<string, string> = {};

    for (let i = 0; i < legacySegments.length; i++) {
      const legSeg = legacySegments[i];
      const reqSeg = requestedSegments[i];

      if (legSeg.startsWith(':')) {
        params[legSeg] = reqSeg;
      } else if (legSeg !== reqSeg) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      // Reconstruct target path with dynamic parameter values
      const targetSegments = targetPath.split('/');
      const finalSegments = targetSegments.map(seg => {
        if (seg.startsWith(':')) {
          return params[seg] || '';
        }
        return seg;
      });

      const finalPath = '/' + finalSegments.join('/');
      return router.createUrlTree([finalPath], { queryParams });
    }
  }

  // If no legacy redirect matches, return true to let the wildcard 404 page show
  return true;
};
