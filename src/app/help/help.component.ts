import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { UserQueriesService, UserQueryPayload } from '../core/services/user-queries.service';
import { AuthService } from '../core/services/auth.service';
import { LogService } from '../core/services/log.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegistrationSourceService } from '../core/services/registration-source.service';

export interface FaqItem {
  question: string;
  answer: string;
  category: 'general' | 'orders' | 'subscriptions' | 'rfp';
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userQueriesService = inject(UserQueriesService);
  private readonly authService = inject(AuthService);
  private readonly logSvc = inject(LogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly registrationSourceService = inject(RegistrationSourceService);

  // Redirection signals
  redirectionFrom = signal<string | null>(null);
  isPdfRequest = computed(() => this.redirectionFrom() === 'PDF Request');

  // FAQ list
  readonly faqs: FaqItem[] = [
    {
      category: 'general',
      question: '1. What is ICBN?',
      answer: 'ICBN stands for Indigenous Cow Based Natural farming. It is a farming approach rooted in natural inputs, living soil, and traditional agricultural knowledge, designed to grow food in a way that supports both human health and ecological balance.'
    },
    {
      category: 'general',
      question: '2. Why does ANAAD follow ICBN farming?',
      answer: 'We follow ICBN farming because we believe food should begin with living soil, not chemical dependence. This approach allows us to grow staples with greater care for the land, the farmer, and the families who eat our food.'
    },
    {
      category: 'subscriptions',
      question: '3. Why are ANAAD products offered through subscriptions?',
      answer: 'Subscriptions allow us to grow with clarity and responsibility. They help us plan before sowing, share risk with committed households, and deliver food in a way that stays closer to the field and farther from speculation.'
    },
    {
      category: 'subscriptions',
      question: '4. What does risk sharing mean in your model?',
      answer: 'Risk sharing means that instead of placing the full uncertainty on the farmer, the household commits in advance and helps anchor the season. This gives us the confidence to plan better, grow more responsibly, and reduce waste across the food system.'
    },
    {
      category: 'subscriptions',
      question: '5. How do ANAAD Commitment Plans work?',
      answer: 'When you choose a Commitment Plan, a portion of our harvest is reserved for your household. Your food is then handled in a planned cycle of harvesting, processing, packaging, and dispatch, so every batch remains connected to a clear origin and a defined purpose.'
    },
    {
      category: 'general',
      question: '6. Why is traceability important?',
      answer: 'Traceability is what makes trust visible. It allows you to see where your food came from, how it was grown, and how it moved through each stage before reaching your kitchen.'
    },
    {
      category: 'general',
      question: '7. How does ANAAD ensure transparency?',
      answer: 'We share batch-level information, farm records, and process details so the journey of the food is not hidden from the household. Transparency, for us, is not a marketing claim — it is part of the product.'
    },
    {
      category: 'general',
      question: '8. Why does ANAAD avoid chemicals in farming?',
      answer: 'We avoid chemicals because they may increase yield, but they often come at the cost of soil health, ecological stability, and long-term food quality. Our work is built on the belief that clean food must also come from clean growing practices.'
    },
    {
      category: 'general',
      question: '9. Why are desi seeds important?',
      answer: 'Desi seeds are important because they are part of a living food heritage that is better adapted to local conditions. They help preserve biodiversity, support resilience in the field, and keep the character of the crop more intact.'
    },
    {
      category: 'general',
      question: '10. Why does ANAAD use desi cows?',
      answer: 'Desi cows are central to our natural farming system because they support the preparation of farm-made inputs and reflect a more balanced agricultural ecology. They are part of a farming practice that values nourishment over extraction.'
    },
    {
      category: 'general',
      question: '11. Why do you use traditional processing methods?',
      answer: 'We use traditional processing methods because we want to preserve the grain’s natural character. Slower, careful processing helps us protect taste, texture, and nutritional integrity without forcing the food through excessive heat or speed.'
    },
    {
      category: 'general',
      question: '12. How does ANAAD support farmer upliftment?',
      answer: 'We work through a model that gives farmers more stability, clearer planning, and a stronger link to the people they grow for. When households commit early, farmers gain more certainty and can focus on growing with care rather than chasing unpredictable markets.'
    },
    {
      category: 'general',
      question: '13. How does this model help the environment?',
      answer: 'Our model reduces unnecessary movement, unnecessary storage, and unnecessary waste in the food chain. By growing more deliberately and closer to the people who consume the food, we aim to support healthier soil, lower waste, and a more respectful ecological footprint.'
    },
    {
      category: 'general',
      question: '14. Why is ANAAD priced differently from regular store-bought food?',
      answer: 'ANAAD is priced based on real farming practices, fresher handling, traceability, and the responsibility of growing food with care. It reflects the cost of doing things properly, not the cost of doing them cheaply.'
    },
    {
      category: 'general',
      question: '15. Why is ANAAD worth choosing?',
      answer: 'Because it is not only food. It is a system of trust. When you choose ANAAD, you support cleaner farming, healthier soil, fairer farm economics, and food that stays visibly connected to the people and land behind it.'
    },
    {
      category: 'general',
      question: '16. How can I trust that no chemicals are used?',
      answer: 'Trust comes from process, not just promises. That is why we document batches, share farm records, and keep the food journey visible so you can understand how each product was grown and handled.'
    },
    {
      category: 'general',
      question: '17. What makes ANAAD different from other natural food brands?',
      answer: 'ANAAD is built around a complete chain of responsibility — from natural farming and traceable batches to commitment-based planning and direct household connection. We are not just selling staples; we are rebuilding the relationship between food, farmer, and family.'
    },
    {
      category: 'subscriptions',
      question: '18. Can I start with one product before committing fully?',
      answer: 'Yes. Many households begin with one product and then move into a Commitment Plan once they experience the difference. It is a simple way to understand the food, the process, and the value of consistency.'
    }
  ];

  // Search and Category Signals
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  activeQuestionIndex = signal<number | null>(null);

  // Form Submission Signals
  submitting = signal<boolean>(false);
  success = signal<boolean>(false);
  errorMessage = signal<string>('');

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

  // Computed FAQs based on search and category
  filteredFaqs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    return this.faqs.filter((faq, idx) => {
      const matchesCategory = category === 'all' || faq.category === category;
      const matchesSearch = !query || 
        faq.question.toLowerCase().includes(query) || 
        faq.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  });

  // Support Form Definition
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    requirementType: ['INDIVIDUAL', Validators.required],
    businessOrFamilyName: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    isFromRfp: [false]
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    // Listen to requirementType changes to conditionally require businessOrFamilyName
    this.form.get('requirementType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        const nameControl = this.form.get('businessOrFamilyName');
        if (type === 'FAMILY' || type === 'BUSINESS') {
          nameControl?.setValidators([Validators.required, Validators.minLength(2)]);
        } else {
          nameControl?.clearValidators();
        }
        nameControl?.updateValueAndValidity();
      });

