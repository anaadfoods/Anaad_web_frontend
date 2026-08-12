import { Component, OnInit, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserQueryService } from '../core/services/user-query.service';
import { AuthService } from '../core/services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rfp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rfp.html',
  styleUrls: ['./rfp.scss']
})
export class Rfp implements OnInit {
  private readonly userQuerySvc = inject(UserQueryService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  submitting = signal<boolean>(false);
  error = signal<string>('');
  successMessage = signal<string>('');

  // OTP Verification Signals
  otpStep = signal<'idle' | 'choosing' | 'sent' | 'verified'>('idle');
  otpMethod = signal<'phone' | 'email' | null>(null);
  otpSending = signal<boolean>(false);
  otpVerifying = signal<boolean>(false);
  otpError = signal<string>('');
  otpSuccessMsg = signal<string>('');
  otpValue = signal<string>('');
  otpResendTimer = signal<number>(0);
  private resendInterval: any = null;

  rfpForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    requirementType: ['INDIVIDUAL', Validators.required],
    businessOrFamilyName: [''],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit() {
    this.rfpForm.get('requirementType')?.valueChanges
      .subscribe((type) => {
        const nameControl = this.rfpForm.get('businessOrFamilyName');
        if (type === 'FAMILY' || type === 'BUSINESS') {
          nameControl?.setValidators([Validators.required, Validators.minLength(2)]);
        } else {
          nameControl?.clearValidators();
        }
        nameControl?.updateValueAndValidity();
      });
  }

  scrollTo(id: string) {
    if (isPlatformBrowser(this.platformId)) {
      const element = document.querySelector(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  selectTier(tier: string) {
    const messageControl = this.rfpForm.get('message');
    if (tier === 'Mini Farm') {
      messageControl?.setValue('I am interested in: Your Family\'s Mini Farm tier. Please provide more details.');
    } else if (tier === 'Contract') {
      messageControl?.setValue('I am interested in: Contract Farming with ANAAD tier. Please provide more details.');
    }
  }

  // ── OTP Verification Flow ─────────────────

  startOtpVerification(): void {
    if (this.rfpForm.get('phoneNumber')?.invalid && this.rfpForm.get('email')?.invalid) {
      this.otpError.set('Please enter a valid phone number or email address first.');
      return;
    }
    this.otpError.set('');
    this.otpStep.set('choosing');
  }

  sendOtp(method: 'phone' | 'email'): void {
    this.otpMethod.set(method);
    this.otpError.set('');
    this.otpSuccessMsg.set('');
    this.otpSending.set(true);

    const identifier = method === 'phone'
      ? (this.rfpForm.get('phoneNumber')?.value || '')
      : (this.rfpForm.get('email')?.value || '');

    if (!identifier) {
      this.otpError.set(`Please enter a valid ${method === 'phone' ? 'phone number' : 'email address'} first.`);
      this.otpSending.set(false);
      return;
    }

    this.authService.sendOtp({ identifier, type: method }).subscribe({
      next: (res) => {
        this.otpSuccessMsg.set(res.message || `OTP sent to your ${method}.`);
        this.otpStep.set('sent');
        this.otpSending.set(false);
        this.startResendTimer();
      },
      error: (err) => {
        this.otpError.set(err.error?.message || `Failed to send OTP. Please try again.`);
        this.otpSending.set(false);
      }
    });
  }

  verifyOtp(): void {
    const otp = this.otpValue().trim();
    if (!otp || otp.length < 4) {
      this.otpError.set('Please enter a valid OTP.');
      return;
    }

    this.otpVerifying.set(true);
    this.otpError.set('');

    const method = this.otpMethod()!;
    const identifier = method === 'phone'
      ? (this.rfpForm.get('phoneNumber')?.value || '')
      : (this.rfpForm.get('email')?.value || '');

    this.authService.verifyOtp({ identifier, otp, type: method }).subscribe({
      next: (res) => {
        this.otpSuccessMsg.set(res.message || 'Verified successfully!');
        this.otpStep.set('verified');
        this.otpVerifying.set(false);
        this.clearResendTimer();
      },
      error: (err) => {
        this.otpError.set(err.error?.message || 'Invalid OTP. Please try again.');
        this.otpVerifying.set(false);
      }
    });
  }

  resendOtp(): void {
    if (this.otpResendTimer() > 0) return;
    const method = this.otpMethod();
    if (method) {
      this.sendOtp(method);
    }
  }

  onOtpInput(event: Event): void {
    this.otpValue.set((event.target as HTMLInputElement).value);
  }

  private startResendTimer(): void {
    this.clearResendTimer();
    this.otpResendTimer.set(30);
    this.resendInterval = setInterval(() => {
      const current = this.otpResendTimer();
      if (current <= 1) {
        this.clearResendTimer();
      } else {
        this.otpResendTimer.set(current - 1);
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
    this.otpResendTimer.set(0);
  }

  resetOtp(): void {
    this.otpStep.set('idle');
    this.otpMethod.set(null);
    this.otpValue.set('');
    this.otpError.set('');
    this.otpSuccessMsg.set('');
    this.clearResendTimer();
  }

  onSubmit() {
    if (this.rfpForm.invalid) {
      this.rfpForm.markAllAsTouched();
      return;
    }

    if (this.otpStep() !== 'verified') {
      this.otpError.set('Please verify your identity with OTP before submitting.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    this.successMessage.set('');

    const formVal = this.rfpForm.getRawValue();
    const payload = {
      name: formVal.fullName ?? '',
      phone_number: formVal.phoneNumber ?? '',
      email: formVal.email ?? undefined,
      message: formVal.message ?? '',
      requirement_type: formVal.requirementType as string,
      is_from_rfp: true,
      is_rfp: true,
      redirection_from: 'RFP' as const
    };

    this.userQuerySvc.submitQuery(payload).pipe(
      finalize(() => this.submitting.set(false))
    ).subscribe({
      next: () => {
        this.successMessage.set('Your contract farming proposal was submitted successfully! The farm manager will review it.');
        this.rfpForm.reset({ requirementType: 'INDIVIDUAL' });
        this.resetOtp();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to submit proposal. Please check details.');
      }
    });
  }
}
