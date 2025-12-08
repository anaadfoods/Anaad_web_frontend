import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserQueriesService, UserQueryPayload } from '../shared/services/user-queries.service';
import { RegistrationSourceService } from '../shared/services/registration-source.service';

interface MemberCountResponse {
  success: boolean;
  count: number;
  message: string;
}

@Component({
  selector: 'app-join-waitlist',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-waitlist.component.html',
  styleUrls: ['./join-waitlist.component.scss']
})
export class JoinWaitlistComponent implements OnInit {
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

  ngOnInit(): void {
    // Set source as WAITLIST when user lands on this page
    this.registrationSourceService.setSource('WAITLIST');
    
    // Fetch member count from API
    this.fetchMemberCount();
  }

  private fetchMemberCount(): void {
    this.http.get<MemberCountResponse>('/api/user-query/count/').subscribe({
      next: (response) => {
        if (response.success && response.count) {
          this.memberCount.set(response.count);
          this.animateCount(response.count);
        }
        this.isCountLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch member count:', err);
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
    console.log('Form submit triggered');
    this.submitted = true;
    this.errorMessage = '';
    
    console.log('Form valid:', this.form.valid);
    console.log('Form values:', this.form.value);
    
    if (this.form.invalid) {
      console.log('Form is invalid, errors:', this.form.errors);
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
      is_from_rfp: false,
      redirection_from: this.registrationSourceService.getSource(),
      ...(articleId && { article_id: articleId })
    };

    console.log('Submitting payload:', payload);

    this.userQueriesService.submitQuery(payload).subscribe({
      next: (response) => {
        console.log('Success response:', response);
        this.submitting = false;
        this.form.reset();
        this.submitted = false;
        // Clear source data after successful submission
        this.registrationSourceService.clearAll();
        this.router.navigateByUrl('/thank-you');
      },
      error: (err) => {
        console.error('Full error object:', err);
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Something went wrong. Please try again.';
        console.error('Waitlist registration error:', err);
      }
    });
  }
}
