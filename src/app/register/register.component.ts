import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserQueriesService, UserQueryPayload } from '../shared/services/user-queries.service';
import { RegistrationSourceService } from '../shared/services/registration-source.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private userQueriesService = inject(UserQueriesService);
  private registrationSourceService = inject(RegistrationSourceService);

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    requirementType: ['', Validators.required],
    familyName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(5)]],
  });

  submitting = false;
  submitted = false;
  errorMessage = '';

  get f() { return this.form.controls; }

  ngOnInit(): void {
    // Only set USER_QUERY if no source is already set (user came directly)
    // This preserves sources set from other pages (like PDF_REQUEST or RFP)
    const currentSource = this.registrationSourceService.getSource();
    if (currentSource === 'USER_QUERY') {
      // Default source for direct registration page visits
      this.registrationSourceService.setSource('USER_QUERY');
    }
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

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

    this.userQueriesService.submitQuery(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.form.reset();
        this.submitted = false;
        // Clear source data after successful submission
        this.registrationSourceService.clearAll();
        this.router.navigateByUrl('/thank-you');
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Something went wrong. Please try again.';
        console.error('Registration error:', err);
      }
    });
  }
}
