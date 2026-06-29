import { DoshaType } from '../models/aahar-vigyan.model';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
export const VARA_SANSKRIT = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara'];
export const VARA_PLANET = ['Sun · सूर्य', 'Moon · चंद्र', 'Mars · मंगल', 'Mercury · बुध', 'Jupiter · गुरु', 'Venus · शुक्र', 'Saturn · शनि'];

export const NEUTRAL_FOODS = ['Sendha Namak', 'Curd (fresh, small qty)', 'Kuttu Flour', 'Singhara', 'Potato (plain)'];

export const FOOD_INFO = {
  hydration: {
    label: 'Hydration',
    value: 'Warm Water',
    desc: 'Sip warm or room-temperature water throughout the day. Coconut water is especially beneficial. Avoid cold beverages completely today.',
  },
  cooking: {
    label: 'Cooking Method',
    value: 'Steam & Simmer',
    desc: 'Light cooking only — steaming, simmering, and gentle sautéing in ghee. Avoid deep frying. Use minimal spices. Cook with love.',
  },
  timing: {
    label: 'Best Meal Timing',
    value: '11 AM – 1 PM',
    desc: 'One main meal between 11 AM and 1 PM when digestive fire is strongest. Light fruit or milk in morning. Avoid heavy dinner after 7 PM.',
  },
};

export const SEASON_DATA = {
  varsha: {
    name: 'Varsha Ritu',
    subtitle: 'the monsoon season.',
    period: 'June – August',
    desc: 'June–August brings Varsha Ritu, when digestive fire naturally weakens. Ancient Ayurveda recommends light, warm, easily digestible foods and advises against eating heavy, cold, or fermented foods.',
    principle: '"In Varsha Ritu, eat as nature eats — lightly, warmly, simply. The monsoon is for restoration, not indulgence."',
    picks: 'Bottle gourd, ridge gourd, ginger, turmeric, moong dal, old rice, and saindhav salt are ideal for monsoon eating.',
    avoids: 'Leafy greens (worms), curd at night, heavy sweets, fermented foods, seafood, and large meals should all be reduced now.',
    herbs: "Haritaki, dry ginger, long pepper (pippali), and ajwain are the season's guardian herbs — one pinch daily with warm water.",
    ritual: 'Begin each monsoon morning with warm water + dry ginger + a drop of honey. Protect your Agni (digestive fire) through the season.',
  },
  grishma: {
    name: 'Grishma Ritu',
    subtitle: 'the summer season.',
    period: 'May – June',
    desc: 'Summer heat depletes moisture. Favour cooling, sweet, and liquid foods while avoiding heavy, oily, and overly spicy meals.',
    principle: '"In Grishma, let food be your medicine — cool, light, and sweet to pacify the fire of summer."',
    picks: 'Coconut water, cucumber, melons, rice, milk, ghee, and sweet fruits are ideal in summer.',
    avoids: 'Heavy fried foods, excess salt, sour pickles, and alcohol increase Pitta in summer.',
    herbs: 'Coriander, mint, fennel, and rose water help cool the body naturally.',
    ritual: 'Start mornings with room-temperature water and a few soaked almonds before the heat rises.',
  },
  hemant: {
    name: 'Hemant Ritu',
    subtitle: 'the early winter season.',
    period: 'November – January',
    desc: 'Digestive fire is strongest in Hemant. Nourishing, warming foods build strength and immunity for the cold months.',
    principle: '"In Hemant, eat generously but wisely — warmth and nourishment are the gifts of the season."',
    picks: 'Whole grains, sesame, jaggery, root vegetables, ghee, and warm spiced milk are ideal.',
    avoids: 'Cold raw foods, ice, and excessive fasting weaken immunity in winter.',
    herbs: 'Dry ginger, cinnamon, and ashwagandha support warmth and vitality.',
    ritual: 'A morning abhyanga with warm sesame oil before bath strengthens Vata and Kapha.',
  },
  shishir: {
    name: 'Shishir Ritu',
    subtitle: 'the late winter season.',
    period: 'January – February',
    desc: 'Late winter calls for deeply warming, oily, and grounding foods to maintain inner heat.',
    principle: '"Shishir demands depth — rich, warm, unctuous foods sustain life in the coldest days."',
    picks: 'Ghee, dates, nuts, warm soups, millets, and spiced lentils are deeply nourishing.',
    avoids: 'Cold drinks, raw salads, and light fasting are unsuitable in peak cold.',
    herbs: 'Pippali, ginger, and licorice root kindle Agni in deep winter.',
    ritual: 'End evenings with warm turmeric milk to promote restful sleep.',
  },
  vasanta: {
    name: 'Vasanta Ritu',
    subtitle: 'the spring season.',
    period: 'March – April',
    desc: 'Spring awakens Kapha. Light, bitter, and astringent foods help clear accumulated heaviness from winter.',
    principle: '"Vasanta is for renewal — bitter greens and light grains cleanse the body for the year ahead."',
    picks: 'Bitter greens, barley, honey, berries, and light pulses support spring cleansing.',
    avoids: 'Heavy dairy, sweets, and fried foods aggravate Kapha in spring.',
    herbs: 'Triphala, turmeric, and neem support gentle detoxification.',
    ritual: 'Morning warm water with honey and lemon awakens digestion in Vasanta.',
  },
  sharad: {
    name: 'Sharad Ritu',
    subtitle: 'the autumn season.',
    period: 'September – October',
    desc: 'Autumn Pitta accumulates. Sweet, bitter, and cooling foods restore balance after the rains.',
    principle: '"Sharad asks for sweetness and calm — pacify Pitta before winter\'s dryness arrives."',
    picks: 'Sweet fruits, rice, coconut, ghee, and cooling vegetables are ideal in Sharad.',
    avoids: 'Sour, salty, and excessively hot foods disturb Pitta in autumn.',
    herbs: 'Amalaki, coriander, and sandalwood-infused water cool the system.',
    ritual: 'Eat your main meal at midday when Pitta is naturally balanced.',
  },
};

