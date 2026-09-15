import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  template: '<div style="min-height: 60vh; display: flex; align-items: center; justify-content: center;"><p style="font-family: sans-serif; color: rgba(26,26,26,0.6);">Redirecting to Account Settings...</p></div>',
})
export class DeleteAccountComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit() {
    this.router.navigate(['/profile'], { queryParams: { tab: 'settings' }, replaceUrl: true });
  }
}
