import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogsService, Article } from '../shared/services/blogs.service';
import { SkeletonLoaderComponent } from '../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonLoaderComponent],
  templateUrl: './blogs.component.html',
  styleUrls: ['./blogs.component.scss']
})
export class BlogsComponent implements OnInit {
  private blogsService = inject(BlogsService);

  articles: Article[] = [];
  loading = true;
  error = false;

  featuredArticles: Article[] = [];
  featuredLoading = true;
  featuredError = false;

  activeCategory = 'All Posts';
  categories = ['All Posts', 'Food Safety', 'Farming', 'Nutrition', 'Economy', 'Culture'];

  ngOnInit(): void {
    this.blogsService.getArticles().subscribe({
      next: (data) => {
        this.articles = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch articles:', err);
        this.error = true;
        this.loading = false;
      }
    });

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
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  get filteredArticles(): Article[] {
    if (this.activeCategory === 'All Posts') return this.articles;
    // Assuming category field might not strictly match the design's tags, filtering gracefully
    return this.articles.filter(a => (a.category || '').toLowerCase() === this.activeCategory.toLowerCase() || (a.tags || []).includes(this.activeCategory));
  }
}
