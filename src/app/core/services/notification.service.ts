import { inject, Injectable, PLATFORM_ID, signal, EffectRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, of, tap } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { AuthState } from '../state/auth.state';
import { NotificationItem, NotificationSyncResponse, UnreadCountResponse } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly platformId = inject(PLATFORM_ID);

  // ── State Signals ─────────────────────────
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal<number>(0);

  private sinceVersion = 0;
  private pollInterval: any;

  constructor() {
    // Generate device id and start sync if already authenticated on browser
    if (isPlatformBrowser(this.platformId)) {
      this.getOrCreateDeviceId();
      
      // Monitor auth state changes to start/stop polling
      // In Angular 16+, we can register an effect or just run simple checks.
      // Since it's in a constructor, we can use an interval that checks auth status.
      this.initPolling();
    }
  }

  // ── Device ID Management ──────────────────

  getOrCreateDeviceId(): string {
    if (!isPlatformBrowser(this.platformId)) return 'server-side';
    let id = localStorage.getItem('anaad_device_id');
    if (!id) {
      id = 'web_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('anaad_device_id', id);
    }
    return id;
  }

  // ── Polling & Lifecycle ───────────────────

  private initPolling() {
    // Poll every 30 seconds for new notifications and unread count
    this.pollInterval = setInterval(() => {
      if (this.authState.isAuthenticated()) {
        this.sync().subscribe();
        this.fetchUnreadCount().subscribe();
      } else {
        // Reset state on logout
        if (this.notifications().length > 0) {
          this.notifications.set([]);
          this.unreadCount.set(0);
          this.sinceVersion = 0;
        }
      }
    }, 30000);

    // Initial load
    setTimeout(() => {
      if (this.authState.isAuthenticated()) {
        this.sync().subscribe();
        this.fetchUnreadCount().subscribe();
      }
    }, 1000);
  }

  // ── API Methods ───────────────────────────

  /** Sync notifications since last version */
  sync(): Observable<NotificationSyncResponse | null> {
    if (!this.authState.isAuthenticated()) return of(null);

    const params = new HttpParams()
      .set('since_version', this.sinceVersion.toString())
      .set('limit', '50');

    return this.http.get<NotificationSyncResponse>(API.NOTIFICATIONS.SYNC, { params }).pipe(
      tap(res => {
        if (res) {
          const current = this.notifications();
          const updated = [...current];

          res.notifications.forEach(n => {
            const idx = updated.findIndex(item => item.id === n.id);
            if (idx !== -1) {
              if (n.is_dismissed) {
                updated.splice(idx, 1); // remove dismissed
              } else {
                updated[idx] = n; // update state
              }
            } else if (!n.is_dismissed) {
              updated.push(n); // append new
            }
          });

          // Sort by creation date or ID descending (newest first)
          updated.sort((a, b) => b.id - a.id);
          this.notifications.set(updated);
          this.sinceVersion = res.latest_version;
          this.updateUnreadCountLocally();
        }
      }),
      catchError(err => {
        console.error('Error syncing notifications:', err);
        return of(null);
      })
    );
  }

  /** Get active unread count from server */
  fetchUnreadCount(): Observable<UnreadCountResponse | null> {
    if (!this.authState.isAuthenticated()) return of(null);

    return this.http.get<UnreadCountResponse>(API.NOTIFICATIONS.UNREAD_COUNT).pipe(
      tap(res => {
        if (res) {
          this.unreadCount.set(res.unread_count);
        }
      }),
      catchError(err => {
        console.error('Error fetching unread count:', err);
        return of(null);
      })
    );
  }

  /** Mark selected notifications as read */
  markAsRead(notificationIds: number[]): Observable<any> {
    if (notificationIds.length === 0 || !this.authState.isAuthenticated()) return of(null);

    const body = {
      notification_ids: notificationIds,
      origin_device_id: this.getOrCreateDeviceId()
    };

    // Optimistically update local state
    this.notifications.update(list => list.map(item => {
      if (notificationIds.includes(item.id)) {
        return { ...item, is_read: true };
      }
      return item;
    }));
    this.updateUnreadCountLocally();

    return this.http.post(API.NOTIFICATIONS.READ, body).pipe(
      tap(() => this.sync().subscribe()), // sync immediately to align versions
      catchError(err => {
        console.error('Error marking notifications as read:', err);
        return of(null);
      })
    );
  }

  /** Dismiss (hide) selected notifications */
  dismiss(notificationIds: number[]): Observable<any> {
    if (notificationIds.length === 0 || !this.authState.isAuthenticated()) return of(null);

    const body = {
      notification_ids: notificationIds,
      origin_device_id: this.getOrCreateDeviceId()
    };

    // Optimistically update local state
    this.notifications.update(list => list.filter(item => !notificationIds.includes(item.id)));
    this.updateUnreadCountLocally();

    return this.http.post(API.NOTIFICATIONS.DISMISS, body).pipe(
      tap(() => this.sync().subscribe()), // sync immediately to align versions
      catchError(err => {
        console.error('Error dismissing notifications:', err);
        return of(null);
      })
    );
  }

  /** Register device FCM push token with backend */
  registerToken(token: string, platform: 'android' | 'ios' | 'web' = 'web'): Observable<any> {
    if (!this.authState.isAuthenticated()) return of(null);

    const body = {
      token,
      device_id: this.getOrCreateDeviceId(),
      platform
    };

    return this.http.post(API.NOTIFICATIONS.REGISTER_TOKEN, body).pipe(
      catchError(err => {
        console.error('Error registering device token:', err);
        return of(null);
      })
    );
  }

  /** Mark all current notifications as read */
  markAllAsRead(): Observable<any> {
    const unreadIds = this.notifications()
      .filter(n => !n.is_read)
      .map(n => n.id);

    return this.markAsRead(unreadIds);
  }

  /** Helper to update unread count based on current signal state */
  private updateUnreadCountLocally() {
    const count = this.notifications().filter(n => !n.is_read).length;
    this.unreadCount.set(count);
  }
}
