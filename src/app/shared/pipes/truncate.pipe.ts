// ============================================
// Truncate Pipe
// Truncates text with ellipsis
// ============================================

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  /**
   * Truncate text to a maximum length.
   *
   * @param value - input string
   * @param limit - max characters (default 100)
   * @param ellipsis - trailing string (default '...')
   */
  transform(value: string | null | undefined, limit = 100, ellipsis = '...'): string {
    if (!value) return '';
    if (value.length <= limit) return value;
    return value.substring(0, limit).trimEnd() + ellipsis;
  }
}
