import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
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
export class Login implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly cartSvc = inject(CartApiService);
  private readonly favSvc = inject(FavoritesService);
  private readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  readonly authState = inject(AuthState);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

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
      if (params['registered']) {
        this.successMessage = 'Account created! Please sign in.';
        this.cdr.markForCheck();
      }
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

      if (isLocalhost && (environment as any).externalLoginUrl) {
        const fullReturn = this.returnUrl.startsWith('http')
          ? this.returnUrl
          : `${window.location.origin}${this.returnUrl.startsWith('/') ? '' : '/'}${this.returnUrl}`;
        window.location.href =
          `${(environment as any).externalLoginUrl}?returnUrl=${encodeURIComponent(fullReturn)}`;
        return;
      }

      this.initGoogleSignIn();
    }
  }

  private initGoogleSignIn() {
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        const btnContainer = document.getElementById('googleBtn');
        if (btnContainer) {
          clearInterval(checkGoogle);

          google.accounts.id.initialize({
            client_id: environment.googleClientId,
            callback: (response: any) => this.handleGoogleCredentialResponse(response)
          });

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
      this.cdr.markForCheck();

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
          this.cdr.markForCheck();
        }
      });
    });
  }

  private handleAppleLoginSuccess(idToken: string, name?: string) {
    this.ngZone.run(() => {
      this.loading = true;
      this.error = '';
      this.successMessage = '';
      this.cdr.markForCheck();

      this.authSvc.appleLogin(idToken, name).subscribe({
        next: () => {
          this.cartSvc.syncOnLogin();
          this.favSvc.syncOnLogin();
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (err) => {
          this.loading = false;
          const detail = err.error?.detail || err.error?.non_field_errors?.[0];
          this.error = detail || 'Apple sign in failed. Please try again.';
          this.cdr.markForCheck();
        }
      });
    });
  }

  async loginWithApple() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (typeof AppleID === 'undefined') {
      this.error = 'Apple Sign-In is temporarily unavailable. Please try again.';
      this.cdr.markForCheck();
      return;
    }

    try {
      this.loading = true;
      this.error = '';
      this.successMessage = '';
      this.cdr.markForCheck();

      AppleID.auth.init({
        clientId: environment.appleClientId,
        scope: 'name email',
        redirectURI: environment.appleRedirectUri,
        usePopup: true
      });

      // ✅ Capture response directly from signIn()
      const response = await AppleID.auth.signIn();
      const idToken = response?.authorization?.id_token;
      if (!idToken) {
        throw new Error('Missing Apple ID token');
      }
      const first = response?.user?.name?.firstName ?? '';
      const last = response?.user?.name?.lastName ?? '';
      const name = `${first} ${last}`.trim() || undefined;
      this.handleAppleLoginSuccess(idToken, name);
    } catch (err: any) {
      console.log('Apple SDK signIn error/cancellation:', err);
      this.ngZone.run(() => {
        this.loading = false;
        if (err?.error !== 'user_cancelled') {
          this.error = 'Apple Sign-In failed or was cancelled.';
        }
        this.cdr.markForCheck();
      });
    }
  }

  ngOnDestroy() {
    // Nothing to clean up anymore
  }

  get emailCtrl() { return this.loginForm.get('email')!; }
  get passwordCtrl() { return this.loginForm.get('password')!; }

  togglePassword() {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck();
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.cdr.markForCheck();

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
        this.cdr.markForCheck();
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
