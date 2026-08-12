import { DoshaType, PrakritiDetail } from '../models/aahar-vigyan.model';

export const PRAKRITI_DETAILS: Record<DoshaType, PrakritiDetail> = {
  vata: {
    name: 'Vata',
    hindi: 'वात · Air + Ether',
    color: '#5DA9D6',
    strengths: ['Creative', 'Quick-thinking', 'Adaptable', 'Enthusiastic', 'Intuitive'],
    watchouts: ['Anxiety', 'Poor sleep', 'Irregular habits', 'Fatigue'],
    goodFoods: ['Warm Ghee', 'Sesame', 'Sweet Potato', 'Warm Milk', 'Almonds', 'Ginger'],
    avoidFoods: ['Cold drinks', 'Raw salads', 'Popcorn', 'Crackers'],
    insight:
      'On Vata-dominant days, eat warm, oily, and grounding foods. Sabudana, warm milk, ghee, and sweet fruits restore balance.',
  },
  pitta: {
    name: 'Pitta',
    hindi: 'पित्त · Fire + Water',
    color: '#C75B2D',
    strengths: ['Intelligent', 'Driven', 'Precise', 'Natural leader'],
    watchouts: ['Inflammation', 'Anger', 'Skin issues', 'Burnout'],
    goodFoods: ['Coconut water', 'Cucumber', 'Coriander', 'Sweet fruits', 'Milk'],
    avoidFoods: ['Chilli', 'Fermented food', 'Alcohol', 'Sour pickles'],
    insight:
      'Cooling, sweet, and bitter foods pacify Pitta. Eat in calm surroundings and never skip meals.',
  },
  kapha: {
    name: 'Kapha',
    hindi: 'कफ · Earth + Water',
    color: '#547C42',
    strengths: ['Steady', 'Loyal', 'Patient', 'Excellent stamina'],
    watchouts: ['Weight gain', 'Sluggishness', 'Congestion', 'Depression'],
    goodFoods: ['Ginger', 'Honey', 'Bitter greens', 'Light soups', 'Pepper'],
    avoidFoods: ['Heavy dairy', 'Sweets', 'Fried food', 'Cold meals'],
    insight:
      'Light, warm, dry, and pungent foods stimulate Kapha. Embrace morning movement and mindful portions.',
  },
};

export const DOSHA_INSIGHTS: Record<DoshaType, { label: string; text: string; nameHi: string }> = {
  vata: {
    nameHi: 'वात · Air + Ether',
    label: '✦ Vata Balancing Insight · वात संतुलन',
    text: 'When Vata is elevated, eat warm, oily, and grounding foods. Sabudana khichdi with ghee, warm milk, and sweet fruits nourish your nervous system. Avoid skipping meals — irregular eating worsens Vata.',
  },
  pitta: {
    nameHi: 'पित्त · Fire + Water',
    label: '✦ Pitta Pacifying Insight · पित्त शांति',
    text: 'When Pitta is elevated, the body runs hot. Cooling foods like coconut water, cucumber, coriander, and sweet ripe fruits pacify the fire. Avoid spicy, fried, and fermented foods.',
  },
  kapha: {
    nameHi: 'कफ · Earth + Water',
    label: '✦ Kapha Stimulating Insight · कफ संतुलन',
    text: 'Kapha types benefit from light, warm, dry, and stimulating foods. Honey, ginger, pepper, and bitter greens are ideal. Avoid heavy dairy, sweets, and large cold meals.',
  },
};
