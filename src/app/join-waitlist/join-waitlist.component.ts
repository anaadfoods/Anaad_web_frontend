import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserQueriesService, UserQueryPayload } from '../shared/services/user-queries.service';

@Component({
  selector: 'app-join-waitlist',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-waitlist.component.html',
  styleUrls: ['./join-waitlist.component.scss']
})
export class JoinWaitlistComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private userQueriesService = inject(UserQueriesService);

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

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.submitting = true;

    const payload: UserQueryPayload = {
      name: this.form.value.fullName || '',
      phone_number: this.form.value.phoneNumber || '',
      email: this.form.value.email || '',
      message: this.form.value.message || '',
      requirement_type: this.form.value.requirementType || '',
      business_or_family_name: this.form.value.familyName || '',
      is_from_rfp: false
    };

    this.userQueriesService.submitQuery(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.form.reset();
        this.submitted = false;
        this.router.navigateByUrl('/thank-you');
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Something went wrong. Please try again.';
        console.error('Waitlist registration error:', err);
      }
    });
  }
}
