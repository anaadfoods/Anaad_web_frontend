import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kundali-chart-preview',
  standalone: true,
  template: `
    <div class="av-kund-svg-wrap" (click)="chartClick.emit()" role="button" tabindex="0" (keyup.enter)="chartClick.emit()">
      <div class="av-kund-label-badge">Janma Kundali · जन्म कुंडली</div>
      <svg width="360" height="360" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-label="North Indian birth chart preview">
        <rect width="400" height="400" fill="rgba(238,234,248,.3)" rx="4" />
        <rect x="18" y="18" width="364" height="364" fill="none" stroke="#8070C0" stroke-width="1.5" rx="3" />
        <rect x="118" y="118" width="164" height="164" fill="rgba(196,144,15,.04)" stroke="#8070C0" stroke-width="1.2" />
        <line x1="18" y1="18" x2="118" y2="118" stroke="#8070C0" stroke-width="1" />
        <line x1="382" y1="18" x2="282" y2="118" stroke="#8070C0" stroke-width="1" />
        <line x1="18" y1="382" x2="118" y2="282" stroke="#8070C0" stroke-width="1" />
        <line x1="382" y1="382" x2="282" y2="282" stroke="#8070C0" stroke-width="1" />
        <line x1="200" y1="18" x2="200" y2="118" stroke="#8070C0" stroke-width="1" />
        <line x1="200" y1="282" x2="200" y2="382" stroke="#8070C0" stroke-width="1" />
        <line x1="18" y1="200" x2="118" y2="200" stroke="#8070C0" stroke-width="1" />
        <line x1="282" y1="200" x2="382" y2="200" stroke="#8070C0" stroke-width="1" />
        <line x1="118" y1="118" x2="282" y2="282" stroke="#8070C0" stroke-width="1" stroke-dasharray="4 3" />
        <line x1="282" y1="118" x2="118" y2="282" stroke="#8070C0" stroke-width="1" stroke-dasharray="4 3" />
        <text x="200" y="76" text-anchor="middle" fill="rgba(74,74,138,.7)" font-size="11" font-family="IBM Plex Sans, monospace" font-weight="500">I</text>
        <text x="315" y="76" text-anchor="middle" fill="rgba(74,74,138,.6)" font-size="10" font-family="IBM Plex Sans, monospace">II</text>
        <text x="85" y="76" text-anchor="middle" fill="rgba(74,74,138,.6)" font-size="10" font-family="IBM Plex Sans, monospace">XII</text>
        <text x="348" y="205" text-anchor="middle" fill="rgba(74,74,138,.6)" font-size="10" font-family="IBM Plex Sans, monospace">III</text>
        <text x="315" y="330" text-anchor="middle" fill="rgba(74,74,138,.6)" font-size="10" font-family="IBM Plex Sans, monospace">IV</text>
        <text x="200" y="332" text-anchor="middle" fill="rgba(74,74,138,.6)" font-size="10" font-family="IBM Plex Sans, monospace">V</text>
        <text x="85" y="330" text-anchor="middle" fill="rgba(74,74,138,.6)" font-size="10" font-family="IBM Plex Sans, monospace">VI</text>
        <text x="52" y="205" text-anchor="middle" fill="rgba(74,74,138,.6)" font-size="10" font-family="IBM Plex Sans, monospace">VII</text>
        <circle cx="200" cy="200" r="22" fill="rgba(196,144,15,.12)" stroke="rgba(196,144,15,.5)" stroke-width="1.5" />
        <circle cx="200" cy="200" r="8" fill="#C4900F" />
        <text x="200" y="218" text-anchor="middle" fill="rgba(74,74,138,.7)" font-size="8" font-family="Noto Sans Devanagari, sans-serif">लग्न</text>
        <circle cx="255" cy="136" r="14" fill="#E8A020" opacity=".9" />
        <text x="255" y="140" text-anchor="middle" fill="white" font-size="12" font-weight="bold">☉</text>
        <circle cx="320" cy="315" r="14" fill="#7090B8" opacity=".9" />
        <text x="320" y="319" text-anchor="middle" fill="white" font-size="12" font-weight="bold">☽</text>
        <circle cx="340" cy="170" r="13" fill="#D05040" opacity=".85" />
        <text x="340" y="174" text-anchor="middle" fill="white" font-size="11" font-weight="bold">♂</text>
        <circle cx="315" cy="50" r="12" fill="#3A9070" opacity=".85" />
        <text x="315" y="54" text-anchor="middle" fill="white" font-size="11">☿</text>
        <circle cx="200" cy="347" r="14" fill="#C08030" opacity=".9" />
        <text x="200" y="351" text-anchor="middle" fill="white" font-size="12" font-weight="bold">♃</text>
        <circle cx="200" cy="55" r="16" fill="#C86080" opacity=".95" />
        <text x="200" y="59" text-anchor="middle" fill="white" font-size="13" font-weight="bold">♀</text>
        <circle cx="175" cy="75" r="12" fill="#5050A0" opacity=".85" />
        <text x="175" y="79" text-anchor="middle" fill="white" font-size="11">♄</text>
        <circle cx="75" cy="54" r="12" fill="#8070A8" opacity=".8" />
        <text x="75" y="58" text-anchor="middle" fill="white" font-size="10">☊</text>
        <circle cx="75" cy="316" r="12" fill="#708090" opacity=".8" />
        <text x="75" y="320" text-anchor="middle" fill="white" font-size="10">☋</text>
      </svg>
      <p class="av-kund-overlay-hint">Tap for full Kundali in app →</p>
    </div>
  `,
  styles: [`
    .av-kund-svg-wrap {
      background: rgba(255, 255, 255, 0.6);
      border-radius: 28px;
      padding: 32px;
      border: 1px solid rgba(74, 74, 138, 0.15);
      box-shadow: 0 12px 36px rgba(26, 32, 16, 0.11);
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      cursor: pointer;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }
    .av-kund-svg-wrap:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(74, 74, 138, 0.15); }
    .av-kund-label-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: #4a4a8a;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 16px;
      border-radius: 100px;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .av-kund-overlay-hint {
      margin-top: 16px;
      font-size: 0.8rem;
      color: #4a4a8a;
      font-weight: 600;
    }
  `],
})
export class KundaliChartPreviewComponent {
  readonly chartClick = output<void>();
}
