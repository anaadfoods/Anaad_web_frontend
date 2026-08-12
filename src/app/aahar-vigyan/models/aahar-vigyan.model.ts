export type DoshaCode = 'v' | 'p' | 'k';
export type DoshaType = 'vata' | 'pitta' | 'kapha';

export interface QuizOption {
  dosha: DoshaCode;
  emoji: string;
  title: string;
  subtitle: string;
}

export interface QuizQuestion {
  question: string;
  hindi: string;
  hint: string;
  options: QuizOption[];
}

export interface PrakritiScores {
  vata: number;
  pitta: number;
  kapha: number;
  dominant: DoshaType;
}

export interface AaharVigyanProfile {
  completedAt: string;
  answers: DoshaCode[];
  prakriti: PrakritiScores;
}

export type AaharVigyanStep = 'welcome' | 'quiz' | 'prakriti' | 'main';

export interface PrakritiDetail {
  name: string;
  hindi: string;
  color: string;
  strengths: string[];
  watchouts: string[];
  goodFoods: string[];
  avoidFoods: string[];
  insight: string;
}

export interface DoshaInsight {
  name: string;
  nameHi: string;
  label: string;
  text: string;
}
