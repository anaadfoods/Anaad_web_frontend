import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    requirementType: ['', Validators.required],
    familyName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(5)]],
  });

  submitting = false;
  submitted = false;

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;
    this.submitting = true;
    // Simulate submission
    setTimeout(() => {
      this.submitting = false;
      this.form.reset();
      this.submitted = false;
      // Navigate to Thank You page
      this.router.navigateByUrl('/thank-you');
    }, 600);
  }
}
