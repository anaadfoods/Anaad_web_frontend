import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthState } from '../state/auth.state';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const authSvc = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // On server: allow through (client-side will handle redirect)
  if (!isPlatformBrowser(platformId)) return true;

  if (authState.isAuthenticated()) return true;

  if (environment.devBypassAuth) {
    authSvc.devBypassLogin();
    return true;
  }

  // Allow through if this is an Apple Sign In callback redirect
  if (route.queryParamMap.has('id_token')) {
    return true;
  }

  const targetUrl = state.url || '/profile';
  console.log('[authGuard] redirecting to /login with returnUrl:', targetUrl);
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: targetUrl }
  });
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  if (!authState.isAuthenticated()) return true;

  const rawReturnUrl = route.queryParams['returnUrl'] || '/profile';
  const tabParam = route.queryParams['tab'];
  let returnUrl = rawReturnUrl;
  try {
    returnUrl = decodeURIComponent(rawReturnUrl);
  } catch {
    returnUrl = rawReturnUrl;
  }
  if (tabParam && !returnUrl.includes('tab=')) {
    const sep = returnUrl.includes('?') ? '&' : '?';
    returnUrl = `${returnUrl}${sep}tab=${tabParam}`;
  }
  router.navigateByUrl(returnUrl);
  return false;
};
