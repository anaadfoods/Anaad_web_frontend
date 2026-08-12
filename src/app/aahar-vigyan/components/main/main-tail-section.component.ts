import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SeasonInfo } from '../../models/panchang-rich.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-main-tail-section',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
  template: `
    @if (season(); as s) {
      <section class="av-section av-season-sec" id="season" appScrollReveal>
        <div class="av-container av-season-layout">
          <div>
            <span class="av-cap">Seasonal Wisdom · ऋतु आहार</span>
            <h2 class="av-d2 av-sr">{{ s.name }} —<br><em>{{ s.subtitle }}</em></h2>
            <p class="av-sec-lead">{{ s.desc }}</p>
            <div class="av-season-principle">
              <div class="av-sp-label">✦ Seasonal Principle</div>
              <p>{{ s.principle }}</p>
            </div>
            <div class="av-season-badges">
              <span class="av-badge av-badge-green">{{ s.name }}</span>
              @if (ritu()) {
                <span class="av-badge av-badge-accent">{{ ritu() }} Ritu</span>
              }
              <span class="av-badge av-badge-muted">{{ s.period }}</span>
            </div>
          </div>
          <div class="av-season-right">
            <div class="av-card av-season-card">
              <div class="av-sc-icon av-sc-picks">🌿</div>
              <h4 class="av-sc-title av-lora">Seasonal Picks</h4>
              <p class="av-sc-body">{{ s.picks }}</p>
            </div>
            <div class="av-card av-season-card">
              <div class="av-sc-icon av-sc-avoid">⚠</div>
              <h4 class="av-sc-title av-lora">Seasonal Avoids</h4>
              <p class="av-sc-body">{{ s.avoids }}</p>
            </div>
            <div class="av-card av-season-card">
              <div class="av-sc-icon av-sc-herbs">🍃</div>
              <h4 class="av-sc-title av-lora">{{ ritu() || 'Season' }} Herbs</h4>
              <p class="av-sc-body">{{ s.herbs }}</p>
            </div>
            <div class="av-card av-season-card av-season-ritual">
              <div class="av-sc-emoji">🌧️</div>
              <h4 class="av-sc-title av-lora">Season Ritual</h4>
              <p class="av-sc-body av-sc-body-inv">{{ s.ritual }}</p>
            </div>
          </div>
        </div>
      </section>
    }

    <section class="av-cta-sec" appScrollReveal>
      <div class="av-cta-inner">
        <div class="av-cta-icon">☸</div>
        <h2 class="av-cta-h1 av-sr">Your guide is ready.<br><em>Go deeper in the app.</em></h2>
        <p class="av-cta-sub">Full Kundali, daily Panchang push notifications, and personalised meal plans — all in the ANAAD app.</p>
        <div class="av-cta-actions">
          <button type="button" class="av-btn av-btn-gold av-btn-lg av-dv" (click)="openApp.emit()">Get the ANAAD App →</button>
          <a routerLink="/profile" class="av-btn av-btn-ghost av-btn-lg">My Profile</a>
        </div>
        <p class="av-cta-note">Free to start · Available on iOS & Android</p>
      </div>
    </section>
  `,
  styleUrl: './main-tail-section.component.scss',
})
export class MainTailSectionComponent {
  readonly season = input<SeasonInfo | undefined>();
  readonly ritu = input<string | undefined>();
  readonly openApp = output<void>();
}