    // Handle query params for redirection source
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const from = params['is_redirection_from'];
        if (from) {
          this.redirectionFrom.set(from);
        } else {
          this.redirectionFrom.set(null);
          this.registrationSourceService.clearAll();
        }
        if (this.isPdfRequest()) {
          const messageCtrl = this.form.get('message');
          if (messageCtrl && !messageCtrl.value) {
            messageCtrl.setValue('Please send me the PDF version of the article.');
          }
        } else {
          const messageCtrl = this.form.get('message');
          if (messageCtrl && messageCtrl.value === 'Please send me the PDF version of the article.') {
            messageCtrl.setValue('');
          }
        }
      });
  }

  // Handle accordion toggle
  toggleAccordion(index: number): void {
    if (this.activeQuestionIndex() === index) {
      this.activeQuestionIndex.set(null);
    } else {
      this.activeQuestionIndex.set(index);
    }
  }

  // Handle search input
  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.activeQuestionIndex.set(null); // Close any open accordion on new search
  }

  // Set active FAQ category
  setCategory(category: string): void {
    this.selectedCategory.set(category);
    this.activeQuestionIndex.set(null); // Close accordion on category switch
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

  /** Reset OTP state (e.g. when user wants to change contact details) */
  resetOtp(): void {
    this.otpStep.set('idle');
    this.otpMethod.set(null);
    this.otpValue.set('');
    this.otpError.set('');
    this.otpSuccessMsg.set('');
    this.clearResendTimer();
  }

  // Handle Form Submission
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.otpStep() !== 'verified') {
      this.otpError.set('Please verify your identity with OTP before submitting.');
      return;
    }

    this.submitting.set(true);
    this.success.set(false);
    this.errorMessage.set('');

    const val = this.form.value;
    const isPdf = this.isPdfRequest();
    const articleId = this.registrationSourceService.getArticleId();

    const payload: UserQueryPayload = {
      name: val.fullName || '',
      phone_number: val.phoneNumber || '',
      email: val.email || '',
      message: val.message || '',
      requirement_type: val.requirementType || 'INDIVIDUAL',
      business_or_family_name: val.businessOrFamilyName || '',
      is_from_rfp: !!val.isFromRfp,
      redirection_from: isPdf ? 'PDF_REQUEST' : (val.isFromRfp ? 'RFP' : 'USER_QUERY'),
      ...(isPdf && articleId && { article_id: articleId })
    };

    this.logSvc.debug('Help screen submitting user query payload:', payload);

    this.userQueriesService.submitQuery(payload).subscribe({
      next: (res) => {
        this.logSvc.debug('Help screen query submitted successfully:', res);
        this.success.set(true);
        this.submitting.set(false);
        this.form.reset({
          requirementType: 'INDIVIDUAL',
          isFromRfp: false
        });
        this.resetOtp();
        this.registrationSourceService.clearAll();
      },
      error: (err) => {
        this.logSvc.error('Help screen query submission failed:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to submit query. Please check your connection and try again.');
        this.submitting.set(false);
      }
    });
  }
}
