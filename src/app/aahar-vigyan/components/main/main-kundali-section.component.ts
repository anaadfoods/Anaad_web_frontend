import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { KundaliChartPreviewComponent } from './kundali-chart-preview.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { KUNDALI_PLANET_CARDS } from '../../data/panchang-page.data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-main-kundali-section',
  standalone: true,
  imports: [KundaliChartPreviewComponent, ScrollRevealDirective],
  template: `
    <section class="av-section av-kund-sec" id="kundali" appScrollReveal>
      <div class="av-container">
        <div class="av-kund-head">
          <span class="av-cap av-cap-jyotish">Jyotish · ज्योतिष</span>
          <h2 class="av-d2 av-sr av-center">Your stars reveal<br>your <em>food intelligence.</em></h2>
          <p class="av-sec-lead av-center">Planetary positions at birth define food affinities, digestive patterns, and which seasonal foods align with your cosmic constitution.</p>
        </div>
        <div class="av-kund-layout">
          <div>
            <app-kundali-chart-preview (chartClick)="openApp.emit()" />
            <div class="av-planet-legend">
              @for (p of legend; track p.n) {
                <span class="av-legend-item"><span class="av-legend-dot" [style.background]="p.c"></span>{{ p.n }}</span>
              }
            </div>
          </div>
          <div class="av-kund-info">
            <span class="av-cap">Planetary Food Influence</span>
            <h3 class="av-kund-title av-lora">Your birth chart shapes<br><em>what nourishes you.</em></h3>
            <p class="av-kund-desc">Full Kundali analysis — planetary food affinities, lagna insights, and daily Jyotish guidance — is available in the ANAAD app.</p>
            <div class="av-kund-planets">
              @for (planet of planetCards; track planet.name) {
                <div class="av-planet-card" (click)="openApp.emit()" role="button" tabindex="0" (keyup.enter)="openApp.emit()">
                  <div class="av-pc-top">
                    <div class="av-pc-dot" [style.background]="planet.color"><span>{{ planet.symbol }}</span></div>
                    <span class="av-pc-pname">{{ planet.name }}</span>
                    <span class="av-pc-house av-mono">{{ planet.house }}</span>
                  </div>
                  <div class="av-pc-food">
                    @if (planet.highlight) { <strong>{{ planet.highlight }}</strong> }
                    {{ planet.food }}
                  </div>
                </div>
              }
            </div>
            <button type="button" class="av-btn av-btn-primary av-btn-md" (click)="openApp.emit()">Open Full Kundali in App →</button>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './main-kundali-section.component.scss',
})
export class MainKundaliSectionComponent {
  readonly openApp = output<void>();
  protected readonly planetCards = KUNDALI_PLANET_CARDS;
  protected readonly legend = [
    { c: '#E8A020', n: 'Sun' },
    { c: '#7090B8', n: 'Moon' },
    { c: '#D05040', n: 'Mars' },
    { c: '#3A9070', n: 'Mercury' },
    { c: '#C08030', n: 'Jupiter' },
    { c: '#C86080', n: 'Venus ★' },
    { c: '#5050A0', n: 'Saturn' },
  ];
}
