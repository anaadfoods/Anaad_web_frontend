import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Article {
  id: number;
  title: string;
  subtitle: string;
  tags: string[];
  author: string;
  read_time: string;
  content: string;
  category: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class BlogsService {
  private http = inject(HttpClient);
  private blogEndpoint = '/api/blog/articles/?category=BLOG';
  private featuredEndpoint = '/api/blog/articles/?category=FEATURED';

  /**
   * Fetch all blog articles (category=BLOG)
   */
  getArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(this.blogEndpoint);
  }

  /**
   * Fetch featured blog articles (category=FEATURED)
   */
  getFeaturedArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(this.featuredEndpoint);
  }

  /**
   * Fetch a single blog article by ID
   */
  getArticleById(id: number): Observable<Article> {
    return this.http.get<Article>(`/api/blog/articles/${id}/`);
  }
}
