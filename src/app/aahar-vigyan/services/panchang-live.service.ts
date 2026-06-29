import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  Observer,
  getPanchangamDetails,
  tithiNames,
  nakshatraNames,
  yogaNames,
  dayNames,
} from '@ishubhamx/panchangam-js';
import { PanchangService } from '../../core/services/panchang.service';
import { DoshaType } from '../models/aahar-vigyan.model';
import {
  AaharPanchangDay,
  PanchangLocation,
  PanchangTileData,
  SeasonInfo,
} from '../models/panchang-rich.model';
import {
  KARANA_HI,
  MASA_HI,
  NAKSHATRA_HI,
  RITU_HI,
  TITHI_HI,
  VARA_PLANET_HI,
  YOGA_HI,
} from '../data/panchang-hindi.data';
import { SEASON_DATA, VARA_PLANET, VARA_SANSKRIT, WEEKDAYS, WEEKDAYS_HI } from '../data/panchang-page.data';

export const DEFAULT_PANCHANG_LOCATION: PanchangLocation = {
  lat: 28.6139,
  lng: 77.209,
  timezoneOffsetMinutes: 330,
  label: 'New Delhi',
};

const RITU_SEASON_KEY: Record<string, keyof typeof SEASON_DATA> = {
  Varsha: 'varsha',
  Grishma: 'grishma',
  Hemant: 'hemant',
  Shishir: 'shishir',
  Vasant: 'vasanta',
  Sharad: 'sharad',
};

/** Moon rashi index → dominant dosha influence for the day */
const RASHI_DOSHA: Record<number, DoshaType> = {
  0: 'pitta', 1: 'kapha', 2: 'vata', 3: 'kapha', 4: 'pitta', 5: 'vata',
  6: 'vata', 7: 'pitta', 8: 'pitta', 9: 'kapha', 10: 'vata', 11: 'kapha',
};

@Injectable({ providedIn: 'root' })
export class PanchangLiveService {
  private readonly panchangSvc = inject(PanchangService);

  getToday(date = new Date(), location = DEFAULT_PANCHANG_LOCATION): Observable<AaharPanchangDay> {
    const computed = this.computeDay(date, location);
    const dateStr = this.formatYmd(date);

    return this.panchangSvc.getGuidanceToday({ date: dateStr }).pipe(
      map((raw) => {
        const guidance = this.extractGuidance(raw);
        if (!guidance) return computed;
        return {
          ...computed,
          source: 'merged' as const,
          dietaryGuidance: guidance,
        };
      }),
      catchError(() => of(computed)),
    );
  }

