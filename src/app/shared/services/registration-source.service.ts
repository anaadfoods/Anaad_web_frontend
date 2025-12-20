import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type RedirectionSource = 'WAITLIST' | 'PDF_REQUEST' | 'RFP' | 'USER_QUERY';

const STORAGE_KEY = 'redirection_from';
const ARTICLE_ID_KEY = 'article_id';
const IS_RFP_KEY = 'is_from_rfp';

@Injectable({ providedIn: 'root' })
export class RegistrationSourceService {
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Set the redirection source in sessionStorage
   */
  setSource(source: RedirectionSource): void {
    if (this.isBrowser) {
      sessionStorage.setItem(STORAGE_KEY, source);
    }
  }

  /**
   * Get the redirection source from sessionStorage
   * Defaults to 'USER_QUERY' if not set
   */
  getSource(): RedirectionSource {
    if (!this.isBrowser) {
      return 'USER_QUERY';
    }
    const source = sessionStorage.getItem(STORAGE_KEY) as RedirectionSource;
    return source || 'USER_QUERY';
  }

  /**
   * Set the is_rfp flag
   * Case 2: true when user comes from contract farming page (RFP)
   * Case 3: false when user comes from footer inquiry
   */
  setIsRfp(isRfp: boolean): void {
    if (this.isBrowser) {
      sessionStorage.setItem(IS_RFP_KEY, isRfp.toString());
    }
  }

  /**
   * Get the is_rfp flag
   * Defaults to false if not set
   */
  getIsRfp(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const isRfp = sessionStorage.getItem(IS_RFP_KEY);
    return isRfp === 'true';
  }

  /**
   * Set the article ID when user comes from a blog/article page
   */
  setArticleId(articleId: number): void {
    if (this.isBrowser) {
      sessionStorage.setItem(ARTICLE_ID_KEY, articleId.toString());
    }
  }

  /**
   * Get the article ID if set
   */
  getArticleId(): number | null {
    if (!this.isBrowser) {
      return null;
    }
    const id = sessionStorage.getItem(ARTICLE_ID_KEY);
    return id ? parseInt(id, 10) : null;
  }

  /**
   * Clear article ID after use
   */
  clearArticleId(): void {
    if (this.isBrowser) {
      sessionStorage.removeItem(ARTICLE_ID_KEY);
    }
  }

  /**
   * Clear all registration source data
   */
  clearAll(): void {
    if (this.isBrowser) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(ARTICLE_ID_KEY);
      sessionStorage.removeItem(IS_RFP_KEY);
    }
  }
}
