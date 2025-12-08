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
  private endpoint = '/api/blogs/';
  private featuredEndpoint = '/api/blog/articles/?category=BLOG';

  /**
   * Fetch all blog articles
   */
  getArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(this.endpoint);
  }

  /**
   * Fetch featured blog articles (category=BLOG)
   */
  getFeaturedArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(this.featuredEndpoint);
  }

  /**
   * Fetch a single blog article by ID
   */
  getArticleById(id: number): Observable<Article> {
    return this.http.get<Article>(`${this.endpoint}${id}`);
  }
}
