// ============================================
// Cart Models
// Mapped from: /api/cart/* endpoints
// ============================================

import { ProductVariant } from './product.model';

/** Single item inside a cart */
export interface CartItem {
  id: number;
  product_variant: number;
  product_variant_detail?: ProductVariant;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price: string;
  total_price: string;
  image?: string;
  weight?: string;
  unit?: string;
}

/** GET /api/cart/details/ */
export interface Cart {
  id: number;
  items: CartItem[];
  total_price: string;
  total_items: number;
  created_at?: string;
  updated_at?: string;
}

/** POST /api/cart/items/add/ */
export interface AddCartItemRequest {
  product_variant_id: number;
  quantity: number;
}

/** PUT /api/cart/items/update/ */
export interface UpdateCartItemRequest {
  product_variant_id: number;
  quantity: number;
}

/** DELETE /api/cart/items/remove/ */
export interface RemoveCartItemRequest {
  product_variant_id: number;
}

/** Empty cart state constant */
export const EMPTY_CART: Cart = {
  id: 0,
  items: [],
  total_price: '0.00',
  total_items: 0,
};
