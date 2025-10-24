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
  // Prepared for future API integration; currently seeded with sample products.
  products: Product[] = [
    { id: 'sona-moti-flour', name: 'Cold-Pressed Sona Moti Wheat Flour', price: 320, image: '/assets/images/placeholder-product.svg', badge: 'Benefits' },
    { id: 'sona-moti-flour-2', name: 'Cold-Pressed Sona Moti Wheat Flour', price: 320, image: '/assets/images/placeholder-product.svg', badge: 'Benefits' },
    { id: 'sona-moti-flour-3', name: 'Cold-Pressed Sona Moti Wheat Flour', price: 320, image: '/assets/images/placeholder-product.svg', badge: 'Benefits' },
    { id: 'sona-moti-flour-4', name: 'Cold-Pressed Sona Moti Wheat Flour', price: 320, image: '/assets/images/placeholder-product.svg', badge: 'Benefits' },
    // More placeholders for future API expansion
    { id: 'millet-1', name: 'Organic Millets', price: 199, image: '/assets/images/placeholder-product.svg' },
    { id: 'grain-1', name: 'Traditional Grains', price: 249, image: '/assets/images/placeholder-product.svg' }
  ];
}
