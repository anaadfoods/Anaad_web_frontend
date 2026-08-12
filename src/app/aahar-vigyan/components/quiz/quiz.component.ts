import {
  ChangeDetectionStrategy,
  Component,
  output,
  signal,
  computed,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { AAHAR_VIGYAN_QUIZ, QUIZ_TIME_ESTIMATES } from '../../data/quiz-questions';
import { DoshaCode } from '../../models/aahar-vigyan.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-aahar-vigyan-quiz',
  standalone: true,
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.scss',
})
export class AaharVigyanQuizComponent {
  readonly completed = output<DoshaCode[]>();
  readonly backToWelcome = output<void>();

  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly questions = AAHAR_VIGYAN_QUIZ;
  protected readonly step = signal(0);
  protected readonly answers = signal<DoshaCode[]>([]);
  protected readonly selected = signal<DoshaCode | null>(null);

  protected readonly current = computed(() => this.questions[this.step()]);
  protected readonly progress = computed(() => ((this.step() + 1) / this.questions.length) * 100);
  protected readonly counter = computed(() => `${this.step() + 1} / ${this.questions.length}`);
  protected readonly timeLeft = computed(() => QUIZ_TIME_ESTIMATES[this.step()] ?? 'Almost done');
  protected readonly isLast = computed(() => this.step() === this.questions.length - 1);
  protected readonly hasSelection = computed(() => this.selected() !== null);

  select(dosha: DoshaCode): void {
    this.selected.set(dosha);
    this.cdr.markForCheck();
  }

  next(): void {
    const sel = this.selected();
    if (!sel) return;

    const nextAnswers = [...this.answers(), sel];

    if (this.step() < this.questions.length - 1) {
      this.answers.set(nextAnswers);
      this.step.update((s) => s + 1);
      this.selected.set(null);
      this.cdr.markForCheck();
      return;
    }

    // Last question — emit full answer set to parent
    this.completed.emit(nextAnswers);
  }

  back(): void {
    if (this.step() > 0) {
      const prev = [...this.answers()];
      prev.pop();
      this.answers.set(prev);
      this.step.update((s) => s - 1);
      this.selected.set(prev[prev.length - 1] ?? null);
    } else {
      this.backToWelcome.emit();
    }
    this.cdr.markForCheck();
  }
}
