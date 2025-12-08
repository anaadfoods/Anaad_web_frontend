import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { BlogsService, Article } from '../shared/services/blogs.service';
import { RegistrationSourceService } from '../shared/services/registration-source.service';

@Component({
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
  private registrationSourceService = inject(RegistrationSourceService);

  article: Article | null = null;
  loading = true;
  error = false;
  notFound = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
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

  /**
   * Navigate to registration form with PDF_REQUEST source and article ID
   * Backend will send PDF via email/WhatsApp after form submission
   */
  requestPdf(): void {
    if (this.article) {
      this.registrationSourceService.setSource('PDF_REQUEST');
      this.registrationSourceService.setArticleId(this.article.id);
      this.router.navigate(['/register']);
    }
  }
}
