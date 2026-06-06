import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AuthState } from '../core/state/auth.state';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './delete-account.component.html',
  styleUrls: ['./delete-account.component.scss']
})
export class DeleteAccountComponent {
  private readonly authSvc = inject(AuthService);
  readonly authState = inject(AuthState);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  step = signal<'password' | 'otp' | 'done'>('password');
  loading = signal(false);
  error = signal('');
  success = signal('');

  passwordForm = this.fb.group({
    password: ['', [Validators.required]]
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(4)]]
  });

  submitPassword() {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const pw = this.passwordForm.value.password!;
    this.authSvc.deactivate(pw).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (res) => {
        this.success.set(res.message || 'OTP sent to your registered contact.');
        this.step.set('otp');
      },
      error: (err) => this.error.set(err.error?.message || err.error?.detail || 'Incorrect password.'),
    });
  }

  submitOtp() {
    if (this.otpForm.invalid) { this.otpForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const otp = this.otpForm.value.otp!;
    this.authSvc.deactivateConfirm(otp).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.step.set('done');
        this.authSvc.logout();
      },
      error: (err) => this.error.set(err.error?.message || 'Invalid OTP. Please try again.'),
    });
  }
}
