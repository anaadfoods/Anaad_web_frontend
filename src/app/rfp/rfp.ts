import { Component, OnInit, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserQueryService } from '../core/services/user-query.service';
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
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  submitting = signal<boolean>(false);
  error = signal<string>('');
  successMessage = signal<string>('');

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

  onSubmit() {
    if (this.rfpForm.invalid) {
      this.rfpForm.markAllAsTouched();
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
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to submit proposal. Please check details.');
      }
    });
  }
}
