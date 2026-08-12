import {

  ChangeDetectionStrategy,

  Component,

  OnInit,

  AfterViewInit,

  OnDestroy,

  inject,

  signal,

  computed,

  PLATFORM_ID,

} from '@angular/core';

import { isPlatformBrowser, TitleCasePipe, UpperCasePipe } from '@angular/common';

import { AuthState } from '../../../core/state/auth.state';

import { AaharVigyanStateService } from '../../services/aahar-vigyan-state.service';

import { PanchangLiveService } from '../../services/panchang-live.service';

import { AppDownloadModalComponent } from '../app-download-modal/app-download-modal.component';

import { MainKundaliSectionComponent } from './main-kundali-section.component';
import { MainTailSectionComponent } from './main-tail-section.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

import { DOSHA_INSIGHTS, PRAKRITI_DETAILS } from '../../data/prakriti-data';

import { AaharPanchangDay } from '../../models/panchang-rich.model';

import { DoshaType, PrakritiScores } from '../../models/aahar-vigyan.model';

import { FoodRecommendationService, FoodChipItem } from '../../services/food-recommendation.service';
import { PanchangTileData } from '../../models/panchang-rich.model';

const DEFAULT_PRAKRITI: PrakritiScores = { vata: 33, pitta: 33, kapha: 34, dominant: 'vata' };

const SCROLL_DOT_SECTIONS = [
  { id: 'food', label: 'Food' },
  { id: 'dosha', label: 'Dosha' },
  { id: 'kundali', label: 'Kundali' },
  { id: 'season', label: 'Season' },
];

/** DOM section id → nav / dot id */
const SCROLL_SPY_SECTIONS: { elId: string; navId: string }[] = [
  { elId: 'food', navId: 'food' },
  { elId: 'dosha', navId: 'dosha' },
  { elId: 'kundali', navId: 'kundali' },
  { elId: 'season', navId: 'season' },
];

const DOSHA_ELEMENTS: Record<DoshaType, { glyph: string; label: string }> = {
  vata: { glyph: '💨', label: 'Air + Ether' },
  pitta: { glyph: '🔥', label: 'Fire + Water' },
  kapha: { glyph: '🌊', label: 'Earth + Water' },
};

const HERO_INTRO_SESSION_KEY = 'av-hero-intro-seen';

export interface MealArcSlot {
  id: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  startPct: number;
  endPct: number;
  active: boolean;
}

export interface TithiPhaseInfo {
  label: string;
  illumination: number;
  waxing: boolean;
}



@Component({

  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-aahar-vigyan-main',

  imports: [AppDownloadModalComponent, ScrollRevealDirective, MainKundaliSectionComponent, MainTailSectionComponent, TitleCasePipe, UpperCasePipe],

  templateUrl: './main.component.html',

  styleUrl: './main.component.scss',

})

