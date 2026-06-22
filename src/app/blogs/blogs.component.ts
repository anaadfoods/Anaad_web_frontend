import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of, Observable } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { BlogsService, Article } from '../core/services/blogs.service';
import { environment } from '../../environments/environment';
import { SkeletonLoaderComponent } from '../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-blogs',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SkeletonLoaderComponent],
  templateUrl: './blogs.component.html',
  styleUrls: ['./blogs.component.scss']
})
export class BlogsComponent implements OnInit, OnDestroy {
  private blogsService = inject(BlogsService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  articles: Article[] = [];
  loading = true;
  error = false;

  featuredArticles: Article[] = [];
  featuredLoading = true;
  featuredError = false;

  activeCategory = 'All Posts';
  categories = ['All Posts', 'Food Safety', 'Farming', 'Nutrition', 'Economy', 'Culture'];

  // Newsletter bindings & state
  newsletterEmail = '';
  newsletterState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  newsletterErrorMsg = '';

  ngOnInit(): void {
    this.blogsService.getArticles()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((data: any) => {
          const list = Array.isArray(data) ? data : (data.results || []);
          if (list.length === 0) return of([]);
          const detailRequests = list.map((art: any) => 
            this.blogsService.getArticleById(art.id).pipe(
              catchError(err => {
                console.error(`Failed to fetch detail for article ${art.id}`, err);
                return of(art);
              })
            )
          );
          return forkJoin(detailRequests) as Observable<Article[]>;
        })
      )
      .subscribe({
        next: (fullArticles: Article[]) => {
          this.articles = fullArticles;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to fetch articles:', err);
          this.error = true;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });

    this.blogsService.getFeaturedArticles()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((data: any) => {
          const list = Array.isArray(data) ? data : (data.results || []);
          if (list.length === 0) return of([]);
          const detailRequests = list.map((art: any) => 
            this.blogsService.getArticleById(art.id).pipe(
              catchError(err => {
                console.error(`Failed to fetch detail for featured article ${art.id}`, err);
                return of(art);
              })
            )
          );
          return forkJoin(detailRequests) as Observable<Article[]>;
        })
      )
      .subscribe({
        next: (fullFeatured: Article[]) => {
          this.featuredArticles = fullFeatured;
          this.featuredLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to fetch featured articles:', err);
          this.featuredError = true;
          this.featuredLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
    this.cdr.markForCheck();
  }

  get filteredArticles(): Article[] {
    if (this.activeCategory === 'All Posts') return this.articles;
    return this.articles.filter(a => {
      const catNorm = this.displayCategory(a.category).toLowerCase();
      const activeNorm = this.activeCategory.toLowerCase();
      const tagsMatch = (a.tags || []).some(t => t.toLowerCase() === activeNorm);
      return catNorm === activeNorm || tagsMatch;
    });
  }

  /**
   * Normalizes category from API (e.g. "BLOG" -> "Article")
   */
  displayCategory(category: string | null | undefined): string {
    if (!category) return 'Article';
    const cat = category.toUpperCase();
    if (cat === 'BLOG') return 'Article';
    if (cat === 'FEATURED') return 'Featured';
    // Title case fallback
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }

  /**
   * Parses date format "DD-MM-YYYY HH:mm" or ISO format into a Date object
   */
  parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    // Check if format is DD-MM-YYYY HH:mm
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
    // Fallback to standard JS parsing (supports ISO format)
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  getReadTime(article: Article): string {
    if (article.read_time) return article.read_time;
    const textToCount = (article as any).content || article.subtitle || article.title || '';
    if (!textToCount) return '5 min read';
    
    // Strip HTML tags before counting words
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

  onNewsletterSubmit(): void {
    this.newsletterErrorMsg = '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.newsletterEmail || !emailRegex.test(this.newsletterEmail)) {
      this.newsletterState = 'error';
      this.newsletterErrorMsg = 'Please enter a valid email address.';
      this.cdr.markForCheck();
      return;
    }

    this.newsletterState = 'loading';
    this.cdr.markForCheck();

    // Simulate API request
    setTimeout(() => {
      this.newsletterState = 'success';
      this.cdr.markForCheck();
    }, 1200);
  }

  resetNewsletter(): void {
    this.newsletterEmail = '';
    this.newsletterState = 'idle';
    this.newsletterErrorMsg = '';
    this.cdr.markForCheck();
  }
}