  computeDay(date: Date, location: PanchangLocation): AaharPanchangDay {
    const observer = new Observer(location.lat, location.lng, 0);
    const p = getPanchangamDetails(date, observer, {
      timezoneOffset: location.timezoneOffsetMinutes,
    });

    const tithiIdx = p.tithi;
    const tithiName = tithiNames[tithiIdx] ?? 'Unknown';
    const nakName = nakshatraNames[p.nakshatra] ?? 'Unknown';
    const yogaName = yogaNames[p.yoga] ?? 'Unknown';
    const varaIdx = p.vara;

    const paksha = p.paksha ?? (tithiIdx < 15 ? 'Shukla' : 'Krishna');
    const pakshaDay = (tithiIdx % 15) + 1;
    const pakshaProgress = Math.round((pakshaDay / 15) * 100);

    const nakProgress = this.progressBetween(p.nakshatraStartTime, p.nakshatraEndTime, date);
    const karProgress = this.karanaProgress(p, date);
    const tithiProgress = this.progressBetween(p.tithiStartTime, p.tithiEndTime, date);

    const isEkadashi = tithiName === 'Ekadashi';
    const isPurnima = tithiName === 'Purnima';
    const isAmavasya = tithiName === 'Amavasya';

    const moonDosha = RASHI_DOSHA[p.moonRashi?.index ?? 0] ?? 'vata';
    const todayDoshaBars = this.skewDoshaBars(moonDosha);
    const rituKey = RITU_SEASON_KEY[p.ritu] ?? 'varsha';
    const seasonBase = SEASON_DATA[rituKey];
    const season: SeasonInfo = {
      ...seasonBase,
      name: `${p.ritu} Ritu`,
      subtitle: seasonBase.subtitle,
    };

    const tiles = this.buildTiles({
      tithiIdx,
      tithiName,
      nakName,
      yogaName,
      karana: p.karana,
      varaIdx,
      paksha,
      pakshaProgress,
      nakProgress,
      karProgress,
      tithiProgress,
      isEkadashi,
      yogaAuspicious: p.specialYogas?.some((y) => y.isAuspicious) ?? false,
      specialYogaNames: p.specialYogas?.map((y) => y.name) ?? [],
    });

    const abhijit = p.abhijitMuhurta
      ? `${this.fmtTime(p.abhijitMuhurta.start)} – ${this.fmtTime(p.abhijitMuhurta.end)}`
      : '11 AM – 12 PM';

    return {
      date: this.formatYmd(date),
      source: 'computed',
      tithi: tithiName,
      tithiHindi: TITHI_HI[tithiIdx] ?? tithiName,
      tithiNum: pakshaDay,
      paksha,
      pakshaProgress,
      nakshatra: nakName,
      nakshatraHindi: NAKSHATRA_HI[nakName] ?? nakName,
      nakshatraProgress: nakProgress,
      yoga: yogaName,
      yogaHindi: YOGA_HI[yogaName] ?? yogaName,
      karana: p.karana,
      karanaHindi: KARANA_HI[p.karana] ?? p.karana,
      karanaProgress: karProgress,
      vara: WEEKDAYS[varaIdx],
      varaSanskrit: dayNames[varaIdx] ?? VARA_SANSKRIT[varaIdx],
      varaHindi: WEEKDAYS_HI[varaIdx],
      varaPlanet: `${VARA_PLANET[varaIdx].split('·')[0].trim()} · ${VARA_PLANET_HI[varaIdx]}`,
      masa: p.masa?.name ?? '',
      masaHindi: MASA_HI[p.masa?.name ?? ''] ?? p.masa?.name ?? '',
      ritu: p.ritu ?? '',
      rituHindi: RITU_HI[p.ritu ?? ''] ?? p.ritu ?? '',
      samvatsara: p.samvat?.samvatsara ?? '',
      sunrise: this.fmtTime(p.sunrise),
      sunset: this.fmtTime(p.sunset),
      moonrise: this.fmtTime(p.moonrise),
      rahukaal: this.fmtRange(p.rahuKalamStart, p.rahuKalamEnd),
      abhijitMuhurta: abhijit,
      isEkadashi,
      isPurnima,
      isAmavasya,
      festivals: (p.festivals ?? []).map((f) => f.name).slice(0, 5),
      specialYogas: (p.specialYogas ?? []).map((y) => y.name),
      tiles,
      todayDoshaBars,
      todayDominantDosha: moonDosha,
      season,
      foodTiming: {
        hydration: {
          label: 'Hydration',
          value: p.ritu === 'Grishma' || p.ritu === 'Sharad' ? 'Room-temp Water' : 'Warm Water',
          desc: p.ritu === 'Varsha'
            ? 'Sip warm water through the monsoon day. Coconut water supports weakened Agni. Avoid cold beverages.'
            : 'Sip warm or room-temperature water. Align intake with sunrise–sunset rhythm for best digestion.',
        },
        cooking: {
          label: 'Cooking Method',
          value: isEkadashi ? 'Light & Sattvic' : p.ritu === 'Grishma' ? 'Steam & Raw' : 'Steam & Simmer',
          desc: isEkadashi
            ? 'Ekadashi favours minimal cooking — steamed roots, sabudana, fruits, and milk preparations.'
            : 'Light cooking — steaming and gentle sauté in ghee. Avoid deep frying on inauspicious karana (Vishti/Bhadra).',
        },
        timing: {
          label: 'Best Meal Timing',
          value: abhijit.replace(' – ', ' – ').includes('AM') ? abhijit : '11 AM – 1 PM',
          desc: `Main meal near Abhijit Muhurta (${abhijit}) when digestive fire peaks. Sunrise today: ${this.fmtTime(p.sunrise)}.`,
        },
      },
      dietaryGuidance: this.buildDietaryGuidance(tithiName, nakName, yogaName, p.karana, p.ritu, isEkadashi),
    };
  }

