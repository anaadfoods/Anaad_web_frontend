import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy, NgZone, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AppleAuthService } from '../../core/services/apple-auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { AuthState } from '../../core/state/auth.state';
import { environment } from '../../../environments/environment';

declare var google: any;

export const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirm_password')?.value;
  return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly appleAuth = inject(AppleAuthService);
  private readonly cartSvc = inject(CartApiService);
  private readonly favSvc = inject(FavoritesService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  // Email OTP signals
  emailOtpStep = signal<'idle' | 'sent' | 'verified'>('idle');
  emailOtpSending = signal<boolean>(false);
  emailOtpVerifying = signal<boolean>(false);
  emailOtpValue = signal<string>('');
  emailOtpResendTimer = signal<number>(0);
  emailOtpError = signal<string>('');
  emailOtpSuccessMsg = signal<string>('');
  private emailResendInterval: any = null;

  // Phone OTP signals
  phoneOtpStep = signal<'idle' | 'sent' | 'verified'>('idle');
  phoneOtpSending = signal<boolean>(false);
  phoneOtpVerifying = signal<boolean>(false);
  phoneOtpValue = signal<string>('');
  phoneOtpResendTimer = signal<number>(0);
  phoneOtpError = signal<string>('');
  phoneOtpSuccessMsg = signal<string>('');
  private phoneResendInterval: any = null;

  sendEmailOtp() {
    const email = this.registerForm.get('email')?.value;
    if (this.registerForm.get('email')?.invalid || !email) {
      this.emailOtpError.set('Please enter a valid email address first.');
      return;
    }
    this.emailOtpError.set('');
    this.emailOtpSuccessMsg.set('');
    this.emailOtpSending.set(true);

    this.authSvc.sendOtp({ identifier: email, type: 'email' }).subscribe({
      next: (res) => {
        this.emailOtpSuccessMsg.set(res.message || 'OTP sent to your email.');
        this.emailOtpStep.set('sent');
        this.emailOtpSending.set(false);
        this.startEmailResendTimer();
      },
      error: (err) => {
        this.emailOtpError.set(err.error?.message || 'Failed to send OTP. Please try again.');
        this.emailOtpSending.set(false);
      }
    });
  }

  sendPhoneOtp() {
    const phone = this.registerForm.get('phone_number')?.value;
    if (this.registerForm.get('phone_number')?.invalid || !phone) {
      this.phoneOtpError.set('Please enter a valid phone number first.');
      return;
    }
    this.phoneOtpError.set('');
    this.phoneOtpSuccessMsg.set('');
    this.phoneOtpSending.set(true);

    this.authSvc.sendOtp({ identifier: phone, type: 'phone' }).subscribe({
      next: (res) => {
        this.phoneOtpSuccessMsg.set(res.message || 'OTP sent to your phone.');
        this.phoneOtpStep.set('sent');
        this.phoneOtpSending.set(false);
        this.startPhoneResendTimer();
      },
      error: (err) => {
        this.phoneOtpError.set(err.error?.message || 'Failed to send OTP. Please try again.');
        this.phoneOtpSending.set(false);
      }
    });
  }

  verifyEmailOtp() {
    const otp = this.emailOtpValue().trim();
    if (!otp || otp.length < 4) {
      this.emailOtpError.set('Please enter a valid OTP.');
      return;
    }
    this.emailOtpVerifying.set(true);
    this.emailOtpError.set('');

    const email = this.registerForm.get('email')?.value || '';
    this.authSvc.verifyOtp({ identifier: email, otp, type: 'email' }).subscribe({
      next: (res) => {
        this.emailOtpSuccessMsg.set(res.message || 'Email verified successfully!');
        this.emailOtpStep.set('verified');
        this.emailOtpVerifying.set(false);
        this.clearEmailResendTimer();
        this.registerForm.get('email')?.disable();
      },
      error: (err) => {
        this.emailOtpError.set(err.error?.message || 'Invalid OTP. Please try again.');
        this.emailOtpVerifying.set(false);
      }
    });
  }

  verifyPhoneOtp() {
    const otp = this.phoneOtpValue().trim();
    if (!otp || otp.length < 4) {
      this.phoneOtpError.set('Please enter a valid OTP.');
      return;
    }
    this.phoneOtpVerifying.set(true);
    this.phoneOtpError.set('');

    const phone = this.registerForm.get('phone_number')?.value || '';
    this.authSvc.verifyOtp({ identifier: phone, otp, type: 'phone' }).subscribe({
      next: (res) => {
        this.phoneOtpSuccessMsg.set(res.message || 'Phone verified successfully!');
        this.phoneOtpStep.set('verified');
        this.phoneOtpVerifying.set(false);
        this.clearPhoneResendTimer();
        this.registerForm.get('phone_number')?.disable();
      },
      error: (err) => {
        this.phoneOtpError.set(err.error?.message || 'Invalid OTP. Please try again.');
        this.phoneOtpVerifying.set(false);
      }
    });
  }

  private startEmailResendTimer() {
    this.clearEmailResendTimer();
    this.emailOtpResendTimer.set(30);
    this.emailResendInterval = setInterval(() => {
      const current = this.emailOtpResendTimer();
      if (current <= 1) {
        this.clearEmailResendTimer();
      } else {
        this.emailOtpResendTimer.set(current - 1);
      }
    }, 1000);
  }

  private clearEmailResendTimer() {
    if (this.emailResendInterval) {
      clearInterval(this.emailResendInterval);
      this.emailResendInterval = null;
    }
    this.emailOtpResendTimer.set(0);
  }

  private startPhoneResendTimer() {
    this.clearPhoneResendTimer();
    this.phoneOtpResendTimer.set(30);
    this.phoneResendInterval = setInterval(() => {
      const current = this.phoneOtpResendTimer();
      if (current <= 1) {
        this.clearPhoneResendTimer();
      } else {
        this.phoneOtpResendTimer.set(current - 1);
      }
    }, 1000);
  }

  private clearPhoneResendTimer() {
    if (this.phoneResendInterval) {
      clearInterval(this.phoneResendInterval);
      this.phoneResendInterval = null;
    }
    this.phoneOtpResendTimer.set(0);
  }

  resetEmailOtp() {
    this.emailOtpStep.set('idle');
    this.emailOtpValue.set('');
    this.emailOtpError.set('');
    this.emailOtpSuccessMsg.set('');
    this.clearEmailResendTimer();
    this.registerForm.get('email')?.enable();
  }

  resetPhoneOtp() {
    this.phoneOtpStep.set('idle');
    this.phoneOtpValue.set('');
    this.phoneOtpError.set('');
    this.phoneOtpSuccessMsg.set('');
    this.clearPhoneResendTimer();
    this.registerForm.get('phone_number')?.enable();
  }

  registerForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone_number: ['', [Validators.required, Validators.pattern('^[+]?[0-9]{10,13}$')]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]],
    referral_code: [''],
    agree_terms: [false, [Validators.requiredTrue]]
  }, { validators: passwordMatchValidator });

  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;
  showReferralField = signal<boolean>(false);

  get f() { return this.registerForm.controls; }
  get passwordStrength(): 'weak' | 'medium' | 'strong' | 'none' {
    const pw = this.f.password.value || '';
    if (pw.length < 4) return 'none';
    if (pw.length < 8) return 'weak';
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
    const score = [hasUpper, hasNum, hasSymbol].filter(Boolean).length;
    if (score >= 2 && pw.length >= 10) return 'strong';
    return 'medium';
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.emailOtpStep() !== 'verified' || this.phoneOtpStep() !== 'verified') {
      this.error = 'Please verify both your email and phone number with OTP first.';
      return;
    }

    this.loading = true;
    this.error = '';

    const val = this.registerForm.getRawValue();
    const req = {
      username: val.email!,
      email: val.email!,
      first_name: val.first_name!,
      last_name: val.last_name!,
      password: val.password!,
      confirm_password: val.confirm_password!,
      phone_number: val.phone_number!,
      referral_code: val.referral_code || undefined,
    };

        this.authSvc.register(req).subscribe({
      next: () => {
        this.clearEmailResendTimer();
        this.clearPhoneResendTimer();
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        this.router.navigate(['/login'], { 
          queryParams: { 
            registered: 'true',
            returnUrl: returnUrl || undefined
          } 
        });
      },
      error: (err) => {
        this.loading = false;
        const errorData = err.error;
        if (errorData?.email?.[0]) { this.error = errorData.email[0]; return; }
        if (errorData?.phone_number?.[0]) { this.error = errorData.phone_number[0]; return; }
        if (errorData?.username?.[0]) { this.error = 'Email is already in use.'; return; }
        if (errorData?.password?.[0]) { this.error = errorData.password[0]; return; }
        this.error = errorData?.message || errorData?.detail || 'Registration failed. Please check your details.';
      }
    });
  }

  ngOnInit(): void {
    const refCode = this.route.snapshot.queryParams['ref'] || this.route.snapshot.queryParams['referral_code'];
    if (refCode) {
      this.registerForm.patchValue({ referral_code: refCode });
      this.showReferralField.set(true);
    }
    if (isPlatformBrowser(this.platformId)) {
      this.initGoogleSignIn();
    }
  }

  ngOnDestroy(): void {
    this.clearEmailResendTimer();
    this.clearPhoneResendTimer();
  }

  private initGoogleSignIn() {
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        const btnContainer = document.getElementById('googleBtnRegister');
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
            text: 'signup_with'
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

  signInWithApple(): void {
    this.appleAuth.initiateSignIn();
  }

  private redirectAfterLogin(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/profile';

    const isExternal =
      returnUrl.startsWith('http://') || returnUrl.startsWith('https://');

    if (isExternal) {
      const target = new URL(returnUrl);
      const access = this.authState.accessToken();
      const refresh = this.authState.refreshToken();
      if (access) target.searchParams.set('access_token', access);
      if (refresh) target.searchParams.set('refresh_token', refresh);
      window.location.href = target.toString();
      return;
    }

    this.router.navigateByUrl(returnUrl);
  }
}
