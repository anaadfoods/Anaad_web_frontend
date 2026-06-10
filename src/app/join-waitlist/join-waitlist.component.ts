import { LogService } from '../core/services/log.service';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserQueriesService, UserQueryPayload } from '../core/services/user-queries.service';
import { RegistrationSourceService } from '../core/services/registration-source.service';

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

  // Member count signals
  memberCount = signal<number>(0);
  displayCount = signal<number>(0);
  isCountLoading = signal<boolean>(true);

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
