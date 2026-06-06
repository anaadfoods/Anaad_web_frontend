import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LegalService } from '../core/services/legal.service';

@Component({
  selector: 'app-terms-conditions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.scss']
})
export class TermsConditionsComponent implements OnInit {
  private readonly legalSvc = inject(LegalService);
  private readonly router = inject(Router);

  content = signal<string>('');
  title = signal<string>('Legal Document');
  loading = signal(true);

  ngOnInit() {
    const url = this.router.url;
    
    this.legalSvc.getLatestLegal().subscribe({
      next: docs => {
        let doc;
        if (url.includes('refund-policy')) {
          doc = docs.find(d => (d as any).is_refund_policy);
          this.title.set('Refund Policy');
        } else if (url.includes('shipping-policy')) {
          doc = docs.find(d => (d as any).is_shipping_policy);
          this.title.set('Shipping Policy');
        } else {
          doc = docs.find(d => d.is_terms_and_conditions);
          this.title.set('Terms & Conditions');
        }
        
        if (doc) {
          this.content.set(doc.content);
          this.title.set(doc.title);
        } else {
          // Provide fallback content
          if (url.includes('refund-policy')) {
            this.content.set(`
              <h3>Return & Refund Policy</h3>
              <p>At Anaad, we strive to ensure that all our farm-fresh products reach you in the best condition. If you receive a damaged or defective product, please contact us within 48 hours of delivery.</p>
              <h4>Refund Process</h4>
              <ul>
                <li>Provide photographic evidence of the damaged product.</li>
                <li>Our team will inspect and verify the claim.</li>
                <li>Approved refunds will be processed to the original method of payment within 5-7 business days.</li>
              </ul>
              <p>Please note that due to the perishable nature of our heirloom staples, we cannot accept returns for products simply because you changed your mind.</p>
            `);
          } else if (url.includes('shipping-policy')) {
            this.content.set(`
              <h3>Shipping Policy</h3>
              <p>We deliver across India using specialized cold-chain logistics to ensure product freshness.</p>
              <h4>Delivery Timelines</h4>
              <ul>
                <li>Metro Cities: 2-3 business days.</li>
                <li>Other regions: 4-7 business days.</li>
              </ul>
              <h4>Shipping Charges</h4>
              <p>We offer free shipping on all orders above ₹1,200. For orders below this amount, a flat rate of ₹150 applies.</p>
            `);
          } else {
            this.content.set(`
              <h3>Terms & Conditions</h3>
              <p>Welcome to Anaad Foods. By accessing or using our website, you agree to be bound by these terms.</p>
              <h4>Use of the Site</h4>
              <p>You agree to use the site only for lawful purposes. The content on this website, including text, graphics, and logos, is the property of Anaad Foods.</p>
              <h4>Product Availability</h4>
              <p>Since we rely on natural farming methods, product availability is subject to seasonal changes and harvest outcomes.</p>
            `);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.content.set('<p>Failed to load legal document.</p>');
        this.loading.set(false);
      }
    });
  }
}
