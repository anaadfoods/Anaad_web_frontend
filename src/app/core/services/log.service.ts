// ============================================
// LogService — Production-safe logging
// Gates all console output behind environment.production flag.
// In production: debug() is suppressed, warn() and error() still emit.
// ============================================

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  /** Debug-level output — suppressed in production. */
  debug(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.log(message, ...args);
    }
  }

  /** Warning-level output — always emits. */
  warn(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.warn(message, ...args);
    }
  }

  /** Error-level output — always emits (for future error-tracking integration). */
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }
}
