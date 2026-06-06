import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthState } from '../state/auth.state';

export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // On server: allow through (client-side will handle redirect)
  if (!isPlatformBrowser(platformId)) return true;

  if (authState.isAuthenticated()) return true;

  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  if (!authState.isAuthenticated()) return true;

  router.navigate(['/profile']);
  return false;
};
