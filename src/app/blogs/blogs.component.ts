import { Component, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { BlogsService, Article } from '../shared/services/blogs.service';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective],
  templateUrl: './blogs.component.html',
  styleUrls: ['./blogs.component.scss']
})
export class BlogsComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private blogsService = inject(BlogsService);
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

  // Article data
  articles: Article[] = [];
  displayArticles: Article[] = []; // Duplicated array for infinite scroll (min 15 items)
  loading = true;
  error = false;

  // Featured articles (top 3 by ID: 1, 2, 3)
  featuredArticles: Article[] = [];
  featuredLoading = true;
  featuredError = false;

  ngOnInit(): void {
    // Fetch articles from API
    this.blogsService.getArticles().subscribe({
      next: (data) => {
        this.articles = data;
        // Duplicate articles to ensure at least 15 items for smooth infinite scroll
        this.displayArticles = this.duplicateArticles(data, 15);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch articles:', err);
        this.error = true;
        this.loading = false;
      }
    });

    // Fetch featured articles (any category=FEATURED articles)
    this.blogsService.getFeaturedArticles().subscribe({
      next: (data) => {
        this.featuredArticles = data;
        this.featuredLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch featured articles:', err);
        this.featuredError = true;
        this.featuredLoading = false;
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      // Parallax effect for hero floating elements
      this.mouseMoveHandler = (e: MouseEvent) => {
        const floaters = document.querySelectorAll('.floating-shape');
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        floaters.forEach((el, i) => {
          const speed = (i + 1) * 0.5;
          (el as HTMLElement).style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
      };
      document.addEventListener('mousemove', this.mouseMoveHandler);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
  }

  /**
   * Duplicate articles array to reach minimum count for smooth infinite scroll animation.
   * The CSS animation scrolls 50%, so we need at least 2x the articles to loop seamlessly.
   */
  private duplicateArticles(articles: Article[], minCount: number): Article[] {
    if (articles.length === 0) return [];
    
    const result: Article[] = [];
    // We need to duplicate enough times to have at least minCount * 2 for the infinite scroll
    const targetCount = Math.max(minCount * 2, 30);
    
    while (result.length < targetCount) {
      result.push(...articles);
    }
    
    return result;
  }
}
