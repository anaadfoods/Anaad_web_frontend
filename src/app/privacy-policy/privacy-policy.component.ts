import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalService } from '../core/services/legal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss']
})
export class PrivacyPolicyComponent implements OnInit {
  private readonly legalSvc = inject(LegalService);
  content = signal<string>('');
  title = signal<string>('Privacy Policy');
  loading = signal(true);

  ngOnInit() {
    this.legalSvc.getLatestLegal().subscribe({
      next: docs => {
        const policy = docs.find(d => d.is_privacy_policy);
        if (policy) { 
          this.content.set(policy.content); 
          this.title.set(policy.title); 
        } else {
          this.content.set(`
            <h3>Privacy Policy</h3>
            <p>At Anaad Foods, we value your privacy and are committed to protecting your personal information.</p>
            <h4>Information Collection</h4>
            <p>We collect information you provide directly to us when you create an account, place an order, or subscribe to our newsletter.</p>
            <h4>Use of Information</h4>
            <p>Your information is used to process transactions, send periodic emails regarding your order, and improve our website offerings.</p>
            <h4>Data Security</h4>
            <p>We implement a variety of security measures, including 256-bit encryption, to maintain the safety of your personal information.</p>
          `);
        }
        this.loading.set(false);
      },
      error: () => {
        this.content.set('<p>Failed to load privacy policy.</p>');
        this.loading.set(false);
      }
    });
  }
}
