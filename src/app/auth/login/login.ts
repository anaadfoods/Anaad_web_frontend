import { Component, OnInit, inject, ChangeDetectionStrategy, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { AuthState } from '../../core/state/auth.state';
import { environment } from '../../../environments/environment';

declare var google: any;
declare var AppleID: any;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly cartSvc = inject(CartApiService);
  private readonly favSvc = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authState = inject(AuthState);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loading = false;
  error = '';
  showPassword = false;
  successMessage = '';
  private returnUrl = '/profile';

  ngOnInit() {
    // Synchronously grab returnUrl first
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) this.returnUrl = returnUrl;

    this.route.queryParams.subscribe(params => {
      if (params['registered']) this.successMessage = 'Account created! Please sign in.';
    });

    // Already logged in - redirect
    if (this.authState.isAuthenticated()) {
      this.redirectAfterLogin();
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      // Localhost: Google OAuth does not work locally — use real dev login site
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (isLocalhost && environment.externalLoginUrl) {
        const fullReturn = this.returnUrl.startsWith('http')
          ? this.returnUrl
          : `${window.location.origin}${this.returnUrl.startsWith('/') ? '' : '/'}${this.returnUrl}`;
        window.location.href =
          `${environment.externalLoginUrl}?returnUrl=${encodeURIComponent(fullReturn)}`;
        return;
      }

      this.initGoogleSignIn();
    }
  }

  private initGoogleSignIn() {
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        clearInterval(checkGoogle);
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => this.handleGoogleCredentialResponse(response)
        });
        
        const btnContainer = document.getElementById('googleBtn');
        if (btnContainer) {
          google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with'
          });
        }
      }
    }, 100);
    setTimeout(() => clearInterval(checkGoogle), 10000);
  }

  private handleGoogleCredentialResponse(response: any) {
    this.ngZone.run(() => {
      this.loading = true;
      this.error = '';
      this.successMessage = '';

      this.authSvc.googleLogin(response.credential).subscribe({
        next: () => {
          this.cartSvc.syncOnLogin();
          this.favSvc.syncOnLogin();
          this.redirectAfterLogin();
        },
        error: (err) => {
          this.loading = false;
          const detail = err.error?.detail || err.error?.non_field_errors?.[0];
          this.error = detail || 'Google sign in failed. Please try again.';
        }
      });
    });
  }

  async loginWithApple() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (typeof AppleID === 'undefined') {
      this.error = 'Apple Sign-In is temporarily unavailable. Please try again.';
      return;
    }

    try {
      this.loading = true;
      this.error = '';
      this.successMessage = '';

      AppleID.auth.init({
        clientId: environment.appleClientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/login`,
        usePopup: true
      });

      const res = await AppleID.auth.signIn();
      const idToken = res.authorization.id_token;
      const name = res.user ? `${res.user.name.firstName} ${res.user.name.lastName}` : undefined;

      this.ngZone.run(() => {
        this.authSvc.appleLogin(idToken, name).subscribe({
          next: () => {
            this.cartSvc.syncOnLogin();
            this.favSvc.syncOnLogin();
            this.redirectAfterLogin();
          },
          error: (err) => {
            this.loading = false;
            const detail = err.error?.detail || err.error?.non_field_errors?.[0];
            this.error = detail || 'Apple sign in failed. Please try again.';
          }
        });
      });
    } catch (err) {
      this.ngZone.run(() => {
        this.loading = false;
        console.error('Apple login error:', err);
      });
    }
  }

  get emailCtrl() { return this.loginForm.get('email')!; }
  get passwordCtrl() { return this.loginForm.get('password')!; }

  togglePassword() { this.showPassword = !this.showPassword; }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    const val = this.loginForm.value;

    this.authSvc.login({ email: val.email!, password: val.password! }).subscribe({
      next: () => {
        this.cartSvc.syncOnLogin();
        this.favSvc.syncOnLogin();
        this.redirectAfterLogin();
      },
      error: (err) => {
        this.loading = false;
        const detail = err.error?.detail || err.error?.non_field_errors?.[0];
        this.error = detail || 'Invalid credentials. Please try again.';
      }
    });
  }

  /** Supports cross-origin return (e.g. localhost dev after login on web.anaadfoods.com) */
  private redirectAfterLogin(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const isExternal =
      this.returnUrl.startsWith('http://') || this.returnUrl.startsWith('https://');

    if (isExternal) {
      const target = new URL(this.returnUrl);
      const access = this.authState.accessToken();
      const refresh = this.authState.refreshToken();
      if (access) target.searchParams.set('access_token', access);
      if (refresh) target.searchParams.set('refresh_token', refresh);
      window.location.href = target.toString();
      return;
    }

    this.router.navigateByUrl(this.returnUrl);
  }
}
