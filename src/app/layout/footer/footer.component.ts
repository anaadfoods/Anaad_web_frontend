import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalService, LegalDocument } from '../../core/services/legal.service';
import { CommonModule } from '@angular/common';
import { AuthState } from '../../core/state/auth.state';
import { ProductService } from '../../core/services/product.service';

export interface FooterCategory {
  id: number;
  name: string;
  products: { id: number; name: string }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  private readonly legalSvc = inject(LegalService);
  readonly authState = inject(AuthState);
  currentYear = new Date().getFullYear();
  legalDocs = signal<LegalDocument[]>([]);
  public footerCategories = signal<FooterCategory[]>([]);
  private readonly prodSvc = inject(ProductService);

  ngOnInit() {
    this.legalSvc.getLatestLegal().subscribe({
      next: (docs) => {
        this.legalDocs.set(docs.filter(d => d.is_active));
      },
      error: (err) => {
        console.error('Failed to load legal documents in footer:', err);
      }
    });

    this.prodSvc.getVariants().subscribe({
      next: (products) => {
        // Dynamically extract categories from products
        const categoryMap = new Map<number, { id: number; name: string }>();
        products.forEach(p => {
          if (p.category && p.category.id && p.category.name) {
            categoryMap.set(p.category.id, p.category);
          }
        });
        
        const mapped = Array.from(categoryMap.values()).map(cat => {
          const catProducts = products.filter(p => p.category?.id === cat.id || p.product_category === cat.name);
          
          // Deduplicate by name
          const uniqueProducts: { id: number; name: string }[] = [];
          const seenNames = new Set<string>();
          
          for (const p of catProducts) {
            const baseName = p.product_name.split('—')[0].trim(); // Optional: shorten name if too long
            if (!seenNames.has(baseName)) {
              seenNames.add(baseName);
              uniqueProducts.push({ id: p.id, name: baseName });
            }
          }
          
          return {
            id: cat.id,
            name: cat.name,
            products: uniqueProducts
          };
        });
        
        // Only show categories that have products, or keep them all if you want
        this.footerCategories.set(mapped.filter(c => c.products.length > 0));
      },
      error: (err) => console.error('Failed to load footer shop categories', err)
    });
  }

  getLegalRoute(typeDisplay: string): string {
    const type = typeDisplay?.toLowerCase() || '';
    if (type.includes('privacy')) return '/privacy-policy';
    if (type.includes('refund')) return '/refund-policy';
    if (type.includes('shipping')) return '/shipping-policy';
    return '/terms-conditions';
  }
}

