import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { BlogsService, Article } from '../core/services/blogs.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss']
})
export class BlogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogsService = inject(BlogsService);

  article: Article | null = null;
  loading = true;
  error = false;
  notFound = false;
  isStatic = false;

  relatedArticles: Article[] = [];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === 'static') {
      this.isStatic = true;
      this.loading = false;
    } else if (idParam) {
      const articleId = parseInt(idParam, 10);
      if (!isNaN(articleId)) {
        this.fetchArticle(articleId);
      } else {
        this.notFound = true;
        this.loading = false;
      }
    } else {
      this.notFound = true;
      this.loading = false;
    }

    this.blogsService.getArticles().subscribe(data => {
      this.relatedArticles = data.slice(0, 3);
    });
  }

  private fetchArticle(id: number): void {
    this.blogsService.getArticleById(id).subscribe({
      next: (data) => {
        this.article = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch article:', err);
        if (err.status === 404) {
          this.notFound = true;
        } else {
          this.error = true;
        }
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/blogs']);
  }
}
