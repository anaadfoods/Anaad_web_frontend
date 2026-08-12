import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  computed,
  AfterViewInit,
  ElementRef,
  inject,
} from '@angular/core';
import { PrakritiScores } from '../../models/aahar-vigyan.model';
import { PRAKRITI_DETAILS } from '../../data/prakriti-data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-aahar-vigyan-prakriti',
  standalone: true,
  templateUrl: './prakriti-result.component.html',
  styleUrl: './prakriti-result.component.scss',
})
export class AaharVigyanPrakritiComponent implements AfterViewInit {
  readonly prakriti = input.required<PrakritiScores>();
  readonly continueToMain = output<void>();
  readonly retakeQuiz = output<void>();

  private readonly el = inject(ElementRef);

  protected readonly detail = computed(() => PRAKRITI_DETAILS[this.prakriti().dominant]);
  protected readonly dominantPct = computed(() => {
    const p = this.prakriti();
    return Math.max(p.vata, p.pitta, p.kapha);
  });

  ngAfterViewInit(): void {
    setTimeout(() => this.animateRings(), 300);
  }

  private animateRings(): void {
    const p = this.prakriti();
    const root = this.el.nativeElement as HTMLElement;
    const ringK = root.querySelector('#ring-k') as SVGCircleElement | null;
    const ringP = root.querySelector('#ring-p') as SVGCircleElement | null;
    const ringV = root.querySelector('#ring-v') as SVGCircleElement | null;
    if (ringK) ringK.style.strokeDasharray = `${(p.kapha / 100) * 553} 553`;
    if (ringP) ringP.style.strokeDasharray = `${(p.pitta / 100) * 415} 415`;
    if (ringV) ringV.style.strokeDasharray = `${(p.vata / 100) * 289} 289`;
  }
}
