import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserQueriesService, UserQueryPayload } from '../shared/services/user-queries.service';
import { RegistrationSourceService } from '../shared/services/registration-source.service';

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
  private userQueriesService = inject(UserQueriesService);
  private registrationSourceService = inject(RegistrationSourceService);

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
