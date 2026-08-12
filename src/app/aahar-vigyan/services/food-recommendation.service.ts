import { Injectable } from '@angular/core';
import { DoshaType, PrakritiScores } from '../models/aahar-vigyan.model';
import { EKADASHI_FORCED_AVOID_IDS, FOOD_CATALOG, FoodItem } from '../data/food-catalog.data';

export interface FoodRecommendationContext {
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
  ritu: string;
  karana: string;
  todayDoshaBars: { vata: number; pitta: number; kapha: number };
}

export interface FoodChipItem {
  label: string;
  reason: string;
}

export interface FoodRecommendations {
  eat: FoodChipItem[];
  avoid: FoodChipItem[];
  neutral: FoodChipItem[];
  constitutionLabel: string;
  summary: string;
}

const DOSHA_LABEL: Record<DoshaType, string> = {
  vata: 'Vata',
  pitta: 'Pitta',
  kapha: 'Kapha',
};

@Injectable({ providedIn: 'root' })
export class FoodRecommendationService {
  recommend(prakriti: PrakritiScores, ctx: FoodRecommendationContext): FoodRecommendations {
    const need = this.needVector(prakriti, ctx.todayDoshaBars);
    const pool = ctx.isEkadashi
      ? FOOD_CATALOG.filter((f) => f.ekadashiOk || f.vata <= 0)
      : FOOD_CATALOG;

    const scored = pool.map((food) => ({
      food,
      eatScore: this.pacifyScore(food, need, ctx.ritu),
      avoidScore: this.aggravateScore(food, need, ctx.ritu),
    }));

    const eatCandidates = scored
      .filter((s) => s.eatScore > 0 && s.avoidScore < s.eatScore)
      .sort((a, b) => b.eatScore - a.eatScore);

    const avoidCandidates = scored
      .filter((s) => s.avoidScore > 0)
      .sort((a, b) => b.avoidScore - a.avoidScore);

    const eatIds = new Set<string>();
    const eat: FoodChipItem[] = [];
    for (const { food } of eatCandidates) {
      if (eat.length >= 12) break;
      if (eatIds.has(food.id)) continue;
      eatIds.add(food.id);
      eat.push(this.chipItem(food, 'eat', need, ctx));
    }

    const avoidIds = new Set<string>();
    const avoid: FoodChipItem[] = [];

    if (ctx.isEkadashi) {
      for (const id of EKADASHI_FORCED_AVOID_IDS) {
        const food = FOOD_CATALOG.find((f) => f.id === id);
        if (food && !avoidIds.has(id)) {
          avoidIds.add(id);
          avoid.push(this.chipItem(food, 'avoid', need, ctx, 'Ekadashi fasting day'));
        }
      }
    }

    for (const { food } of avoidCandidates) {
      if (avoid.length >= 10) break;
      if (avoidIds.has(food.id) || eatIds.has(food.id)) continue;
      if (food.ekadashiOk && ctx.isEkadashi && food.vata <= 0) continue;
      avoidIds.add(food.id);
      avoid.push(this.chipItem(food, 'avoid', need, ctx));
    }

    if (ctx.karana === 'Vishti') {
      const fried = FOOD_CATALOG.find((f) => f.id === 'deep-fried');
      if (fried && !avoidIds.has(fried.id)) {
        avoid.unshift(this.chipItem(fried, 'avoid', need, ctx, 'Vishti karana — avoid new heavy meals'));
        avoidIds.add(fried.id);
      }
    }

    const neutral = this.neutralFoods(prakriti, ctx, eatIds, avoidIds, need);

    return {
      eat: eat.length ? eat : this.fallbackEat(prakriti.dominant),
      avoid: avoid.length ? avoid : this.fallbackAvoid(prakriti.dominant),
      neutral,
      constitutionLabel: this.constitutionLabel(prakriti),
      summary: this.buildSummary(prakriti, ctx),
    };
  }

  private needVector(
    prakriti: PrakritiScores,
    today: { vata: number; pitta: number; kapha: number },
  ): { vata: number; pitta: number; kapha: number } {
    return {
      vata: prakriti.vata * 0.65 + today.vata * 0.35,
      pitta: prakriti.pitta * 0.65 + today.pitta * 0.35,
      kapha: prakriti.kapha * 0.65 + today.kapha * 0.35,
    };
  }

  private pacifyScore(food: FoodItem, need: { vata: number; pitta: number; kapha: number }, ritu: string): number {
    let score =
      (need.vata / 100) * -food.vata * 10 +
      (need.pitta / 100) * -food.pitta * 10 +
      (need.kapha / 100) * -food.kapha * 10;
    if (food.rituBoost?.includes(ritu)) score += 2;
    if (food.vata > 1 || food.pitta > 1 || food.kapha > 1) score -= 3;
    return score;
  }

  private aggravateScore(food: FoodItem, need: { vata: number; pitta: number; kapha: number }, ritu: string): number {
    let score =
      (need.vata / 100) * Math.max(0, food.vata) * 10 +
      (need.pitta / 100) * Math.max(0, food.pitta) * 10 +
      (need.kapha / 100) * Math.max(0, food.kapha) * 10;
    if (food.rituBoost?.includes(ritu) && (food.vata > 0 || food.pitta > 0 || food.kapha > 0)) {
      score += 1.5;
    }
    return score;
  }

