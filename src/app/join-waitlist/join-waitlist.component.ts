import { LogService } from '../core/services/log.service';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserQueriesService, UserQueryPayload } from '../core/services/user-queries.service';
import { RegistrationSourceService } from '../core/services/registration-source.service';
import { AuthService } from '../core/services/auth.service';

interface MemberCountResponse {
  success: boolean;
  count: number;
  message: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-join-waitlist',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-waitlist.component.html',
  styleUrls: ['./join-waitlist.component.scss']
})
export class JoinWaitlistComponent implements OnInit {
  private readonly logSvc = inject(LogService);
  private readonly platformId = inject(PLATFORM_ID);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);
  private userQueriesService = inject(UserQueriesService);
  private registrationSourceService = inject(RegistrationSourceService);
  private readonly authService = inject(AuthService);

  // Member count signals
  memberCount = signal<number>(0);
  displayCount = signal<number>(0);
  isCountLoading = signal<boolean>(true);

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

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    requirementType: ['', Validators.required],
    familyName: ['', Validators.required],
    message: ['']
  });

  submitting = false;
  submitted = false;
  errorMessage = '';

  get f() { return this.form.controls; }

  scrollToForm(): void {
    const formElement = document.getElementById('waitlist-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  ngOnInit(): void {
    // Only set source as WAITLIST if user came directly to this page
    // (i.e., no source already set from PDF_REQUEST, RFP, etc.)
    const currentSource = this.registrationSourceService.getSource();
    if (currentSource === 'USER_QUERY') {
      this.registrationSourceService.setSource('WAITLIST');
    }

    // Fetch member count from API
    this.fetchMemberCount();
  }

  private fetchMemberCount(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isCountLoading.set(false);
      return;
    }
    this.http.get<MemberCountResponse>('/api/user-query/count/').subscribe({
      next: (response) => {
        if (response.success && response.count) {
          this.memberCount.set(response.count);
          this.animateCount(response.count);
        }
        this.isCountLoading.set(false);
      },
      error: (err) => {
        this.logSvc.error('Failed to fetch member count:', err);
        this.memberCount.set(1000);
        this.displayCount.set(1000);
        this.isCountLoading.set(false);
      }
    });
  }

  private animateCount(target: number): void {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const stepTime = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        this.displayCount.set(target);
        clearInterval(timer);
      } else {
        this.displayCount.set(Math.floor(current));
      }
    }, stepTime);
  }

  // ── OTP Verification Flow ─────────────────

  /** Show the OTP method chooser */
  startOtpVerification(): void {
    if (this.form.get('phoneNumber')?.invalid && this.form.get('email')?.invalid) {
      this.otpError.set('Please enter a valid phone number or email address first.');
      return;
    }
    this.otpError.set('');
    this.otpStep.set('choosing');
  }

  /** Send OTP via chosen method */
  sendOtp(method: 'phone' | 'email'): void {
    this.otpMethod.set(method);
    this.otpError.set('');
    this.otpSuccessMsg.set('');
    this.otpSending.set(true);

    const identifier = method === 'phone'
      ? (this.form.get('phoneNumber')?.value || '')
      : (this.form.get('email')?.value || '');

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

  /** Verify the entered OTP */
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
      ? (this.form.get('phoneNumber')?.value || '')
      : (this.form.get('email')?.value || '');

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

  /** Resend OTP */
  resendOtp(): void {
    if (this.otpResendTimer() > 0) return;
    const method = this.otpMethod();
    if (method) {
      this.sendOtp(method);
    }
  }

  /** Update OTP input value */
  onOtpInput(event: Event): void {
    this.otpValue.set((event.target as HTMLInputElement).value);
  }

  /** Start the 30s resend cooldown timer */
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

  /** Reset OTP state */
  resetOtp(): void {
    this.otpStep.set('idle');
    this.otpMethod.set(null);
    this.otpValue.set('');
    this.otpError.set('');
    this.otpSuccessMsg.set('');
    this.clearResendTimer();
  }

  onSubmit() {
    this.logSvc.debug('Form submit triggered');
    this.submitted = true;
    this.errorMessage = '';

    this.logSvc.debug('Form valid:', this.form.valid);
    this.logSvc.debug('Form values:', this.form.value);

    if (this.form.invalid) {
      this.logSvc.debug('Form is invalid, errors:', this.form.errors);
      return;
    }

    if (this.otpStep() !== 'verified') {
      this.otpError.set('Please verify your identity with OTP before submitting.');
      return;
    }

    this.submitting = true;

    const articleId = this.registrationSourceService.getArticleId();

    const payload: UserQueryPayload = {
      name: this.form.value.fullName || '',
      phone_number: this.form.value.phoneNumber || '',
      email: this.form.value.email || '',
      message: this.form.value.message || '',
      requirement_type: this.form.value.requirementType || '',
      business_or_family_name: this.form.value.familyName || '',
      is_from_rfp: this.registrationSourceService.getIsRfp(),
      redirection_from: this.registrationSourceService.getSource(),
      ...(articleId && { article_id: articleId })
    };

    this.logSvc.debug('Submitting payload:', payload);

    this.userQueriesService.submitQuery(payload).subscribe({
      next: (response) => {
        this.logSvc.debug('Success response:', response);
        this.submitting = false;
        this.form.reset();
        this.submitted = false;
        this.resetOtp();
        // Clear source data after successful submission
        this.registrationSourceService.clearAll();
        this.router.navigateByUrl('/thank-you');
      },
      error: (err) => {
        this.logSvc.error('Full error object:', err);
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Something went wrong. Please try again.';
        this.logSvc.error('Waitlist registration error:', err);
      }
    });
  }
}

