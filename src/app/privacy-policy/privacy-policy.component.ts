import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LegalService } from '../core/services/legal.service';
import { Router } from '@angular/router';

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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  content = signal<SafeHtml | string>('');
  title = signal<string>('Privacy Policy');
  loading = signal(true);

  ngOnInit() {
    this.legalSvc.getLatestLegal().subscribe({
      next: docs => {
        const policy = docs.find(d => d.type_display?.toLowerCase().includes('privacy'));
        if (policy) {
          this.content.set(this.sanitizer.bypassSecurityTrustHtml(policy.content));
          this.title.set(policy.type_display);
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

  onContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');

    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('#')) {
        event.preventDefault();
        const elementId = href.substring(1);
        const element = document.getElementById(elementId);
        if (element) {
          const headerOffset = 200; // Offset for sticky header
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          this.router.navigate([], { fragment: elementId, replaceUrl: true });
        }
      }
    }
  }
}

