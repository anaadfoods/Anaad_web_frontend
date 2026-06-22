import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of, Observable } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { BlogsService, Article } from '../core/services/blogs.service';
import { RegistrationSourceService } from '../core/services/registration-source.service';
import { environment } from '../../environments/environment';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss']
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogsService = inject(BlogsService);
  private registrationSourceService = inject(RegistrationSourceService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  article: Article | null = null;
  loading = true;
  error = false;
  notFound = false;
  isStatic = false;

  relatedArticles: Article[] = [];
  tocItems: TocItem[] = [];

  // Share signals
  showShareModal = signal(false);
  shareUrl = signal('');
  linkCopied = signal(false);

  private currentArticleId: number | null = null;

  ngOnInit(): void {
    // Subscribe to paramMap so navigation between blog detail pages triggers a reload
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const idParam = params.get('id');

        // Reset state for each navigation
        this.article = null;
        this.loading = true;
        this.error = false;
        this.notFound = false;
        this.isStatic = false;
        this.tocItems = [];
        this.currentArticleId = null;

        // Scroll to top on navigation
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (idParam === 'static') {
          this.isStatic = true;
          this.loading = false;
          this.tocItems = [
            { id: 'static-1', text: 'The Letter That Was Never Sent', level: 2 },
            { id: 'static-2', text: 'What "More" Cost Us', level: 2 },
            { id: 'static-3', text: 'The Soil Cannot Resign', level: 3 },
            { id: 'static-4', text: 'ICBN as a Counter-Resignation', level: 2 },
            { id: 'static-5', text: 'What You Can Do', level: 2 }
          ];
          this.cdr.markForCheck();
        } else if (idParam) {
          const articleId = parseInt(idParam, 10);
          if (!isNaN(articleId)) {
            this.currentArticleId = articleId;
            this.fetchArticle(articleId);
          } else {
            this.notFound = true;
            this.loading = false;
            this.cdr.markForCheck();
          }
        } else {
          this.notFound = true;
          this.loading = false;
          this.cdr.markForCheck();
        }

        this.loadRelatedArticles();
      });
  }

  private loadRelatedArticles(): void {
    this.blogsService.getArticles()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((data: any) => {
          const arr: Article[] = Array.isArray(data) ? data : (data.results || []);
          const filtered = arr.filter(a => a.id !== this.currentArticleId).slice(0, 3);
          if (filtered.length === 0) return of([]);
          const detailRequests = filtered.map(art => 
            this.blogsService.getArticleById(art.id).pipe(
              catchError(err => {
                console.error(`Failed to fetch detail for related article ${art.id}`, err);
                return of(art);
              })
            )
          );
          return forkJoin(detailRequests) as Observable<Article[]>;
        })
      )
      .subscribe((fullRelated: Article[]) => {
        this.relatedArticles = fullRelated;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchArticle(id: number): void {
    this.blogsService.getArticleById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data && data.content) {
            data.content = this.generateTocAndInjectIds(data.content);
          }
          this.article = data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to fetch article:', err);
          if (err.status === 404) {
            this.notFound = true;
          } else {
            this.error = true;
          }
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  generateTocAndInjectIds(content: string): string {
    this.tocItems = [];
    if (!content) return '';
    
    let index = 0;
    return content.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, text) => {
      const id = `heading-${index++}`;
      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      this.tocItems.push({
        id,
        text: cleanText,
        level: tag.toLowerCase() === 'h2' ? 2 : 3
      });
      
      if (/id=/i.test(attrs)) {
        return match;
      }
      return `<${tag} id="${id}"${attrs}>${text}</${tag}>`;
    });
  }

  scrollToSection(id: string): void {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  /**
   * Parses date format "DD-MM-YYYY HH:mm" or ISO format into a Date object
   */
  parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const regex = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/;
    const match = dateStr.match(regex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed month
      const year = parseInt(match[3], 10);
      const hour = parseInt(match[4], 10);
      const minute = parseInt(match[5], 10);
      return new Date(year, month, day, hour, minute);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Normalizes category from API (e.g. "BLOG" -> "Article")
   */
  displayCategory(category: string | null | undefined): string {
    if (!category) return 'Article';
    const cat = category.toUpperCase();
    if (cat === 'BLOG') return 'Article';
    if (cat === 'FEATURED') return 'Featured';
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }

  getReadTime(article: Article): string {
    if (article.read_time) return article.read_time;
    const textToCount = (article as any).content || article.subtitle || article.title || '';
    if (!textToCount) return '5 min read';
    
    const cleanText = textToCount.replace(/<[^>]*>/g, ' ');
    const wordCount = cleanText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    
    const minutes = 5 + Math.floor(wordCount / 200);
    return `${minutes} min read`;
  }

  getImageUrl(url: string | null | undefined, fallback: string): string {
    if (!url) return fallback;
    if (url.startsWith('http')) return url;
    return `${environment.apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  shareWhatsApp(): void {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `${this.article?.title || 'Check out this article'}: ${url}`;
    if (typeof window !== 'undefined') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  }

  shareInstagram(): void {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    this.shareUrl.set(url);
    this.linkCopied.set(false);
    this.showShareModal.set(true);
  }

  copyLink(): void {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    this.shareUrl.set(url);
    this.linkCopied.set(false);
    this.showShareModal.set(true);
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
  }

  copyShareLink(inputEl: HTMLInputElement): void {
    inputEl.select();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.shareUrl()).then(() => {
        this.linkCopied.set(true);
        this.cdr.markForCheck();
      }).catch(err => {
        console.error('Failed to copy link:', err);
      });
    }
  }

  requestPdf(): void {
    this.registrationSourceService.setSource('PDF_REQUEST');
    if (this.currentArticleId) {
      this.registrationSourceService.setArticleId(this.currentArticleId);
    }
    this.router.navigate(['/help'], { queryParams: { is_redirection_from: 'PDF Request' } });
  }

  goBack(): void {
    this.router.navigate(['/blogs']);
  }
}

