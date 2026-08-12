// ============================================
// Product Models
// Mapped from: /api/products/* endpoints
// ============================================

/** Image nested inside a product variant */
export interface ProductImage {
  id: number;
  image: string;
  alt_text?: string;
  is_primary?: boolean;
}

/** Category for product filtering */
export interface ProductCategory {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  is_active?: boolean;
  products_count?: number;
}

/** GET /api/products/variants/ — single variant */
export interface ProductVariant {
  id: number;
  product?: number;
  product_name: string;
  product_description: string;
  product_tagline?: string;
  variant_name?: string;
  sku: string;
  weight: string;
  weight_unit?: string;
  unit?: string;
  price: string;
  compare_at_price?: string;
  discount_percentage?: string;
  final_price?: string;
  stock: number;
  is_in_stock?: boolean;
  is_active?: boolean;
  tag?: boolean;
  is_available: boolean;
  is_subscription_eligible?: boolean;
  is_featured?: boolean;
  is_bestseller?: boolean;
  crop_cycle_id?: string | null;
  images: ProductImage[];
  product_images?: ProductImage[];
  product_category?: string;
  category?: ProductCategory;
  created_at?: string;
  updated_at?: string;
}

/** Card-level view model derived from ProductVariant */
export interface ProductCardVM {
  id: number;
  name: string;
  tagline: string;
  description: string;
  weight: string;
  unit: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  category: string;
  isFavorite: boolean;
}

/** GET /api/core/banners/ */
export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image: string;
  mobile_image?: string;
  link?: string;
  is_active: boolean;
  order: number;
}

/** Helper: Convert API variant to card view model */
export function toProductCardVM(
  variant: ProductVariant,
  favoriteIds: Set<number> = new Set()
): ProductCardVM {
  const images = variant.images?.length ? variant.images : (variant.product_images ?? []);
  const primaryImage = images.find(i => i.is_primary) ?? images[0];
  const unit = variant.unit ?? variant.weight_unit ?? '';
  const price = variant.final_price ?? variant.price;
  const compareAt = variant.compare_at_price ?? (variant.final_price ? variant.price : undefined);
  return {
    id: variant.id,
    name: variant.product_name,
    tagline: variant.product_tagline ?? '',
    description: variant.product_description,
    weight: variant.weight,
    unit,
    price: parseFloat(price),
    compareAtPrice: compareAt ? parseFloat(compareAt) : null,
    imageUrl: primaryImage?.image ?? '',
    isAvailable: variant.is_available,
    isFeatured: !!variant.is_featured,
    isBestseller: !!variant.is_bestseller,
    category: variant.category?.name ?? variant.product_category ?? 'Uncategorized',
    isFavorite: favoriteIds.has(variant.id),
  };
}
