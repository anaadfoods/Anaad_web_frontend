import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { AuthState } from '../../core/state/auth.state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly cartSvc = inject(CartApiService);
  private readonly favSvc = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authState = inject(AuthState);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loading = false;
  error = '';
  showPassword = false;
  successMessage = '';
  private returnUrl = '/profile';

  ngOnInit() {
    // Synchronously grab returnUrl first
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) this.returnUrl = returnUrl;
    
    this.route.queryParams.subscribe(params => {
      if (params['registered']) this.successMessage = 'Account created! Please sign in.';
    });

    // Already logged in - redirect
    if (this.authState.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  get emailCtrl() { return this.loginForm.get('email')!; }
  get passwordCtrl() { return this.loginForm.get('password')!; }

  togglePassword() { this.showPassword = !this.showPassword; }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    const val = this.loginForm.value;

    this.authSvc.login({ email: val.email!, password: val.password! }).subscribe({
      next: () => {
        this.cartSvc.syncOnLogin();
        this.favSvc.syncOnLogin();
        this.router.navigate([this.returnUrl]);
      },
      error: (err) => {
        this.loading = false;
        const detail = err.error?.detail || err.error?.non_field_errors?.[0];
        this.error = detail || 'Invalid credentials. Please try again.';
      }
    });
  }
}
