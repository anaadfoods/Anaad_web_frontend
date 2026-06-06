// ============================================
// SSR-Safe Platform Utilities
// Helpers for safely accessing browser globals
// ============================================

import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Functional helper — call inside injection context
 * (constructor, field initializer, or runInInjectionContext).
 */
export function isBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}

/**
 * Returns `window` if in browser, else `undefined`.
 * Guard usage: `const win = safeWindow(); if (win) { ... }`
 */
export function safeWindow(): Window | undefined {
  return typeof window !== 'undefined' ? window : undefined;
}

/**
 * Returns `document` if in browser, else `undefined`.
 */
export function safeDocument(): Document | undefined {
  return typeof document !== 'undefined' ? document : undefined;
}

/**
 * Safely read a CSS custom property value.
 */
export function getCSSVariable(name: string): string {
  const doc = safeDocument();
  if (!doc) return '';
  return getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
}

/**
 * Debounce helper for scroll/resize handlers.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