export class AaharVigyanMainComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly panchangLive = inject(PanchangLiveService);

  private readonly avState = inject(AaharVigyanStateService);

  private readonly foodRecSvc = inject(FoodRecommendationService);

  private readonly platformId = inject(PLATFORM_ID);

  protected readonly authState = inject(AuthState);



  protected readonly day = signal<AaharPanchangDay | null>(null);

  protected readonly loading = signal(true);

  protected readonly loadError = signal('');

  protected readonly showAppModal = signal(false);

  protected readonly activeDoshaView = signal<DoshaType>('vata');

  protected readonly activeTileIndex = signal(0);

  protected readonly scrollProgress = signal(0);

  protected readonly activeSection = signal('food');

  protected readonly chipsReady = signal(false);
  protected readonly mandalaParallax = signal(0);
  protected readonly showMiniSummary = signal(false);
  protected readonly tileRippleIndex = signal(-1);
  protected readonly doshaAnimTick = signal(0);
  protected readonly heroIntroActive = signal(false);
  protected readonly cosmicTagReady = signal(false);

  protected readonly scrollDotSections = SCROLL_DOT_SECTIONS;
  protected readonly doshaElements = DOSHA_ELEMENTS;

  protected readonly activeSectionIndex = computed(() => {
    const idx = SCROLL_DOT_SECTIONS.findIndex((s) => s.id === this.activeSection());
    return idx >= 0 ? idx : 0;
  });



  protected readonly doshaOptions: DoshaType[] = ['vata', 'pitta', 'kapha'];

  protected readonly prakritiDetails = PRAKRITI_DETAILS;

  protected readonly doshaInsights = DOSHA_INSIGHTS;



  protected readonly prakriti = computed(() => this.avState.prakriti() ?? DEFAULT_PRAKRITI);

  protected readonly dominantDosha = computed(() => this.prakriti().dominant);

  protected readonly doshaInsight = computed(() => DOSHA_INSIGHTS[this.activeDoshaView()]);



  protected readonly todayLabel = computed(() => {

    const d = new Date();

    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  });



  protected readonly heroDateTag = computed(() => {

    const p = this.day();

    if (!p?.masa) return this.todayLabel();

    return `${this.todayLabel()} · ${p.masa}`;

  });



  protected readonly panchangTiles = computed(() => this.day()?.tiles ?? []);

  protected readonly activeTile = computed((): PanchangTileData | null => {
    const tiles = this.panchangTiles();
    return tiles[this.activeTileIndex()] ?? tiles[0] ?? null;
  });

  protected readonly isEkadashi = computed(() => this.day()?.isEkadashi ?? false);

  protected readonly tithiPhase = computed((): TithiPhaseInfo | null => {
    const p = this.day();
    if (!p) return null;
    if (p.isPurnima) return { label: 'Purnima · Full Moon', illumination: 1, waxing: true };
    if (p.isAmavasya) return { label: 'Amavasya · New Moon', illumination: 0, waxing: false };
    const waxing = p.paksha === 'Shukla';
    const illumination = waxing ? p.pakshaProgress / 100 : 1 - p.pakshaProgress / 100;
    return {
      label: `${p.paksha} Paksha · Day ${p.tithiNum}`,
      illumination: Math.max(0.05, Math.min(0.95, illumination)),
      waxing,
    };
  });

  protected readonly heroCosmicTag = computed(() => {
    const p = this.day();
    if (!p) return null;
    if (p.isEkadashi) {
      return { en: `Ekadashi · ${p.tithi}`, hi: p.tithiHindi };
    }
    if (p.isPurnima) {
      return { en: 'Purnima · Full Moon', hi: p.tithiHindi };
    }
    if (p.isAmavasya) {
      return { en: 'Amavasya · New Moon', hi: p.tithiHindi };
    }
    const pakshaHi = p.paksha === 'Shukla' ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
    return {
      en: `${p.paksha} Paksha · ${p.tithi}`,
      hi: `${p.tithiHindi} · ${pakshaHi}`,
    };
  });

  protected readonly mealArc = computed((): { slots: MealArcSlot[]; nowPct: number } | null => {
    const p = this.day();
    if (!p?.sunrise || p.sunrise === '—' || !p.sunset || p.sunset === '—') return null;
    const sunrise = this.parseTimeToMinutes(p.sunrise);
    const sunset = this.parseTimeToMinutes(p.sunset);
    if (sunrise == null || sunset == null) return null;

    const dayStart = sunrise - 60;
    const dayEnd = sunset + 90;
    const span = dayEnd - dayStart;
    const toPct = (m: number) => Math.max(0, Math.min(100, ((m - dayStart) / span) * 100));

    const breakfastEnd = sunrise + 150;
    const lunchStart = 11 * 60;
    const lunchEnd = 14 * 60;
    const dinnerStart = sunset - 120;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const slots: MealArcSlot[] = [
      { id: 'breakfast', label: 'Breakfast', startPct: toPct(sunrise), endPct: toPct(breakfastEnd), active: nowMin >= sunrise && nowMin <= breakfastEnd },
      { id: 'lunch', label: 'Lunch', startPct: toPct(lunchStart), endPct: toPct(lunchEnd), active: nowMin >= lunchStart && nowMin <= lunchEnd },
      { id: 'dinner', label: 'Dinner', startPct: toPct(dinnerStart), endPct: toPct(sunset), active: nowMin >= dinnerStart && nowMin <= sunset },
    ];

    return { slots, nowPct: toPct(nowMin) };
  });

  protected readonly miniSummaryParts = computed(() => {
    const p = this.day();
    const parts: string[] = ['Today'];
    parts.push(this.prakritiDetails[this.todayDominantDosha()].name);
    if (p?.isEkadashi) parts.push('Ekadashi');
    else if (p?.ritu) parts.push(`${p.ritu} Ritu`);
    return parts;
  });

  protected readonly season = computed(() => this.day()?.season);

  protected readonly foodInfo = computed(() => this.day()?.foodTiming);

  protected readonly todayDoshaBars = computed(() => this.day()?.todayDoshaBars ?? { vata: 33, pitta: 33, kapha: 34 });

  protected readonly todayDominantDosha = computed(() => this.day()?.todayDominantDosha ?? this.dominantDosha());



  protected readonly heroElements = computed(() => {

    const p = this.day();

    if (!p) return [];

    return [

      { label: 'Tithi', val: p.tithi, hi: p.tithiHindi },

      { label: 'Vara', val: p.vara, hi: p.varaHindi },

      { label: 'Nakshatra', val: p.nakshatra, hi: p.nakshatraHindi },

      { label: 'Yoga', val: p.yoga, hi: p.yogaHindi },

      { label: 'Karana', val: p.karana, hi: p.karanaHindi },

    ];

  });



  protected readonly foodBadges = computed(() => {

    const p = this.day();

    const badges: { label: string; type: 'accent' | 'gold' | 'green' }[] = [

      { label: `${this.constitutionLabel()} Body`, type: 'accent' },

    ];

    if (p?.isEkadashi) badges.push({ label: 'Ekadashi Fast', type: 'gold' });

    if (p?.specialYogas?.length) badges.push({ label: p.specialYogas[0], type: 'green' });

    else if (p?.yoga.toLowerCase().includes('shubh') || p?.yoga.toLowerCase().includes('siddha')) {

      badges.push({ label: `${p.yoga} Yoga`, type: 'green' });

    }

    if (p?.ritu) badges.push({ label: `${p.ritu} Ritu`, type: 'green' });

    return badges;

  });



  protected readonly foodLead = computed(() => this.day()?.dietaryGuidance || 'Loading today\'s guidance…');



  protected readonly doshaLead = computed(() => {

    const p = this.day();

    const td = this.todayDominantDosha();

    const detail = PRAKRITI_DETAILS[td];

    if (p) {

      return `Moon in ${p.nakshatra} (${detail.name} influence today). ${detail.insight}`;

    }

    return detail.insight;

  });



  protected readonly foodRecs = computed(() => {

    const d = this.day();

    const p = this.prakriti();

    return this.foodRecSvc.recommend(p, {

      isEkadashi: d?.isEkadashi ?? false,

      isPurnima: d?.isPurnima ?? false,

      isAmavasya: d?.isAmavasya ?? false,

      ritu: d?.ritu ?? '',

      karana: d?.karana ?? '',

      todayDoshaBars: d?.todayDoshaBars ?? { vata: p.vata, pitta: p.pitta, kapha: p.kapha },

    });

  });



  protected readonly eatFoods = computed((): FoodChipItem[] => this.foodRecs().eat);

  protected readonly avoidFoods = computed((): FoodChipItem[] => this.foodRecs().avoid);

  protected readonly neutralFoods = computed((): FoodChipItem[] => this.foodRecs().neutral);

  protected readonly constitutionLabel = computed(() => this.foodRecs().constitutionLabel);

  protected readonly foodPersonalSummary = computed(() => this.foodRecs().summary);



  private scrollRaf = 0;

  private scrollHandler?: () => void;

  private deferredObserver?: MutationObserver;



  ngOnInit(): void {

    this.activeDoshaView.set(this.dominantDosha());

    if (isPlatformBrowser(this.platformId)) {
      const seen = sessionStorage.getItem(HERO_INTRO_SESSION_KEY);
      this.heroIntroActive.set(!seen);
      if (!seen) {
        sessionStorage.setItem(HERO_INTRO_SESSION_KEY, '1');
      }
    }

    this.schedulePanchangLoad();

  }



  ngAfterViewInit(): void {

    if (!isPlatformBrowser(this.platformId)) return;

    this.setupScrollProgress();

    this.setupDeferredSectionWatcher();

    requestAnimationFrame(() => this.updateActiveSection());

  }



  ngOnDestroy(): void {

    if (this.scrollHandler) {

      window.removeEventListener('scroll', this.scrollHandler);

    }

    if (this.scrollRaf) {

      cancelAnimationFrame(this.scrollRaf);

    }

    this.deferredObserver?.disconnect();

  }



  private schedulePanchangLoad(): void {

    const load = () => {

      this.panchangLive.getToday().subscribe({

        next: (data) => {

          this.day.set(data);

          this.loading.set(false);

          if (this.heroIntroActive()) {
            this.cosmicTagReady.set(true);
          }

          requestAnimationFrame(() => this.chipsReady.set(true));

        },

        error: () => {

          this.loadError.set('Could not calculate today\'s Panchang.');

          this.loading.set(false);

        },

      });

    };



    if (isPlatformBrowser(this.platformId) && typeof requestIdleCallback !== 'undefined') {

      requestIdleCallback(load, { timeout: 400 });

    } else {

      setTimeout(load, 0);

    }

  }



  private setupScrollProgress(): void {

    this.scrollHandler = () => {

      if (this.scrollRaf) return;

      this.scrollRaf = requestAnimationFrame(() => {

        this.scrollRaf = 0;

        const total = document.documentElement.scrollHeight - window.innerHeight;

        this.scrollProgress.set(total > 0 ? Math.min((window.scrollY / total) * 100, 100) : 0);

        const heroH = window.innerHeight * 0.72;
        this.showMiniSummary.set(window.scrollY > heroH);
        this.mandalaParallax.set(Math.min(window.scrollY * 0.025, 18));

        this.updateActiveSection();

      });

    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

  }



  private updateActiveSection(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const anchor = 100 + (this.showMiniSummary() ? 36 : 0);
    let current = 'food';

    for (const { elId, navId } of SCROLL_SPY_SECTIONS) {
      const el = document.getElementById(elId);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= anchor) {
        current = navId;
      }
    }

    if (this.activeSection() !== current) {
      this.activeSection.set(current);
    }
  }

  private setupDeferredSectionWatcher(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = document.querySelector('.av-main');
    if (!root) return;

    this.deferredObserver = new MutationObserver(() => {
      this.updateActiveSection();
    });

    this.deferredObserver.observe(root, { childList: true, subtree: true });
  }



  setDoshaView(d: DoshaType): void {
    if (this.activeDoshaView() === d) return;
    this.activeDoshaView.set(d);
    this.doshaAnimTick.update((n) => n + 1);
  }

  setActiveTile(i: number): void {
    if (this.activeTileIndex() === i) return;
    this.activeTileIndex.set(i);
    this.tileRippleIndex.set(i);
    setTimeout(() => this.tileRippleIndex.set(-1), 550);
  }



  openAppModal(): void {

    this.showAppModal.set(true);

  }



  closeAppModal(): void {

    this.showAppModal.set(false);

  }



  scrollTo(id: string, event?: Event): void {

    event?.preventDefault();

    this.activeSection.set(id);

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  }



  doshaBarHint(d: DoshaType, pct: number): string {

    const labels: Record<DoshaType, string> = {

      vata: 'Air + Ether',

      pitta: 'Fire + Water',

      kapha: 'Earth + Water',

    };

    const level = pct >= 50 ? 'Elevated today' : pct >= 25 ? 'Moderate' : 'Low';

    return `${level} · ${labels[d]}`;

  }



  doshaBarScale(pct: number): string {

    return `scaleX(${Math.max(0, Math.min(1, pct / 100))})`;

  }

  mealArcDash(slot: MealArcSlot): string {
    const r = 42;
    const start = this.pctToAngle(slot.startPct);
    const end = this.pctToAngle(slot.endPct);
    return this.describeArc(r, start, end);
  }

  mealArcNowPoint(nowPct: number): { x: number; y: number } {
    return this.polarToCartesian(42, this.pctToAngle(nowPct));
  }

  private pctToAngle(pct: number): number {
    return -90 + (pct / 100) * 360;
  }

  private polarToCartesian(r: number, angleDeg: number): { x: number; y: number } {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
  }

  private describeArc(r: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(r, startAngle);
    const end = this.polarToCartesian(r, endAngle);
    const sweep = endAngle - startAngle;
    const large = sweep > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  private parseTimeToMinutes(time: string): number | null {
    const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

}


