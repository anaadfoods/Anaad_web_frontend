import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-aahar-vigyan-app-download',
  standalone: true,
  templateUrl: './app-download-modal.component.html',
  styleUrl: './app-download-modal.component.scss',
})
export class AppDownloadModalComponent {
  readonly closed = output<void>();

  /** Placeholder until store links are provided */
  readonly appLink = '#';

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('av-modal-overlay')) {
      this.close();
    }
  }
}
