import { inject, Injectable, PLATFORM_ID, signal, EffectRef, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { AuthState } from '../state/auth.state';
import { NotificationItem, NotificationSyncResponse, UnreadCountResponse } from '../models/notification.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  // ── State Signals ─────────────────────────
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal<number>(0);

  private sinceVersion = 0;
  private pollInterval: any;

  private socket: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private isWsConnecting = false;

  constructor() {
    // Generate device id and start sync if already authenticated on browser
    if (isPlatformBrowser(this.platformId)) {
      this.getOrCreateDeviceId();
      
      // Monitor auth state changes to start/stop polling
      this.initPolling();

      // Initialize Web Push
      this.initWebPush();

      // Listen to tab visibility & focus to sync
      this.initForegroundSync();

      // Reactively connect/disconnect WS on auth state changes
      effect(() => {
        if (this.authState.isAuthenticated()) {
          console.log('[NotificationService] User authenticated. Syncing and connecting WS...');
          this.sync().subscribe();
          this.fetchUnreadCount().subscribe();
          this.connectWebSocket();
        } else {
          console.log('[NotificationService] User logged out. Disconnecting WS and resetting state...');
          this.disconnectWebSocket();
          this.notifications.set([]);
          this.unreadCount.set(0);
          this.sinceVersion = 0;
        }
      });
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

  /** Logout this device from the backend */
  logoutDevice(): Observable<any> {
    if (!this.authState.isAuthenticated()) return of(null);

    const body = {
      device_id: this.getOrCreateDeviceId()
    };

    return this.http.post(API.NOTIFICATIONS.LOGOUT_DEVICE, body).pipe(
      catchError(err => {
        console.error('Error logging out device:', err);
        return of(null);
      })
    );
  }

  // ── Web Push Implementation ────────────────
  
  private async initWebPush() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Firebase Service Worker registered:', registration);

      // Load SDK scripts dynamically from CDN to handle SSR safety
      await this.loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

      const firebaseObj = (window as any).firebase;
      if (!firebaseObj) {
        console.error('Firebase script failed to load');
        return;
      }

      if (firebaseObj.apps.length === 0) {
        firebaseObj.initializeApp({
          apiKey: 'AIzaSyA9heNRcUmey1lY2_UGSCuZrdViksKoG2E',
          appId: '1:356514741847:web:056ced79df340a9c4dad12',
          messagingSenderId: '356514741847',
          projectId: 'anaadapp',
          authDomain: 'anaadapp.firebaseapp.com',
          storageBucket: 'anaadapp.firebasestorage.app',
          measurementId: 'G-0FD3CY2PWG',
        });
      }

      const messaging = firebaseObj.messaging();

      // Listen to foreground messages
      messaging.onMessage((payload: any) => {
        console.log('Foreground message received in Angular:', payload);
        
        // Sync authoritatively with backend to refresh state
        this.sync().subscribe();
        this.fetchUnreadCount().subscribe();

        const title = payload.data?.title || payload.notification?.title || 'New Notification';
        const body = payload.data?.body || payload.notification?.body || '';
        this.showForegroundToast(title, body, payload.data);
      });

      // Handle navigation messages from service worker clicks
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'navigate') {
          console.log('Navigating via Service Worker to:', event.data.path);
          this.router.navigateByUrl(event.data.path);
        }
      });

      // Check if permission is already granted and fetch token
      if (Notification.permission === 'granted') {
        this.retrieveAndRegisterToken(messaging);
      }
    } catch (e) {
      console.error('Error initializing web push:', e);
    }
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      if (scripts.some(s => s.src === url)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  requestPermission(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    Notification.requestPermission().then((permission) => {
      console.log('Notification permission status:', permission);
      if (permission === 'granted') {
        const firebaseObj = (window as any).firebase;
        if (firebaseObj) {
          const messaging = firebaseObj.messaging();
          this.retrieveAndRegisterToken(messaging);
        } else {
          this.initWebPush().then(() => {
            const fb = (window as any).firebase;
            if (fb) {
              this.retrieveAndRegisterToken(fb.messaging());
            }
          });
        }
      }
    });
  }

  private retrieveAndRegisterToken(messaging: any) {
    messaging.getToken().then((token: string) => {
      if (token) {
        console.log('Web FCM Token:', token);
        this.registerToken(token, 'web').subscribe();
      } else {
        console.warn('No registration token available. Request permission to generate one.');
      }
    }).catch((err: any) => {
      console.error('An error occurred while retrieving token. ', err);
    });
  }

  private showForegroundToast(title: string, body: string, data: any) {
    // Show native browser notification if permitted, or in-app toast
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/assets/favicon.ico',
        data: data
      });
    } else {
      // In-app alert fallback if browser notifications are not permitted
      alert(`${title}\n${body}`);
    }
  }

  // ── Tab Focus & Foreground Sync ───────────

  private initForegroundSync() {
    if (!isPlatformBrowser(this.platformId)) return;

    const handleSync = () => {
      if (this.authState.isAuthenticated()) {
        console.log('[NotificationService] Foreground sync triggered.');
        this.sync().subscribe();
        this.fetchUnreadCount().subscribe();
        this.connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    });

    window.addEventListener('focus', () => {
      handleSync();
    });
  }

  // ── WebSocket Live Channel ────────────────

  connectWebSocket() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.socket !== null || this.isWsConnecting) return;

    const token = this.authState.accessToken();
    if (!token) {
      console.log('[NotificationService] WS connection skipped: no access token.');
      return;
    }

    const deviceId = this.getOrCreateDeviceId();
    const wsBase = environment.apiBaseUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/notifications/?token=${token}&device_id=${deviceId}&platform=web`;

    this.isWsConnecting = true;
    console.log('[NotificationService] Connecting to WebSocket:', wsUrl);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isWsConnecting = false;
        console.log('[NotificationService] WebSocket connected successfully!');
        
        // Sync on connection to catch up
        this.sync().subscribe();
        this.fetchUnreadCount().subscribe();
      };

      this.socket.onmessage = (event) => {
        console.log('[NotificationService] WebSocket message:', event.data);
        this.handleWebSocketMessage(event.data);
      };

      this.socket.onerror = (err) => {
        console.error('[NotificationService] WebSocket error:', err);
        this.scheduleWsReconnect();
      };

      this.socket.onclose = () => {
        console.log('[NotificationService] WebSocket closed.');
        this.scheduleWsReconnect();
      };
    } catch (e) {
      this.isWsConnecting = false;
      console.error('[NotificationService] WebSocket connection exception:', e);
      this.scheduleWsReconnect();
    }
  }

  private scheduleWsReconnect() {
    this.socket = null;
    this.isWsConnecting = false;
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);

    if (this.authState.isAuthenticated()) {
      this.wsReconnectTimer = setTimeout(() => {
        console.log('[NotificationService] Attempting WebSocket reconnect...');
        this.connectWebSocket();
      }, 10000);
    }
  }

  private handleWebSocketMessage(rawMessage: string) {
    try {
      const event = JSON.parse(rawMessage);
      const eventName = event.event || '';
      const data = event.data;
      const unreadCount = event.unread_count;

      if (unreadCount !== undefined && unreadCount !== null) {
        this.unreadCount.set(unreadCount);
      }

      switch (eventName) {
        case 'NOTIFICATION_SYNC_ACK':
          console.log('[NotificationService] WS ACK:', data);
          break;
        case 'NOTIFICATION_CREATED':
        case 'NOTIFICATION_READ':
        case 'NOTIFICATION_DISMISSED':
          console.log('[NotificationService] WS Triggered sync for:', eventName);
          this.sync().subscribe();
          break;
        default:
          console.warn('[NotificationService] Unknown WS event:', eventName);
          break;
      }
    } catch (e) {
      console.error('[NotificationService] WS message parsing error:', e);
    }
  }

  disconnectWebSocket() {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isWsConnecting = false;
    console.log('[NotificationService] WebSocket disconnected manually.');
  }
}
