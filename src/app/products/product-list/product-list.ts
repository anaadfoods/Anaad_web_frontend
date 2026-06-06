import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CategoryService } from '../../core/services/category.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ProductCategory, ProductVariant } from '../../core/models/product.model';
import { CartApiService } from '../../core/services/cart-api.service';
import { ProductService } from '../../core/services/product.service';
import { AuthState } from '../../core/state/auth.state';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, SkeletonLoaderComponent],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.scss'],
})
export class ProductList implements OnInit, OnDestroy {
  private readonly categorySvc = inject(CategoryService);
  private readonly productSvc = inject(ProductService);
  private readonly cartSvc = inject(CartApiService);
  private readonly authState = inject(AuthState);
  private readonly toastSvc = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);

  categories = signal<ProductCategory[]>([]);
  allProducts = signal<ProductVariant[]>([]);
  filteredProducts = signal<ProductVariant[]>([]);

  activeCategoryId = signal<string>('all');
  loading = signal<boolean>(true);
  searchQuery = signal<string>('');
  cartAddingIds = signal<Set<number>>(new Set());

  ngOnInit() {
    this.titleSvc.setTitle('Heirloom Pantry — Cold Stone-Milled Flour & Unpolished Rice | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Single-origin heirloom wheat flour, Chawal Kathiya red rice, Barnyard millet, and more — milled on the farm within 14 days of harvest and dispatched within 72 hours. SGS-certified zero residue on every batch.'
    });

    this.loadData();

    // Handle category from query param
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['category']) {
        this.activeCategoryId.set(params['category']);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading.set(true);

    this.categorySvc.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => undefined
    });

    this.productSvc.getVariants().subscribe({
      next: (variants) => {
        this.allProducts.set(variants);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  filterByCategory(categoryId: string) {
    this.activeCategoryId.set(categoryId);
    this.applyFilters();
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    if (query.trim().length > 1) {
      this.productSvc.search(query.trim()).subscribe({
        next: variants => this.filteredProducts.set(variants),
        error: () => undefined
      });
    } else {
      this.applyFilters();
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.applyFilters();
  }

  private applyFilters() {
    const catId = this.activeCategoryId();
    const query = this.searchQuery().toLowerCase().trim();
    let products = this.allProducts();

    if (catId !== 'all') {
      const numId = Number(catId);
      const category = this.categories().find(c => c.id === numId);
      products = products.filter(v =>
        v.category?.id === numId || v.product_category === category?.name
      );
    }

    if (query.length > 1) {
      products = products.filter(v =>
        v.product_name.toLowerCase().includes(query) ||
        v.product_description?.toLowerCase().includes(query)
      );
    }

    this.filteredProducts.set(products);
  }

  getCategoryCount(categoryId: number | 'all'): number {
    if (categoryId === 'all') return this.allProducts().length;
    const category = this.categories().find(c => c.id === categoryId);
    return this.allProducts().filter(v =>
      v.category?.id === categoryId || v.product_category === category?.name
    ).length;
  }

  onAddToCart(variant: ProductVariant) {
    if (!this.authState.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
      return;
    }
    const adding = new Set(this.cartAddingIds());
    adding.add(variant.id);
    this.cartAddingIds.set(adding);

    this.cartSvc.addItem(variant.id, 1).subscribe({
      next: () => {
        const done = new Set(this.cartAddingIds());
        done.delete(variant.id);
        this.cartAddingIds.set(done);
        this.toastSvc.show(`Added ${variant.product_name} to cart!`, 'success');
      },
      error: () => {
        const done = new Set(this.cartAddingIds());
        done.delete(variant.id);
        this.cartAddingIds.set(done);
        this.toastSvc.show(`Failed to add ${variant.product_name} to cart.`, 'error');
      },
    });
  }

}