  private buildTiles(ctx: {
    tithiIdx: number;
    tithiName: string;
    nakName: string;
    yogaName: string;
    karana: string;
    varaIdx: number;
    paksha: string;
    pakshaProgress: number;
    nakProgress: number;
    karProgress: number;
    tithiProgress: number;
    isEkadashi: boolean;
    yogaAuspicious: boolean;
    specialYogaNames: string[];
  }): PanchangTileData[] {
    const tithiDesc = ctx.isEkadashi
      ? 'The eleventh lunar day — reflection, discipline, and lighter meals. Many observe a gentle fast today.'
      : `${ctx.paksha} Paksha, ${ctx.tithiName}. Lunar rhythm shapes digestion and ideal meal timing today.`;

    const nakDesc = `${ctx.nakName} nakshatra is active. Moon's mansion influences nourishment — roots, grains, and seasonal produce aligned with this nakshatra are favoured.`;

    const yogaDesc = ctx.yogaAuspicious
      ? `${ctx.yogaName} is an auspicious yoga today. Excellent for mindful eating and beginning new dietary habits.`
      : `${ctx.yogaName} yoga colours today's energy. Eat calmly and with gratitude.`;

    const karDesc = ctx.karana === 'Vishti'
      ? 'Vishti (Bhadra) karana — avoid starting new meals or travel. Light, already-prepared food is best.'
      : `${ctx.karana} karana supports routine meals. Avoid heavy dinners after sunset.`;

    return [
      {
        id: 'tithi',
        num: String((ctx.tithiIdx % 15) + 1),
        name: ctx.tithiName,
        hindi: TITHI_HI[ctx.tithiIdx] ?? ctx.tithiName,
        desc: tithiDesc,
        indicatorLabel: 'Paksha',
        indicatorSub: `${ctx.paksha} · ${ctx.pakshaProgress}% of paksha`,
        barWidth: ctx.pakshaProgress,
        iconBg: 'var(--ac-bg)',
        iconStroke: 'var(--ac)',
      },
      {
        id: 'vara',
        num: WEEKDAYS[ctx.varaIdx].slice(0, 3),
        name: VARA_SANSKRIT[ctx.varaIdx],
        hindi: WEEKDAYS_HI[ctx.varaIdx],
        desc: `${WEEKDAYS[ctx.varaIdx]}, ruled by ${VARA_PLANET[ctx.varaIdx]}. Foods aligned with this planetary day support balance.`,
        indicatorSub: VARA_PLANET[ctx.varaIdx],
        iconBg: '#fffae8',
        iconStroke: '#c08030',
      },
      {
        id: 'nakshatra',
        num: nakshatraNames.indexOf(ctx.nakName) + 1 + '.',
        name: ctx.nakName,
        hindi: NAKSHATRA_HI[ctx.nakName] ?? ctx.nakName,
        desc: nakDesc,
        indicatorLabel: 'Progress',
        barWidth: ctx.nakProgress,
        barColor: '#7090b8',
        iconBg: '#eef8f0',
        iconStroke: '#3a7050',
      },
      {
        id: 'yoga',
        num: '✦',
        name: `${ctx.yogaName} Yoga`,
        hindi: YOGA_HI[ctx.yogaName] ?? ctx.yogaName,
        desc: yogaDesc,
        indicatorSub: ctx.specialYogaNames.length
          ? ctx.specialYogaNames.join(' · ')
          : ctx.yogaAuspicious ? 'Auspicious · शुभ' : ctx.yogaName,
        iconBg: '#fff5f0',
        iconStroke: '#c08030',
      },
      {
        id: 'karana',
        num: ctx.karana,
        name: 'Karana',
        hindi: KARANA_HI[ctx.karana] ?? ctx.karana,
        desc: karDesc,
        indicatorLabel: 'Tithi progress',
        barWidth: ctx.tithiProgress,
        barColor: '#3a8080',
        indicatorSub: ctx.karProgress > 50 ? 'Second half · PM' : 'First half · AM',
        iconBg: '#eef8f8',
        iconStroke: '#3a8080',
      },
    ];
  }

  private buildDietaryGuidance(
    tithi: string,
    nakshatra: string,
    yoga: string,
    karana: string,
    ritu: string,
    isEkadashi: boolean,
  ): string {
    if (isEkadashi) {
      return `Ekadashi on ${nakshatra} with ${yoga} Yoga — a day for light, sattvic nourishment. Favour fruits, milk, sabudana, and roots. Avoid grains, pulses, and onion-garlic. ${ritu} Ritu calls for warm, easily digestible choices.`;
    }
    if (karana === 'Vishti') {
      return `${tithi} on ${nakshatra} — Vishti (Bhadra) karana is active. Postpone new cooking; eat simple, warm, previously prepared food. ${yoga} Yoga supports mindful, moderate meals.`;
    }
    return `${tithi} (${ritu} Ritu) on ${nakshatra} nakshatra with ${yoga} Yoga. Today's Panchang supports seasonal, locally grown food aligned with ${ritu} Ritu dietary principles.`;
  }

  private skewDoshaBars(dominant: DoshaType): { vata: number; pitta: number; kapha: number } {
    if (dominant === 'vata') return { vata: 62, pitta: 26, kapha: 12 };
    if (dominant === 'pitta') return { vata: 16, pitta: 64, kapha: 20 };
    return { vata: 14, pitta: 22, kapha: 64 };
  }

  private progressBetween(start: Date | null, end: Date | null, now: Date): number {
    if (!start || !end) return 50;
    const s = start.getTime();
    const e = end.getTime();
    if (e <= s) return 50;
    const pct = ((now.getTime() - s) / (e - s)) * 100;
    return Math.max(5, Math.min(95, Math.round(pct)));
  }

  private karanaProgress(p: ReturnType<typeof getPanchangamDetails>, now: Date): number {
    const active = p.karanaTransitions?.find(
      (k) => k.startTime <= now && k.endTime >= now,
    );
    if (active) return this.progressBetween(active.startTime, active.endTime, now);
    return 50;
  }

  private fmtTime(d: Date | null): string {
    if (!d) return '—';
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  }

  private fmtRange(start: Date | null, end: Date | null): string {
    if (!start || !end) return '—';
    return `${this.fmtTime(start)} – ${this.fmtTime(end)}`;
  }

  private formatYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private extractGuidance(raw: unknown): string {
    if (!raw || typeof raw !== 'object') return '';
    const obj = raw as Record<string, unknown>;
    const inner = (obj['guidance'] ?? obj['data'] ?? obj) as Record<string, string>;
    return inner?.['dietary'] || inner?.['general'] || '';
  }
}
