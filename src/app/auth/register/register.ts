import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

export const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirm_password')?.value;
  return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);

  registerForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone_number: ['', [Validators.required, Validators.pattern('^[+]?[0-9]{10,13}$')]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]],
    referral_code: [''],
    agree_terms: [false, [Validators.requiredTrue]]
  }, { validators: passwordMatchValidator });

  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  get f() { return this.registerForm.controls; }
  get passwordStrength(): 'weak' | 'medium' | 'strong' | 'none' {
    const pw = this.f.password.value || '';
    if (pw.length < 4) return 'none';
    if (pw.length < 8) return 'weak';
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
    const score = [hasUpper, hasNum, hasSymbol].filter(Boolean).length;
    if (score >= 2 && pw.length >= 10) return 'strong';
    return 'medium';
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const val = this.registerForm.value;
    const req = {
      username: val.email!,
      email: val.email!,
      first_name: val.first_name!,
      last_name: val.last_name!,
      password: val.password!,
      confirm_password: val.confirm_password!,
      phone_number: val.phone_number!,
      referral_code: val.referral_code || undefined,
    };

    this.authSvc.register(req).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err) => {
        this.loading = false;
        const errorData = err.error;
        if (errorData?.email?.[0]) { this.error = errorData.email[0]; return; }
        if (errorData?.phone_number?.[0]) { this.error = errorData.phone_number[0]; return; }
        if (errorData?.username?.[0]) { this.error = 'Email is already in use.'; return; }
        if (errorData?.password?.[0]) { this.error = errorData.password[0]; return; }
        this.error = errorData?.message || errorData?.detail || 'Registration failed. Please check your details.';
      }
    });
  }
}
