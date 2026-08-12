import { LogService } from '../../core/services/log.service';
import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectionStrategy, PLATFORM_ID, HostListener, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthState } from '../../core/state/auth.state';
import { CartState } from '../../core/state/cart.state';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  protected readonly aaharVigyanEnabled = environment.aaharVigyanEnabled;
  private readonly logSvc = inject(LogService);
  private readonly platformId = inject(PLATFORM_ID);
  bannerMessages = [
    "India's food future is live. Join Early Access",
    "Farmer Income | Human Health | Ecological Balance",
    "Orders placed in the next 72 hours will be fulfilled on Aug'26 Week 1. Act now."
  ];
  currentBannerIndex = signal(0);
  private bannerIntervalId: any;

  shouldPopBadge = signal(false);
  private isFirstCartCheck = true;

  constructor() {
    effect(() => {
      const count = this.cartState.itemCount();
      if (this.isFirstCartCheck) {
        this.isFirstCartCheck = false;
        return;
      }
      if (count > 0) {
        this.shouldPopBadge.set(true);
        setTimeout(() => {
          this.shouldPopBadge.set(false);
        }, 300);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.updateBannerHeight();
      }, 0);

      this.bannerIntervalId = setInterval(() => {
        this.currentBannerIndex.update(idx => (idx + 1) % this.bannerMessages.length);
      }, 4000);
    }
  }

  ngOnDestroy() {
    if (this.bannerIntervalId) {
      clearInterval(this.bannerIntervalId);
    }
  }

  currentBannerMessage() {
    const msgs = this.toastSvc.messages();
    if (msgs.length > 0) {
      return msgs[msgs.length - 1].message;
    }
    return this.bannerMessages[this.currentBannerIndex()];
  }
  readonly authState = inject(AuthState);
  readonly cartState = inject(CartState);
  readonly notificationSvc = inject(NotificationService);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);
  readonly toastSvc = inject(ToastService);

  isOpen = signal(false);
  isNotificationsOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.nav-notifications-container');
    if (!clickedInside) {
      this.closeNotifications();
    }
  }

  toggle() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.closeNotifications();
    }
  }

  close() {
    this.isOpen.set(false);
  }

  toggleNotifications() {
    this.isNotificationsOpen.update(v => !v);
    if (this.isNotificationsOpen()) {
      this.close(); // Close mobile menu if open
      this.notificationSvc.sync().subscribe();
      this.notificationSvc.requestPermission();
    }
  }

  closeNotifications() {
    this.isNotificationsOpen.set(false);
  }

  logout() {
    this.close();
    this.closeNotifications();
    this.authSvc.logout();
  }

  markAllAsRead() {
    this.notificationSvc.markAllAsRead().subscribe();
  }

  handleNotificationClick(item: any) {
    if (!item.is_read) {
      this.notificationSvc.markAsRead([item.id]).subscribe();
    }

    try {
      const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
      const type = metadata?.type || item.metadata?.type;
      const objectId = metadata?.id || item.metadata?.id || metadata?.order_id || item.metadata?.order_id || metadata?.subscription_id || item.metadata?.subscription_id;

      if (objectId) {
        if (type === 'subscription' || item.title.toLowerCase().includes('subscription')) {
          this.router.navigate(['/subscription', objectId]);
        } else {
          this.router.navigate(['/order', objectId]);
        }
      }
    } catch (e) {
      this.logSvc.warn('Failed to parse notification metadata', e);
    }

    this.closeNotifications();
    this.close();
  }

  dismissNotification(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.notificationSvc.dismiss([id]).subscribe();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private updateBannerHeight() {
    if (isPlatformBrowser(this.platformId)) {
      const banner = document.querySelector('.top-banner') as HTMLElement;
      if (banner) {
        document.documentElement.style.setProperty('--banner-h', banner.offsetHeight + 'px');
      }
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateBannerHeight();
  }

  @HostListener('document:keydown.escape')
  closeMenu() {
    this.close();
  }
}
