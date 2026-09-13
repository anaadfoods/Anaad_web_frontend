import { inject, Injectable, PLATFORM_ID, signal, EffectRef, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { AuthState } from '../state/auth.state';
import { NotificationItem, NotificationSyncResponse, UnreadCountResponse } from '../models/notification.model';
import { ToastService } from './toast.service';
import { StorageService, STORAGE_KEYS } from '../utils/storage.utils';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly toastSvc = inject(ToastService);
  private readonly storage = inject(StorageService);

  // ── State Signals ─────────────────────────
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal<number>(0);

  private sinceVersion = 0;
  private pollInterval: any;

  private socket: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private isWsConnecting = false;

  constructor() {
    // Generate device id and start sync on browser
    if (isPlatformBrowser(this.platformId)) {
      this.getOrCreateDeviceId();
      this.getOrCreateAnonymousId();

      // Register web device token with backend immediately
      this.registerToken('web_' + this.getOrCreateDeviceId(), 'web').subscribe();
      
      // Monitor auth state changes to start/stop polling
      this.initPolling();

      // Initialize Web Push
      this.initWebPush();

      // Listen to tab visibility & focus to sync
      this.initForegroundSync();

      // Reactively connect/reconnect WS and sync on auth state changes
      effect(() => {
        const isAuth = this.authState.isAuthenticated();
        console.log(`[NotificationService] Auth state changed (isAuthenticated=${isAuth}). Reconnecting WS...`);
        this.disconnectWebSocket();
        this.connectWebSocket();
        this.sync().subscribe();
        this.fetchUnreadCount().subscribe();
      });
    }
  }

  // ── Device & Identity Management ───────────────

  getOrCreateDeviceId(): string {
    if (!isPlatformBrowser(this.platformId)) return 'server-side';
    let id = localStorage.getItem('anaad_device_id');
    if (!id) {
      id = 'web_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('anaad_device_id', id);
    }
    return id;
  }

  getOrCreateAnonymousId(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    let id = this.storage.getItem(STORAGE_KEYS.ANONYMOUS_ID);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
      this.storage.setItem(STORAGE_KEYS.ANONYMOUS_ID, id);
    }
    return id;
  }

  // ── Polling & Lifecycle ───────────────────

  private initPolling() {
    // Poll every 30 seconds for new notifications and unread count
    this.pollInterval = setInterval(() => {
      this.sync().subscribe();
      this.fetchUnreadCount().subscribe();
    }, 30000);

    // Initial load
    setTimeout(() => {
      this.sync().subscribe();
      this.fetchUnreadCount().subscribe();
    }, 1000);
  }

  // ── API Methods ───────────────────────────

  /** Sync notifications since last version */
  sync(): Observable<NotificationSyncResponse | null> {
    let params = new HttpParams()
      .set('since_version', this.sinceVersion.toString())
      .set('limit', '50');

    if (!this.authState.isAuthenticated()) {
      const anonId = this.getOrCreateAnonymousId();
      if (!anonId) return of(null);
      params = params.set('anonymous_id', anonId);
    }

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
    let params = new HttpParams();
    if (!this.authState.isAuthenticated()) {
      const anonId = this.getOrCreateAnonymousId();
      if (!anonId) return of(null);
      params = params.set('anonymous_id', anonId);
    }

    return this.http.get<UnreadCountResponse>(API.NOTIFICATIONS.UNREAD_COUNT, { params }).pipe(
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
    if (notificationIds.length === 0) return of(null);

    const body: any = {
      notification_ids: notificationIds,
      origin_device_id: this.getOrCreateDeviceId()
    };
    if (!this.authState.isAuthenticated()) {
      body.anonymous_id = this.getOrCreateAnonymousId();
    }

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
    if (notificationIds.length === 0) return of(null);

    const body: any = {
      notification_ids: notificationIds,
      origin_device_id: this.getOrCreateDeviceId()
    };
    if (!this.authState.isAuthenticated()) {
      body.anonymous_id = this.getOrCreateAnonymousId();
    }

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
    const body: any = {
      token,
      device_id: this.getOrCreateDeviceId(),
      platform
    };
    if (!this.authState.isAuthenticated()) {
      body.anonymous_id = this.getOrCreateAnonymousId();
    }

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

  private showForegroundToast(title: string, body: string, data: any, deepLink?: string) {
    // Show native browser notification if permitted
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: '/assets/favicon.ico',
          data: data
        });
        notif.onclick = () => {
          if (isPlatformBrowser(this.platformId)) {
            window.focus();
            this.navigateToDeepLink(deepLink || data?.deep_link || data?.screen, data);
          }
        };
      } catch (e) {
        console.warn('Native notification display failed:', e);
      }
    }
  }

  /**
   * Navigate to the target screen based on deep_link string or metadata.
   */
  navigateToDeepLink(deepLink?: string | null, metadata?: any): void {
    if (!deepLink && !metadata) return;

    const rawTarget = (deepLink || metadata?.deep_link || metadata?.screen || metadata?.target || metadata?.action || '').toString().trim();
    if (!rawTarget) return;

    console.log('[NotificationService] Navigating to deep link:', rawTarget);

    // 1. External URL
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://')) {
      if (isPlatformBrowser(this.platformId)) {
        window.location.href = rawTarget;
      }
      return;
    }

    // 2. Direct absolute path starting with '/'
    if (rawTarget.startsWith('/')) {
      this.router.navigateByUrl(rawTarget);
      return;
    }

    const normalized = rawTarget.toLowerCase().replace(/^open_/, '').replace(/-/g, '_');
    const objectId = metadata?.id || metadata?.order_id || metadata?.subscription_id || metadata?.product_id;

    switch (normalized) {
      case 'cart':
        this.router.navigate(['/cart']);
        break;
      case 'checkout':
        this.router.navigate(['/checkout']);
        break;
      case 'store':
      case 'products':
      case 'pantry':
      case 'shop':
        this.router.navigate(['/products']);
        break;
      case 'product':
      case 'product_detail':
        if (objectId) {
          this.router.navigate(['/product', objectId]);
        } else {
          this.router.navigate(['/products']);
        }
        break;
      case 'orders':
      case 'order_list':
      case 'my_orders':
        this.router.navigate(['/profile'], { queryParams: { tab: 'orders' } });
        break;
      case 'order':
      case 'order_detail':
        if (objectId) {
          this.router.navigate(['/order', objectId]);
        } else {
          this.router.navigate(['/profile'], { queryParams: { tab: 'orders' } });
        }
        break;
      case 'subscriptions':
      case 'subscription_list':
        this.router.navigate(['/profile'], { queryParams: { tab: 'subscriptions' } });
        break;
      case 'subscription':
      case 'subscription_detail':
        if (objectId) {
          this.router.navigate(['/subscription', objectId]);
        } else {
          this.router.navigate(['/profile'], { queryParams: { tab: 'subscriptions' } });
        }
        break;
      case 'panchang':
        this.router.navigate(['/panchang']);
        break;
      case 'rfp':
        this.router.navigate(['/rfp']);
        break;
      case 'aahar_vigyan':
        this.router.navigate(['/aahar-vigyan']);
        break;
      case 'refer_earn':
      case 'referral':
        this.router.navigate(['/refer-earn']);
        break;
      case 'profile':
      case 'account':
      case 'settings':
        this.router.navigate(['/profile']);
        break;
      case 'home':
        this.router.navigate(['/']);
        break;
      default:
        this.router.navigateByUrl(`/${rawTarget}`);
        break;
    }
  }

  // ── Tab Focus & Foreground Sync ───────────

  private initForegroundSync() {
    if (!isPlatformBrowser(this.platformId)) return;

    const handleSync = () => {
      console.log('[NotificationService] Foreground sync triggered.');
      this.sync().subscribe();
      this.fetchUnreadCount().subscribe();
      this.connectWebSocket();
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
    const anonId = this.getOrCreateAnonymousId();
    const deviceId = this.getOrCreateDeviceId();

    const wsBase = environment.apiBaseUrl.replace(/^http/, 'ws');
    let wsUrl = `${wsBase}/ws/notifications/?device_id=${deviceId}&platform=web`;
    if (token) {
      wsUrl += `&token=${token}`;
    } else if (anonId) {
      wsUrl += `&anonymous_id=${anonId}`;
    }

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

    this.wsReconnectTimer = setTimeout(() => {
      console.log('[NotificationService] Attempting WebSocket reconnect...');
      this.connectWebSocket();
    }, 5000);
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

        case 'NOTIFICATION_CREATED': {
          console.log('[NotificationService] Real-time NOTIFICATION_CREATED received:', data);
          if (data) {
            const targetLink = data.deep_link || data.metadata?.deep_link || data.metadata?.screen || (data.metadata?.data && data.metadata.data.screen);

            const newItem: NotificationItem = {
              id: data.id || Date.now(),
              title: data.title || '',
              message: data.message || '',
              channel: data.channel || 'push',
              status: 'sent',
              priority: data.priority || 'normal',
              created_at: data.created_at || new Date().toISOString(),
              deep_link: targetLink,
              metadata: data.metadata || {},
              source: data.source || 'SERVER',
              is_read: false,
              is_dismissed: false,
              sync_version: data.sync_version || (this.sinceVersion + 1),
            };

            // 1. Instantly update reactive notifications signal (prepend)
            this.notifications.update(list => {
              const idx = list.findIndex(item => item.id === newItem.id);
              if (idx !== -1) {
                const updated = [...list];
                updated[idx] = newItem;
                return updated;
              }
              return [newItem, ...list];
            });

            // 2. Instantly update reactive unread count
            if (unreadCount === undefined || unreadCount === null) {
              this.updateUnreadCountLocally();
            }

            // 3. Trigger immediate in-app toast notification with deep-link click action
            const displayTitle = newItem.title ? `${newItem.title}: ` : '';
            this.toastSvc.show(
              `${displayTitle}${newItem.message}`,
              'info',
              6000,
              {
                deepLink: targetLink,
                actionText: targetLink ? 'View' : undefined,
                onClick: targetLink ? () => this.navigateToDeepLink(targetLink, data.metadata) : undefined
              }
            );

            // 4. Trigger native browser push notification if permitted
            this.showForegroundToast(newItem.title, newItem.message, data.metadata, targetLink);
          }

          // Authoritatively sync with backend in background
          this.sync().subscribe();
          break;
        }

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
