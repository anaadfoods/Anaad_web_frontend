import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API } from '../core/constants/api-endpoints';
import { AuthService } from '../core/services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    requirementType: ['FAMILY', [Validators.required]],
    businessOrFamilyName: [''],
    isFromRfp: [false],
    topic: ['Select a topic...', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10)]],
    orderNumber: ['']
  });

  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

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

  get f() { return this.form.controls; }

  // ── OTP Verification Flow ─────────────────

  startOtpVerification(): void {
    if (this.f.phone.invalid && this.f.email.invalid) {
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
      ? (this.f.phone.value || '')
      : (this.f.email.value || '');

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
      ? (this.f.phone.value || '')
      : (this.f.email.value || '');

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.otpStep() !== 'verified') {
      this.otpError.set('Please verify your identity with OTP before submitting.');
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const val = this.form.value;
    const phoneWithCode = `91${val.phone}`;
    const payload = {
      name: `${val.firstName} ${val.lastName}`,
      phone_number: phoneWithCode,
      email: val.email,
      message: `Topic: ${val.topic}\nOrder: ${val.orderNumber}\n\n${val.message}`,
      requirement_type: val.requirementType,
      business_or_family_name: val.businessOrFamilyName,
      is_from_rfp: val.isFromRfp,
      redirection_from: val.isFromRfp ? 'RFP' : 'USER_QUERY'
    };

    this.http.post(API.USER_QUERIES.SUBMIT, payload).subscribe({
      next: () => {
        this.successMessage.set('Thank you! Your query has been submitted successfully.');
        this.form.reset({ topic: 'Select a topic...', requirementType: 'FAMILY', isFromRfp: false });
        this.isSubmitting.set(false);
        this.resetOtp();
      },
      error: (err) => {
        this.errorMessage.set('Failed to submit your query. Please try again later.');
        this.isSubmitting.set(false);
      }
    });
  }
}
