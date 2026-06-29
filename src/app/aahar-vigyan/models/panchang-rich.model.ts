import { DoshaType } from './aahar-vigyan.model';

export interface PanchangLocation {
  lat: number;
  lng: number;
  /** IST = 330 */
  timezoneOffsetMinutes: number;
  label?: string;
}

export interface PanchangTileData {
  id: 'tithi' | 'vara' | 'nakshatra' | 'yoga' | 'karana';
  num: string;
  name: string;
  hindi: string;
  desc: string;
  indicatorLabel?: string;
  indicatorSub?: string;
  barWidth?: number;
  barColor?: string;
  iconBg: string;
  iconStroke: string;
}

export interface FoodTimingInfo {
  hydration: { label: string; value: string; desc: string };
  cooking: { label: string; value: string; desc: string };
  timing: { label: string; value: string; desc: string };
}

export interface SeasonInfo {
  name: string;
  subtitle: string;
  period: string;
  desc: string;
  principle: string;
  picks: string;
  avoids: string;
  herbs: string;
  ritual: string;
}

export interface AaharPanchangDay {
  date: string;
  source: 'computed' | 'api' | 'merged';
  tithi: string;
  tithiHindi: string;
  tithiNum: number;
  paksha: string;
  pakshaProgress: number;
  nakshatra: string;
  nakshatraHindi: string;
  nakshatraProgress: number;
  yoga: string;
  yogaHindi: string;
  karana: string;
  karanaHindi: string;
  karanaProgress: number;
  vara: string;
  varaSanskrit: string;
  varaHindi: string;
  varaPlanet: string;
  masa: string;
  masaHindi: string;
  ritu: string;
  rituHindi: string;
  samvatsara: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  rahukaal: string;
  abhijitMuhurta: string;
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
  festivals: string[];
  specialYogas: string[];
  tiles: PanchangTileData[];
  todayDoshaBars: { vata: number; pitta: number; kapha: number };
  todayDominantDosha: DoshaType;
  season: SeasonInfo;
  foodTiming: FoodTimingInfo;
  dietaryGuidance: string;
}
