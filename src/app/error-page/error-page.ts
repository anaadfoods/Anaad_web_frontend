import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="error-page-wrap">
      <div class="error-content">
        <span class="error-eyebrow">404 Error</span>
        <h1>This field hasn't<br>been <em>sown yet.</em></h1>
        <p>The page you're looking for doesn't exist — but the grain does. Head back to the Pantry or explore the farm.</p>
        <div class="error-actions">
          <a routerLink="/" class="btn-primary">Back to Home &rarr;</a>
          <a routerLink="/products" class="btn-ghost-light">Shop the Pantry &rarr;</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-page-wrap {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 80px 24px;
      background-image: linear-gradient(rgba(26, 26, 26, 0.75), rgba(26, 26, 26, 0.75)), url('https://images.unsplash.com/photo-1500937386664-56d1590d333c?auto=format&fit=crop&w=1200&q=80');
      background-size: cover;
      background-position: center;
      color: var(--bg-parchment, #F5F0E8);
      text-align: center;
    }
    .error-content {
      max-width: 600px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .error-eyebrow {
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.20em;
      text-transform: uppercase;
      color: var(--amber-harvest, #C9943A);
    }
    h1 {
      font-family: var(--font-serif);
      font-size: 48px;
      font-weight: 700;
      line-height: 1.15;
      margin: 0;
    }
    h1 em {
      font-style: italic;
      color: var(--amber-harvest, #C9943A);
    }
    p {
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.6;
      font-weight: 300;
      color: rgba(245, 240, 232, 0.9);
      margin: 0;
    }
    .error-actions {
      display: flex;
      gap: 16px;
      margin-top: 12px;
    }
    .btn-primary {
      background-color: var(--green-deep, #2C4A1E);
      color: #fff;
      border: 1px solid var(--green-deep);
      padding: 12px 24px;
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary:hover {
      background-color: var(--color-primary-600, #2f4634);
      border-color: var(--color-primary-600, #2f4634);
    }
    .btn-ghost-light {
      background-color: transparent;
      color: #fff;
      border: 1px solid #fff;
      padding: 12px 24px;
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-ghost-light:hover {
      background-color: #fff;
      color: var(--charcoal, #1A1A1A);
    }
  `]
})
export class ErrorPageComponent implements OnInit {
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);

  ngOnInit() {
    this.titleSvc.setTitle('404 Page Not Found | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: "The page you're looking for doesn't exist — but the grain does. Explore the Heirloom Pantry or choose your subscription commitment."
    });
  }
}
