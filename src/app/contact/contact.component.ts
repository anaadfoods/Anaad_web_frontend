import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API } from '../core/constants/api-endpoints';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

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

  get f() { return this.form.controls; }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
      },
      error: (err) => {
        this.errorMessage.set('Failed to submit your query. Please try again later.');
        this.isSubmitting.set(false);
      }
    });
  }
}
