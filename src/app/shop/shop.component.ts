import { Component } from '@angular/core';
import { ProductCardComponent, Product } from './product-card/product-card.component';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent {
  products: Product[] = [
    { id: 'ghee', name: 'Organic Ghee', price: 699, image: 'https://images.unsplash.com/photo-1618311112204-56ce91d6ad09?q=80&w=1200&auto=format&fit=crop', badge: 'Best Seller' },
    { id: 'honey', name: 'Raw Forest Honey', price: 399, image: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?q=80&w=1200&auto=format&fit=crop', badge: '100% Natural' },
    { id: 'flour', name: 'Stone‑Ground Flour', price: 249, image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?q=80&w=1200&auto=format&fit=crop' },
    { id: 'spices', name: 'Hand‑pounded Spices', price: 299, image: 'https://images.unsplash.com/photo-1511910849309-0dffb060177e?q=80&w=1200&auto=format&fit=crop' },
    { id: 'oil', name: 'Cold‑Pressed Oil', price: 499, image: 'https://images.unsplash.com/photo-1474978528673-4a50a4508dcf?q=80&w=1200&auto=format&fit=crop' },
    { id: 'millets', name: 'Organic Millets', price: 199, image: 'https://images.unsplash.com/photo-1472145246862-b24cf25c4a36?q=80&w=1200&auto=format&fit=crop' }
  ];
}
