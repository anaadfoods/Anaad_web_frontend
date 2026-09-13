import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent {
  // Toast with clickable deep link support
  toastService = inject(ToastService);
  private router = inject(Router);

  onToastClick(toast: ToastMessage) {
    if (toast.onClick) {
      toast.onClick();
      this.remove(toast.id);
      return;
    }
    if (toast.deepLink) {
      const link = toast.deepLink.startsWith('/') ? toast.deepLink : `/${toast.deepLink}`;
      this.router.navigateByUrl(link);
      this.remove(toast.id);
    }
  }

  remove(id: number, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.toastService.remove(id);
  }
}
