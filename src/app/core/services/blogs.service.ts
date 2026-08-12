import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../constants/api-endpoints';

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
  pdf_file?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BlogsService {
  private http = inject(HttpClient);
  private blogEndpoint = `${API.BLOGS.LIST}?category=BLOG`;
  private featuredEndpoint = `${API.BLOGS.LIST}?category=FEATURED`;

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

  getArticleById(id: number): Observable<Article> {
    return this.http.get<Article>(`${API.BLOGS.DETAIL}${id}/`);
  }

  getTags(): Observable<string[]> {
    return this.http.get<string[]>(API.BLOGS.TAGS);
  }
}