  private neutralFoods(
    prakriti: PrakritiScores,
    ctx: FoodRecommendationContext,
    eatIds: Set<string>,
    avoidIds: Set<string>,
    need: { vata: number; pitta: number; kapha: number },
  ): FoodChipItem[] {
    return FOOD_CATALOG.filter((f) => {
      if (eatIds.has(f.id) || avoidIds.has(f.id)) return false;
      if (ctx.isEkadashi && !f.ekadashiOk) return false;
      const eat = this.pacifyScore(f, need, ctx.ritu);
      const avoid = this.aggravateScore(f, need, ctx.ritu);
      return Math.abs(eat) < 1.5 && Math.abs(avoid) < 1.5;
    })
      .slice(0, 6)
      .map((f) => this.chipItem(f, 'neutral', need, ctx));
  }

  private constitutionLabel(p: PrakritiScores): string {
    const order: DoshaType[] = ['vata', 'pitta', 'kapha'];
    const sorted = [...order].sort((a, b) => p[b] - p[a]);
    const primary = sorted[0];
    const secondary = sorted[1];
    if (p[secondary] >= p[primary] * 0.72 && p[secondary] >= 25) {
      return `${DOSHA_LABEL[primary]}–${DOSHA_LABEL[secondary]}`;
    }
    return DOSHA_LABEL[primary];
  }

  private buildSummary(prakriti: PrakritiScores, ctx: FoodRecommendationContext): string {
    const label = this.constitutionLabel(prakriti);
    const parts = [
      `Your ${label} constitution (${prakriti.vata}% Vata · ${prakriti.pitta}% Pitta · ${prakriti.kapha}% Kapha)`,
    ];
    if (ctx.isEkadashi) parts.push('Ekadashi calls for lighter, sattvic choices');
    if (ctx.ritu) parts.push(`${ctx.ritu} Ritu adjusts what your Agni needs today`);
    return parts.join('. ') + '.';
  }

  private chip(food: FoodItem): string {
    return `${food.emoji} ${food.name}`;
  }

  private chipItem(
    food: FoodItem,
    kind: 'eat' | 'avoid' | 'neutral',
    need: { vata: number; pitta: number; kapha: number },
    ctx: FoodRecommendationContext,
    overrideReason?: string,
  ): FoodChipItem {
    return {
      label: this.chip(food),
      reason: overrideReason ?? this.buildReason(food, kind, need, ctx),
    };
  }

  private buildReason(
    food: FoodItem,
    kind: 'eat' | 'avoid' | 'neutral',
    need: { vata: number; pitta: number; kapha: number },
    ctx: FoodRecommendationContext,
  ): string {
    if (kind === 'neutral') {
      return 'Balanced for today — fine in moderation with mindful portions.';
    }

    const dominant = (['vata', 'pitta', 'kapha'] as DoshaType[]).reduce((a, b) =>
      need[a] >= need[b] ? a : b,
    );
    const doshaLabel = DOSHA_LABEL[dominant];

    if (kind === 'eat') {
      const effects: string[] = [];
      if (food.vata < 0 && need.vata >= 25) effects.push('grounds Vata');
      if (food.pitta < 0 && need.pitta >= 25) effects.push('cools Pitta');
      if (food.kapha < 0 && need.kapha >= 25) effects.push('lightens Kapha');
      if (food.rituBoost?.includes(ctx.ritu)) effects.push(`ideal in ${ctx.ritu} Ritu`);
      if (ctx.isEkadashi && food.ekadashiOk) effects.push('Ekadashi-friendly');
      if (effects.length) return `${effects.slice(0, 2).join(' · ')} — supports ${doshaLabel} balance today.`;
      return `Pacifies elevated ${doshaLabel} for your constitution today.`;
    }

    const aggravates: string[] = [];
    if (food.vata > 0 && need.vata >= 25) aggravates.push('aggravates Vata');
    if (food.pitta > 0 && need.pitta >= 25) aggravates.push('heats Pitta');
    if (food.kapha > 0 && need.kapha >= 25) aggravates.push('increases Kapha');
    if (aggravates.length) return `${aggravates.slice(0, 2).join(' · ')} — best avoided today.`;
    return `Works against ${doshaLabel} balance in today's lunar climate.`;
  }

  private fallbackEat(dominant: DoshaType): FoodChipItem[] {
    const ids: Record<DoshaType, string[]> = {
      vata: ['ghee', 'warm-milk', 'sweet-potato', 'dates', 'ginger-tea', 'almonds'],
      pitta: ['coconut-water', 'cucumber', 'coriander', 'seasonal-fruits', 'mint-tea', 'oats'],
      kapha: ['ginger-tea', 'honey', 'light-soup', 'bitter-gourd', 'pepper', 'lemon-water'],
    };
    return ids[dominant].map((id) => {
      const food = FOOD_CATALOG.find((f) => f.id === id)!;
      return { label: this.chip(food), reason: `Classic ${DOSHA_LABEL[dominant]}-pacifying choice.` };
    });
  }

  private fallbackAvoid(dominant: DoshaType): FoodChipItem[] {
    const ids: Record<DoshaType, string[]> = {
      vata: ['cold-drinks', 'raw-salad', 'popcorn', 'coffee'],
      pitta: ['chilli', 'alcohol', 'sour-pickles', 'fermented'],
      kapha: ['heavy-dairy', 'sweets', 'deep-fried', 'ice-cream'],
    };
    return ids[dominant].map((id) => {
      const food = FOOD_CATALOG.find((f) => f.id === id)!;
      return { label: this.chip(food), reason: `Commonly aggravates ${DOSHA_LABEL[dominant]}.` };
    });
  }
}
