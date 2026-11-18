import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type ForgotPasswordStep = 'IDENTIFIER' | 'OTP' | 'RESET' | 'SUCCESS';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);

  readonly step = signal<ForgotPasswordStep>('IDENTIFIER');
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly successMessage = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  // Step 1 Form
  readonly identifierForm = this.fb.group({
    identifier: ['', [Validators.required]],
    type: ['EMAIL' as 'EMAIL' | 'MOBILE', [Validators.required]],
  });

  // Step 2 Form
  readonly otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]],
  });

  // Step 3 Form
  readonly resetForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  get currentIdentifier(): string {
    return (this.identifierForm.get('identifier')?.value || '').trim();
  }

  get currentType(): 'EMAIL' | 'MOBILE' {
    return this.identifierForm.get('type')?.value || 'EMAIL';
  }

  setType(type: 'EMAIL' | 'MOBILE'): void {
    this.identifierForm.patchValue({ type });
    this.error.set('');
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  // ── Step 1: Send OTP ──────────────────────────────
  onRequestOtp(): void {
    if (this.identifierForm.invalid) {
      this.identifierForm.markAllAsTouched();
      return;
    }

    const identifier = this.currentIdentifier;
    const type = this.currentType;

    if (type === 'EMAIL' && !identifier.includes('@')) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.successMessage.set('');

    this.authSvc.forgotPasswordSendOtp({ identifier, type }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(res.message || `OTP sent to your ${type.toLowerCase()}.`);
        this.step.set('OTP');
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err.error?.detail || err.error?.message || err.error?.identifier?.[0] || 'Unable to send recovery OTP. Please verify your details.';
        this.error.set(detail);
      },
    });
  }

  // ── Step 2: Verify OTP ─────────────────────────────
  onVerifyOtp(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    const identifier = this.currentIdentifier;
    const type = this.currentType;
    const otp = (this.otpForm.get('otp')?.value || '').trim();

    this.loading.set(true);
    this.error.set('');
    this.successMessage.set('');

    this.authSvc.forgotPasswordVerifyOtp({ identifier, otp, type }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(res.message || 'OTP verified successfully.');
        this.step.set('RESET');
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err.error?.detail || err.error?.message || err.error?.otp?.[0] || 'Invalid or expired OTP. Please try again.';
        this.error.set(detail);
      },
    });
  }

  onResendOtp(): void {
    this.error.set('');
    this.onRequestOtp();
  }

  onBackToIdentifier(): void {
    this.step.set('IDENTIFIER');
    this.error.set('');
    this.successMessage.set('');
  }

  // ── Step 3: Reset Password ─────────────────────────
  onResetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const newPw = this.resetForm.get('newPassword')?.value || '';
    const confirmPw = this.resetForm.get('confirmPassword')?.value || '';

    if (newPw !== confirmPw) {
      this.error.set('Passwords do not match.');
      return;
    }

    const identifier = this.currentIdentifier;
    const type = this.currentType;

    this.loading.set(true);
    this.error.set('');
    this.successMessage.set('');

    this.authSvc.forgotPasswordReset({ identifier, new_password: newPw, type }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(res.message || 'Password reset successfully.');
        this.step.set('SUCCESS');
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err.error?.detail || err.error?.message || err.error?.new_password?.[0] || 'Failed to reset password. Please try again.';
        this.error.set(detail);
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
