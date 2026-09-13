// ============================================
// Web Analytics Service
// Unified tracking for GA4 & Sutra Customer 360
// ============================================

import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { StorageService, STORAGE_KEYS } from '../utils/storage.utils';
import { environment } from '../../../environments/environment';

export interface AnalyticsEnvelope {
  event_id: string;
  event_name: string;
  anonymous_id: string;
  user_id?: number | null;
  session_id: string;
  device_id: string;
  platform: 'web';
  application: 'anaad_web';
  environment: 'production' | 'development' | 'staging';
  timestamp: string;
  properties: Record<string, any>;
}

declare const gtag: Function | undefined;

@Injectable({ providedIn: 'root' })
export class WebAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private authenticatedUserId: number | null = null;
  private readonly sessionTimeoutMs = 30 * 60 * 1000; // 30 mins
  private eventQueue: AnalyticsEnvelope[] = [];
  private flushTimer: any = null;

  constructor() {
    if (this.isBrowser) {
      this.getOrCreateAnonymousId();
      this.getOrCreateSessionId();
      this.initGlobalClickTracker();
      this.initExitIntentBeacon();
    }
  }

  private initExitIntentBeacon(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;

    const handleExit = () => {
      if (this.eventQueue.length === 0) return;
      const batch = [...this.eventQueue];
      this.eventQueue = [];
      const sutraUrl = `${environment.sutraBaseUrl || 'http://localhost:8010'}/api/analytics/events/anonymous/`;
      const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(sutraUrl, blob);
      }
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleExit();
      }
    });
    window.addEventListener('pagehide', handleExit);
  }

  // ── Global Click Tracker ─────────────────────────────────

  private initGlobalClickTracker(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;

    // Expose test helper on window for debugging in browser console
    (window as any).__anaadAnalytics = this;
    (window as any).trackSutraTestClick = (name: string = 'test_component_click') => {
      this.recordSutraEvent('ui_click', {
        element_text: name,
        element_tag: 'button',
        element_role: 'button',
        screen_name: window.location.pathname,
        page_title: document.title,
        page_location: window.location.href,
      }, true);
    };

    window.addEventListener(
      'click',
      (event: MouseEvent) => {
        try {
          const target = event.target as HTMLElement | null;
          if (!target) return;

          // Find nearest interactive element, or fall back to the clicked target itself
          const interactive = target.closest(
            'button, a, input, select, textarea, [role="button"], .btn, .product-card, .card, [data-track-click], .nav-link, .category-chip, .tab-btn, .cart-btn, .fav-btn, .clickable'
          ) as HTMLElement | null;

          const el = interactive || target;
          const tagName = el.tagName ? el.tagName.toLowerCase() : 'element';
          const rawText = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
          const elementText = rawText.substring(0, 80);
          const ariaLabel = el.getAttribute ? (el.getAttribute('aria-label') || '') : '';
          const title = el.getAttribute ? (el.getAttribute('title') || '') : '';
          const alt = el.getAttribute ? (el.getAttribute('alt') || '') : '';
          const elementId = el.id || '';
          const elementClasses = el.classList ? Array.from(el.classList).slice(0, 4).join(' ') : '';
          const href = (el as HTMLAnchorElement).href || (el.getAttribute ? el.getAttribute('href') : '') || '';
          const componentRole = (el.getAttribute ? el.getAttribute('role') : '') || tagName;

          // Derive an informative component label
          const label = ariaLabel || title || alt || elementText || elementId || `<${tagName}>`;

          this.recordSutraEvent(
            'ui_click',
            {
              element_text: label,
              element_tag: tagName,
              element_id: elementId || undefined,
              element_role: componentRole,
              element_classes: elementClasses || undefined,
              href: href || undefined,
              screen_name: window.location.pathname,
              page_title: document.title,
              page_location: window.location.href,
            },
            true // Immediate flush for clicks
          );
        } catch (e) {
          console.warn('[Analytics] Click capture error:', e);
        }
      },
      { capture: true, passive: true }
    );
  }

  // ── Identity Lifecycle ───────────────────────────────────

  identify(userId: number): void {
    this.authenticatedUserId = userId;
    if (!this.isBrowser) return;

    try {
      if (typeof gtag === 'function') {
        gtag('set', 'user_properties', { user_id: userId });
        gtag('config', 'G-N7G1R59M48', { user_id: userId });
      }
    } catch {
      // Ignore analytics failures
    }

    this.sendIdentityAlias(userId);
  }

  private sendIdentityAlias(userId: number): void {
    if (!this.isBrowser) return;
    const anonId = this.getOrCreateAnonymousId();
    const sutraUrl = `${environment.sutraBaseUrl || 'http://localhost:8010'}/api/analytics/alias/`;

    if (typeof fetch !== 'undefined') {
      fetch(sutraUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymous_id: anonId,
          user_id: userId,
          platform: 'web',
          device_id: anonId,
        }),
        keepalive: true,
        mode: 'cors',
      }).catch((err) => {
        console.warn('[Analytics] Identity alias dispatch failed:', err);
      });
    }
  }

  clearIdentity(): void {
    this.authenticatedUserId = null;
    if (!this.isBrowser) return;

    try {
      if (typeof gtag === 'function') {
        gtag('set', 'user_properties', { user_id: null });
      }
    } catch {
      // Ignore
    }
  }

  // ── Event Tracking ───────────────────────────────────────

  trackPageView(pageTitle?: string, pageLocation?: string): void {
    const loc = pageLocation || (this.isBrowser ? window.location.href : '');
    const title = pageTitle || (this.isBrowser ? document.title : '');

    // 1. GA4
    if (this.isBrowser && typeof gtag === 'function') {
      try {
        gtag('event', 'page_view', {
          page_title: title,
          page_location: loc,
        });
      } catch {
        // Ignore
      }
    }

    // 2. Sutra Universal Contract (Flush immediately on page navigation)
    this.recordSutraEvent(
      'screen_view',
      {
        screen_name: title || loc,
        page_title: title,
        page_location: loc,
      },
      true
    );
  }

  trackEvent(eventName: string, properties: Record<string, any> = {}, immediate: boolean = false): void {
    // 1. GA4
    if (this.isBrowser && typeof gtag === 'function') {
      try {
        gtag('event', eventName, properties);
      } catch {
        // Ignore
      }
    }

    // 2. Sutra Universal Contract
    this.recordSutraEvent(eventName, properties, immediate);
  }

  track(eventName: string, properties: Record<string, any> = {}, immediate: boolean = false): void {
    this.trackEvent(eventName, properties, immediate);
  }

  trackCartAbandoned(cartData: { cart_id: string; total_amount: number; items_count: number }): void {
    const sutraUrl = `${environment.sutraBaseUrl || 'http://localhost:8010'}/api/analytics/events/anonymous/`;
    const envelope: AnalyticsEnvelope = {
      event_id: this.generateUuid(),
      event_name: 'cart_abandoned',
      anonymous_id: this.getOrCreateAnonymousId(),
      user_id: this.authenticatedUserId,
      session_id: this.getOrCreateSessionId(),
      device_id: this.getOrCreateAnonymousId(),
      platform: 'web',
      application: 'anaad_web',
      environment: environment.production ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      properties: cartData || {},
    };

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify([envelope])], { type: 'application/json' });
      navigator.sendBeacon(sutraUrl, blob);
    } else {
      this.trackEvent('cart_abandoned', cartData, true);
    }
  }

  // ── Sutra Ingestion ──────────────────────────────────────

  recordSutraEvent(eventName: string, properties: Record<string, any>, immediate: boolean = false): void {
    if (!this.isBrowser) return;

    if (!environment.production) {
      console.log(`[Analytics] Tracked: ${eventName}`, properties);
    }

    const envelope: AnalyticsEnvelope = {
      event_id: this.generateUuid(),
      event_name: eventName,
      anonymous_id: this.getOrCreateAnonymousId(),
      user_id: this.authenticatedUserId,
      session_id: this.getOrCreateSessionId(),
      device_id: this.getOrCreateAnonymousId(),
      platform: 'web',
      application: 'anaad_web',
      environment: environment.production ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      properties: properties || {},
    };

    this.eventQueue.push(envelope);

    if (immediate) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      // Small 80ms debounce so rapid events batch cleanly into 1 request
      this.flushTimer = setTimeout(() => this.flushQueue(), 80);
    } else if (this.eventQueue.length >= 5) {
      this.flushQueue();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushQueue(), 1500);
    }
  }

  flushQueue(): void {
    if (!this.isBrowser || this.eventQueue.length === 0) return;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    const sutraUrl = `${environment.sutraBaseUrl || 'http://localhost:8010'}/api/analytics/events/anonymous/`;

    console.log(`[Analytics] Flushing ${batch.length} event(s) to ${sutraUrl}`, batch.map(b => b.event_name));

    // Direct fetch with keepalive ensures delivery across page unloads and bypasses any Angular interceptor issues
    if (typeof fetch !== 'undefined') {
      fetch(sutraUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
        keepalive: true,
        mode: 'cors',
      })
        .then((response) => {
          if (!response.ok) {
            console.warn(`[Analytics] Ingestion warning: HTTP ${response.status}`);
          } else {
            console.log(`[Analytics] Successfully sent ${batch.length} event(s) to Sutra`);
          }
        })
        .catch((err) => {
          console.warn('[Analytics] Direct fetch failed, attempting HttpClient fallback:', err);
          this.http.post(sutraUrl, batch).subscribe({
            next: () => console.log('[Analytics] Fallback sent successfully'),
            error: (e) => console.error('[Analytics] Fallback also failed:', e),
          });
        });
    } else {
      this.http.post(sutraUrl, batch).subscribe({
        next: (res: any) => console.log(`[Analytics] Flushed ${batch.length} event(s) via HttpClient`, res),
        error: (err) => console.error('[Analytics] Failed to flush events to Sutra:', err),
      });
    }
  }

  // ── Anonymous ID & Session Management ─────────────────────

  private isValidUuid(val: any): boolean {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
  }

  getOrCreateAnonymousId(): string {
    if (!this.isBrowser) return '';

    let anonId = this.storage.getItem(STORAGE_KEYS.ANONYMOUS_ID);
    if (!anonId || !this.isValidUuid(anonId)) {
      anonId = this.generateUuid();
      this.storage.setItem(STORAGE_KEYS.ANONYMOUS_ID, anonId);
    }
    return anonId;
  }

  getOrCreateSessionId(): string {
    if (!this.isBrowser) return '';

    const now = Date.now();
    const lastActiveStr = this.storage.sessionGet(STORAGE_KEYS.SESSION_LAST_ACTIVE);
    const existingSession = this.storage.sessionGet(STORAGE_KEYS.SESSION_ID);

    if (existingSession && this.isValidUuid(existingSession) && lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (now - lastActive < this.sessionTimeoutMs) {
        this.storage.sessionSet(STORAGE_KEYS.SESSION_LAST_ACTIVE, now.toString());
        return existingSession;
      }
    }

    const newSession = this.generateUuid();
    this.storage.sessionSet(STORAGE_KEYS.SESSION_ID, newSession);
    this.storage.sessionSet(STORAGE_KEYS.SESSION_LAST_ACTIVE, now.toString());
    return newSession;
  }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
