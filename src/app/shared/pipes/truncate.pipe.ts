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
   * @param limit - max characters or words (default 100)
   * @param ellipsis - trailing string (default '...')
   * @param mode - 'chars' or 'words' (default 'chars')
   */
  transform(value: string | null | undefined, limit = 100, ellipsis = '...', mode: 'chars' | 'words' = 'chars'): string {
    if (!value) return '';
    
    if (mode === 'words') {
      const words = value.split(/\s+/);
      if (words.length <= limit) return value;
      return words.slice(0, limit).join(' ') + ellipsis;
    }

    if (value.length <= limit) return value;
    return value.substring(0, limit).trimEnd() + ellipsis;
  }
}
