/** Dosha effect: negative = pacifies, positive = aggravates */
export interface FoodItem {
  id: string;
  emoji: string;
  name: string;
  vata: number;
  pitta: number;
  kapha: number;
  /** Allowed on Ekadashi / upvas */
  ekadashiOk?: boolean;
  /** Extra beneficial in these ritus */
  rituBoost?: string[];
}

export const FOOD_CATALOG: FoodItem[] = [
  { id: 'ghee', emoji: '🫒', name: 'Pure Ghee', vata: -2, pitta: -1, kapha: 0, ekadashiOk: true },
  { id: 'warm-milk', emoji: '🥛', name: 'Warm Milk', vata: -2, pitta: -1, kapha: 1, ekadashiOk: true },
  { id: 'sabudana', emoji: '🫙', name: 'Sabudana', vata: -1, pitta: 0, kapha: 0, ekadashiOk: true },
  { id: 'sweet-potato', emoji: '🍠', name: 'Sweet Potato', vata: -2, pitta: -1, kapha: 0, ekadashiOk: true, rituBoost: ['Hemant', 'Shishir'] },
  { id: 'banana', emoji: '🍌', name: 'Banana', vata: -1, pitta: -1, kapha: 1, ekadashiOk: true },
  { id: 'dates', emoji: '🌴', name: 'Dates', vata: -2, pitta: -1, kapha: 1, ekadashiOk: true },
  { id: 'almonds', emoji: '🥜', name: 'Soaked Almonds', vata: -2, pitta: 0, kapha: 1, ekadashiOk: true },
  { id: 'ginger-tea', emoji: '🫖', name: 'Ginger Tea', vata: -2, pitta: 1, kapha: -2, ekadashiOk: true, rituBoost: ['Varsha', 'Shishir'] },
  { id: 'honey', emoji: '🍯', name: 'Raw Honey', vata: -1, pitta: -1, kapha: -2, ekadashiOk: true },
  { id: 'moong-dal', emoji: '🫘', name: 'Moong Dal', vata: -1, pitta: -1, kapha: -2, rituBoost: ['Varsha'] },
  { id: 'basmati', emoji: '🍚', name: 'Basmati Rice', vata: -1, pitta: -1, kapha: 1 },
  { id: 'coconut-water', emoji: '🥥', name: 'Coconut Water', vata: -1, pitta: -2, kapha: 0, ekadashiOk: true, rituBoost: ['Grishma', 'Sharad'] },
  { id: 'cucumber', emoji: '🥒', name: 'Cucumber', vata: 0, pitta: -2, kapha: 0, ekadashiOk: true, rituBoost: ['Grishma'] },
  { id: 'coriander', emoji: '🌿', name: 'Coriander', vata: 0, pitta: -2, kapha: 0, ekadashiOk: true },
  { id: 'leafy-greens', emoji: '🥬', name: 'Leafy Greens', vata: 1, pitta: -1, kapha: -2, rituBoost: ['Vasant'] },
  { id: 'bitter-gourd', emoji: '🥒', name: 'Bitter Gourd', vata: 0, pitta: -2, kapha: -2, rituBoost: ['Varsha', 'Grishma'] },
  { id: 'turmeric-milk', emoji: '🥛', name: 'Turmeric Milk', vata: -1, pitta: -1, kapha: 0, ekadashiOk: true },
  { id: 'seasonal-fruits', emoji: '🥭', name: 'Seasonal Fruits', vata: -1, pitta: -1, kapha: 0, ekadashiOk: true },
  { id: 'barley', emoji: '🌾', name: 'Barley', vata: 0, pitta: -1, kapha: -2 },
  { id: 'oats', emoji: '🌾', name: 'Oats', vata: -1, pitta: -1, kapha: 0 },
  { id: 'carrot', emoji: '🥕', name: 'Carrot', vata: -1, pitta: -1, kapha: 0, ekadashiOk: true },
  { id: 'rock-salt', emoji: '🧂', name: 'Sendha Namak', vata: -1, pitta: 0, kapha: 0, ekadashiOk: true },
  { id: 'pepper', emoji: '🌶', name: 'Black Pepper', vata: -1, pitta: 1, kapha: -2, ekadashiOk: true },
  { id: 'light-soup', emoji: '🍲', name: 'Light Soup', vata: -1, pitta: -1, kapha: -2, rituBoost: ['Varsha', 'Shishir'] },
  { id: 'bottle-gourd', emoji: '🥒', name: 'Bottle Gourd', vata: 0, pitta: -2, kapha: -1, ekadashiOk: true, rituBoost: ['Varsha'] },
  { id: 'old-rice', emoji: '🍚', name: 'Old Rice', vata: -1, pitta: -1, kapha: 0, rituBoost: ['Varsha'] },
  { id: 'sesame', emoji: '🌰', name: 'Sesame', vata: -2, pitta: 1, kapha: 1, ekadashiOk: true, rituBoost: ['Hemant', 'Shishir'] },
  { id: 'jaggery', emoji: '🍯', name: 'Jaggery', vata: -1, pitta: -1, kapha: 1, ekadashiOk: true },
  { id: 'mint-tea', emoji: '🫖', name: 'Mint Tea', vata: 0, pitta: -2, kapha: 0, ekadashiOk: true },
  { id: 'lemon-water', emoji: '🍋', name: 'Lemon Water', vata: 0, pitta: -1, kapha: -2, ekadashiOk: true },
  { id: 'potato-plain', emoji: '🥔', name: 'Potato (plain)', vata: -1, pitta: 0, kapha: 1, ekadashiOk: true },
  { id: 'kuttu', emoji: '🌾', name: 'Kuttu Flour', vata: -1, pitta: 0, kapha: 0, ekadashiOk: true },
  { id: 'singhara', emoji: '🌰', name: 'Singhara', vata: -1, pitta: 0, kapha: 0, ekadashiOk: true },
  { id: 'curd-small', emoji: '🥛', name: 'Fresh Curd (small qty)', vata: 0, pitta: -1, kapha: 1, ekadashiOk: true },
  // Aggravating / avoid candidates
  { id: 'cold-drinks', emoji: '🧊', name: 'Cold Drinks', vata: 2, pitta: 1, kapha: 1 },
  { id: 'raw-salad', emoji: '🥗', name: 'Raw Salads', vata: 2, pitta: 0, kapha: 1 },
  { id: 'deep-fried', emoji: '🍟', name: 'Deep Fried', vata: 1, pitta: 2, kapha: 2 },
  { id: 'chilli', emoji: '🌶', name: 'Chilli & Spice', vata: 1, pitta: 2, kapha: 0 },
  { id: 'alcohol', emoji: '🍺', name: 'Alcohol', vata: 2, pitta: 2, kapha: 1 },
  { id: 'coffee', emoji: '☕', name: 'Strong Coffee', vata: 2, pitta: 2, kapha: 0 },
  { id: 'onion-garlic', emoji: '🧅', name: 'Onion & Garlic', vata: 1, pitta: 2, kapha: 0 },
  { id: 'red-meat', emoji: '🥩', name: 'Red Meat', vata: 1, pitta: 2, kapha: 2 },
  { id: 'aged-cheese', emoji: '🧀', name: 'Aged Cheese', vata: 1, pitta: 2, kapha: 2 },
  { id: 'sour-pickles', emoji: '🍋', name: 'Sour Pickles', vata: 0, pitta: 2, kapha: 0 },
  { id: 'heavy-dairy', emoji: '🧈', name: 'Heavy Dairy', vata: 0, pitta: 1, kapha: 2 },
  { id: 'sweets', emoji: '🍬', name: 'Heavy Sweets', vata: 0, pitta: 1, kapha: 2 },
  { id: 'white-bread', emoji: '🍞', name: 'White Bread', vata: 0, pitta: 0, kapha: 2 },
  { id: 'ice-cream', emoji: '🍦', name: 'Ice Cream', vata: 2, pitta: 1, kapha: 2 },
  { id: 'fermented', emoji: '🫙', name: 'Fermented Foods', vata: 1, pitta: 2, kapha: 1, rituBoost: ['Varsha'] },
  { id: 'rice-wheat', emoji: '🍚', name: 'Rice & Wheat', vata: 0, pitta: 0, kapha: 1 },
  { id: 'all-lentils', emoji: '🫘', name: 'All Lentils', vata: 0, pitta: 1, kapha: 1 },
  { id: 'table-salt', emoji: '🧂', name: 'Table Salt', vata: 1, pitta: 1, kapha: 0 },
  { id: 'popcorn', emoji: '🍿', name: 'Popcorn', vata: 2, pitta: 0, kapha: 1 },
  { id: 'seafood', emoji: '🦐', name: 'Seafood', vata: 1, pitta: 2, kapha: 2, rituBoost: ['Varsha'] },
  { id: 'excess-potato', emoji: '🥔', name: 'Excess Potato', vata: 0, pitta: 0, kapha: 2 },
];

export const EKADASHI_FORCED_AVOID_IDS = ['rice-wheat', 'all-lentils', 'onion-garlic', 'red-meat', 'table-salt', 'alcohol', 'deep-fried', 'chilli'];