export function getSeasonKey(month: number): keyof typeof SEASON_DATA {
  if (month >= 5 && month <= 8) return 'varsha';
  if (month === 4 || month === 5) return 'grishma';
  if (month === 10 || month === 11) return 'hemant';
  if (month === 0 || month === 1) return 'shishir';
  if (month === 2 || month === 3) return 'vasanta';
  return 'sharad';
}

export function getTodayDoshaBars(dominant: DoshaType): { vata: number; pitta: number; kapha: number } {
  const base = { vata: 20, pitta: 20, kapha: 20 };
  if (dominant === 'vata') return { vata: 68, pitta: 24, kapha: 8 };
  if (dominant === 'pitta') return { vata: 18, pitta: 65, kapha: 17 };
  return { vata: 15, pitta: 22, kapha: 63 };
}

export const KUNDALI_PLANET_CARDS = [
  { name: 'Venus / Shukra', house: 'H-I Lagna', color: '#C86080', symbol: '♀', food: 'Sweet fruits, dairy, white foods, curd, rice sweets, and aesthetically presented meals align with Shukra energy.', highlight: 'Dominant planet.' },
  { name: 'Moon / Chandra', house: 'H-IV Rohini', color: '#7090B8', symbol: '☽', food: 'Rohini enhances milk, roots, white rice, and all white/pale coloured nourishing foods.', highlight: 'Nakshatra lord.' },
  { name: 'Sun / Surya', house: 'H-IX', color: '#E8A020', symbol: '☉', food: 'Wheat (on non-fast days), jaggery, sesame, and warming spices like saffron and cardamom support Solar vitality.', highlight: '' },
  { name: 'Saturn / Shani', house: 'H-I Lagna', color: '#5050A0', symbol: '♄', food: "Black sesame, mustard, iron-rich dark greens, and lentils (when permitted) ground Saturn's energy.", highlight: '' },
  { name: 'Jupiter / Guru', house: 'H-V', color: '#C08030', symbol: '♃', food: 'Yellow foods, chickpeas (off-fast), turmeric, banana, and all foods of abundance. Thursday is best for Guru-aligned eating.', highlight: '' },
  { name: 'Mars / Mangal', house: 'H-III', color: '#D05040', symbol: '♂', food: 'Red lentils, pomegranate, beet (off-fast), spicy foods in moderation. Tuesday is ideal for Mangal-aligned eating.', highlight: '' },
];

export function tileDescriptions(tithi: string, nakshatra: string, yoga: string, karana: string, weekday: number): Record<string, string> {
  return {
    tithi: tithi.toLowerCase().includes('ekadashi')
      ? 'The eleventh lunar day. Reflection, discipline and lighter meals are favoured today. Many observe a gentle fast.'
      : `Today's ${tithi} shapes the lunar rhythm of digestion and meal timing.`,
    vara: `${WEEKDAYS[weekday]}, ruled by ${VARA_PLANET[weekday].split('·')[0].trim()}. Foods aligned with this planetary day support balance.`,
    nakshatra: `${nakshatra} nakshatra influences today's nourishment. Milk, rice, and seasonal roots are often beneficial under its influence.`,
    yoga: `${yoga} yoga colours the day's energy. Eat mindfully and express gratitude through food.`,
    karana: `${karana} karana supports gentle movement and light meals. Avoid heavy dinners after sunset.`,
  };
}
