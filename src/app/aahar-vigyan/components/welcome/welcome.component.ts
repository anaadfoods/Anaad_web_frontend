import { ChangeDetectionStrategy, Component, output, signal, OnInit } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-aahar-vigyan-welcome',
  standalone: true,
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class AaharVigyanWelcomeComponent implements OnInit {
  readonly startQuiz = output<void>();

  protected readonly greeting = signal('GOOD MORNING');
  protected readonly cardsVisible = signal([false, false, false]);

  ngOnInit(): void {
    const h = new Date().getHours();
    this.greeting.set(h < 12 ? 'GOOD MORNING' : h < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING');
    [0, 1, 2].forEach((i) => {
      setTimeout(() => {
        const current = [...this.cardsVisible()];
        current[i] = true;
        this.cardsVisible.set(current);
      }, 180 + i * 160);
    });
  }

  onStart(): void {
    this.startQuiz.emit();
  }
}
