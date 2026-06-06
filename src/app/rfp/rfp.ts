import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserQueryService } from '../core/services/user-query.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-rfp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rfp.html',
  styleUrls: ['./rfp.scss']
})
export class Rfp implements OnInit {
  private readonly userQuerySvc = inject(UserQueryService);
  private readonly fb = inject(FormBuilder);

  submitting = signal<boolean>(false);
  error = signal<string>('');
  successMessage = signal<string>('');

  rfpForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    cityState: ['', Validators.required],
    tier: ['Mini Farm', Validators.required],
    plotSize: ['0.25 acres (Mini Farm)', Validators.required],
    startSeason: ['Kharif 2025 (June–Oct)', Validators.required],
    notes: ['']
  });

  ngOnInit() {
  }

  scrollTo(id: string) {
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  selectTier(tier: string) {
    this.rfpForm.patchValue({ tier });
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
      phone_number: `91${formVal.phone}`, // Assuming phone requires country code
      email: formVal.email ?? undefined,
      message: `Tier: ${formVal.tier}\nPlot Size: ${formVal.plotSize}\nSeason: ${formVal.startSeason}\nCity: ${formVal.cityState}\nNotes: ${formVal.notes}`,
      requirement_type: 'B2B' as const,
      is_from_rfp: true,
      redirection_from: 'RFP' as const
    };

    this.userQuerySvc.submitQuery(payload).pipe(
      finalize(() => this.submitting.set(false))
    ).subscribe({
      next: () => {
        this.successMessage.set('Your contract farming proposal was submitted successfully! The farm manager will review it.');
        this.rfpForm.reset({ tier: 'Mini Farm', plotSize: '0.25 acres (Mini Farm)', startSeason: 'Kharif 2025 (June–Oct)' });
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to submit proposal. Please check details.');
      }
    });
  }
}
