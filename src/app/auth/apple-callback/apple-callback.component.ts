import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AppleAuthService } from '../../core/services/apple-auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
  selector: 'app-apple-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="callback-content">
        <p class="callback-message">{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: var(--font-sans, sans-serif);
      font-size: 18px;
      color: var(--charcoal, #1a1a1a);
      background-color: var(--bg-parchment, #fbfaf7);
    }
    .callback-content {
      text-align: center;
      padding: 24px;
    }
    .callback-message {
      font-weight: 500;
    }
  `]
})
export class AppleCallbackComponent implements OnInit {
  private readonly appleAuth = inject(AppleAuthService);
  private readonly cartSvc = inject(CartApiService);
  private readonly favSvc = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  message = 'Completing Apple sign in...';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    let idToken = '';
    let state = '';
    let error = '';

    try {
      const urlObj = new URL(window.location.href);
      idToken = urlObj.searchParams.get('id_token') || '';
      state = urlObj.searchParams.get('state') || '';
      error = urlObj.searchParams.get('error') || '';
    } catch (e) {
      console.error('Error parsing window.location.href:', e);
    }

    if (!idToken || !state) {
      const params = this.route.snapshot.queryParams;
      idToken = idToken || params['id_token'] || '';
      state = state || params['state'] || '';
      error = error || params['error'] || '';
    }

    if (error) {
      this.router.navigate(['/login'], { queryParams: { error: 'apple_cancelled' } });
      return;
    }

    if (!this.appleAuth.verifyState(state)) {
      this.router.navigate(['/login'], { queryParams: { error: 'apple_state_mismatch' } });
      return;
    }

    if (!idToken) {
      this.router.navigate(['/login'], { queryParams: { error: 'apple_no_token' } });
      return;
    }

    this.appleAuth.loginWithToken(idToken).subscribe({
      next: () => {
        this.cartSvc.syncOnLogin();
        this.favSvc.syncOnLogin();
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error('Apple login verification error:', err);
        this.message = 'Sign in failed. Redirecting...';
        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { error: 'apple_login_failed' } });
        }, 1500);
      }
    });
  }
}