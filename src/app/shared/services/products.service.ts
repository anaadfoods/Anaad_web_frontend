import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface ProductImage {
  image: string;
  alt_text: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  weight: string;
  weight_unit: string;
  price: string;
  discount_percentage: string;
  final_price: string;
  is_in_stock: boolean;
  stock_quantity: number;
  is_active: boolean;
  product_name: string;
  product_category_id: string;
  product_description: string;
  product_category: string;
  product_images: ProductImage[];
}

export interface ProductCard {
  id: number;
  name: string;
  pricePerKg: string;
  image: string;
  altText: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private endpoint = '/api/products/variants/';

  getProducts(): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(this.endpoint);
  }

  getFirstFourProducts(): Observable<ProductCard[]> {
    return this.getProducts().pipe(
      map(products => {
        return products.slice(0, 4).map(p => this.toProductCard(p));
      })
    );
  }

  private toProductCard(product: ProductVariant): ProductCard {
    // Calculate price per kg
    const weightNum = parseFloat(product.weight);
    const priceNum = parseFloat(product.final_price);
    
    let pricePerKg = 'N/A';
    if (weightNum > 0 && !isNaN(priceNum)) {
      if (product.weight_unit === 'g') {
        // Convert grams to kg (1000g = 1kg)
        pricePerKg = `Rs ${(priceNum * 1000 / weightNum).toFixed(2)}/kg`;
      } else if (product.weight_unit === 'kg') {
        // Already in kg
        pricePerKg = `Rs ${priceNum.toFixed(2)}/kg`;
      }
    }

    // Get the first image or use a placeholder
    const imageUrl = product.product_images.length > 0 
      ? this.normalizeImageUrl(product.product_images[0].image)
      : '/assets/images/placeholder-product.svg';

    const altText = product.product_images.length > 0 
      ? (product.product_images[0].alt_text || product.product_name)
      : product.product_name;

    return {
      id: product.id,
      name: product.product_name,
      pricePerKg,
      image: imageUrl,
      altText
    };
  }

  private normalizeImageUrl(raw: string): string {
    if (!raw) return '/assets/images/placeholder-product.svg';
    const s = String(raw).trim();
    // If markdown-style: [text](url), extract URL inside parentheses
    const md = s.match(/\((https?:\/\/[^)]+)\)/);
    if (md && md[1]) return md[1];
    // If wrapped in brackets only, strip them
    if (s.startsWith('[') && s.endsWith(']')) {
      return s.slice(1, -1);
    }
    return s;
  }
}
