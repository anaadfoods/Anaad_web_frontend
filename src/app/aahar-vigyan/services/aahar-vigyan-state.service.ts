import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthState } from '../../core/state/auth.state';
import {
  AaharVigyanProfile,
  DoshaCode,
  DoshaType,
  PrakritiScores,
} from '../models/aahar-vigyan.model';

const STORAGE_PREFIX = 'anaad_aahar_vigyan_';

@Injectable({ providedIn: 'root' })
export class AaharVigyanStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authState = inject(AuthState);

  private readonly profile = signal<AaharVigyanProfile | null>(null);

  readonly isOnboardingComplete = computed(() => !!this.profile()?.completedAt);
  readonly prakriti = computed(() => this.profile()?.prakriti ?? null);
  readonly dominantDosha = computed(() => this.profile()?.prakriti.dominant ?? 'vata');

  loadForCurrentUser(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const userId = this.authState.user()?.id;
    if (!userId) {
      this.profile.set(null);
      return;
    }
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      this.profile.set(raw ? (JSON.parse(raw) as AaharVigyanProfile) : null);
    } catch {
      this.profile.set(null);
    }
  }

  clearForCurrentUser(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const userId = this.authState.user()?.id;
    if (userId) {
      localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
    }
    this.profile.set(null);
  }

  /** Dev/testing — remove every saved Aahar Vigyan profile from localStorage */
  clearAllProfiles(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    this.profile.set(null);
  }

  calculatePrakriti(answers: DoshaCode[]): PrakritiScores {
    const counts = { v: 0, p: 0, k: 0 };
    answers.forEach((a) => counts[a]++);
    const total = answers.length || 1;
    const vata = Math.round((counts.v / total) * 100);
    const pitta = Math.round((counts.p / total) * 100);
    const kapha = Math.round((counts.k / total) * 100);

    const codeToDosha: Record<DoshaCode, DoshaType> = { v: 'vata', p: 'pitta', k: 'kapha' };
    const topCode = (Object.entries(counts) as [DoshaCode, number][]).reduce((best, entry) =>
      entry[1] > best[1] ? entry : best,
    )[0];

    return { vata, pitta, kapha, dominant: codeToDosha[topCode] };
  }

  savePrakriti(answers: DoshaCode[]): PrakritiScores {
    const prakriti = this.calculatePrakriti(answers);
    const profile: AaharVigyanProfile = {
      completedAt: new Date().toISOString(),
      answers,
      prakriti,
    };
    this.persist(profile);
    return prakriti;
  }

  private persist(profile: AaharVigyanProfile): void {
    this.profile.set(profile);
    if (!isPlatformBrowser(this.platformId)) return;
    const userId = this.authState.user()?.id;
    if (!userId) return;
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(profile));
  }
}
