import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartState } from '../state/cart.state';

export const cartNotEmptyGuard: CanActivateFn = (route, state) => {
  const cartState = inject(CartState);
  const router = inject(Router);

  // If we are in direct buy mode, bypass the cart check
  if (route.queryParams['direct_buy'] === 'true') {
    return true;
  }

  if (!cartState.isEmpty()) {
    return true;
  }

  router.navigate(['/cart']);
  return false;
};
