import { Component, Input } from '@angular/core';
import { NgIf, DecimalPipe } from '@angular/common';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  badge?: string;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [NgIf, DecimalPipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
  @Input() product!: Product;
}
