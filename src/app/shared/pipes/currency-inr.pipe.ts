// ============================================
// Currency INR Pipe
// Formats prices as ₹ values
// ============================================

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyInr',
  standalone: true,
})
export class CurrencyInrPipe implements PipeTransform {
  /**
   * Transform a price value to formatted INR string.
   *
   * @param value - string or number price (e.g. "36.00" or 36)
   * @param showDecimals - whether to show .00 (default: false)
   * @returns formatted string like "₹36" or "₹36.00"
   */
  transform(value: string | number | null | undefined, showDecimals = false): string {
    if (value == null || value === '') return '₹0';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '₹0';

    const absoluteNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (showDecimals) {
      return `${sign}₹${absoluteNum.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    // No decimals if whole number, else 2 decimals
    const isWhole = absoluteNum % 1 === 0;
    return `${sign}₹${absoluteNum.toLocaleString('en-IN', {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
