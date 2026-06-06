import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthState } from '../../core/state/auth.state';
import { CartState } from '../../core/state/cart.state';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  bannerMessages = [
    'Current batch: AN-SON-0526 · Zero residue · SGS Certified',
    'Pre-harvest allocation · Lock your supply · Share the farm risk',
    'Milled this week · Dispatched in 72 hours · Pan-India delivery'
  ];
  currentBannerIndex = signal(0);
  private bannerIntervalId: any;

  ngOnInit() {
    if (typeof window !== 'undefined') {
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
    return this.bannerMessages[this.currentBannerIndex()];
  }
  readonly authState = inject(AuthState);
  readonly cartState = inject(CartState);
  readonly notificationSvc = inject(NotificationService);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);

  isOpen = signal(false);
  isNotificationsOpen = signal(false);

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
          this.router.navigate(['/subscriptions', objectId]);
        } else {
          this.router.navigate(['/orders', objectId]);
        }
      }
    } catch (e) {
      console.warn('Failed to parse notification metadata', e);
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
}
