import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-thank-you',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thank-you.component.html',
  styleUrl: './thank-you.component.scss'
})
export class ThankYouComponent {
  constructor(private router: Router) {}

  goBack() {
    this.router.navigateByUrl('/');
  }

  registerAgain() {
    this.router.navigateByUrl('/register');
  }
}
