import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResearchPapersService, ResearchPaper } from '../core/services/research-papers.service';
import { SkeletonLoaderComponent } from '../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-evidence-archive',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonLoaderComponent],
  templateUrl: './evidence-archive.component.html',
  styleUrls: ['./evidence-archive.component.scss']
})
export class EvidenceArchiveComponent implements OnInit {
  private papersService = inject(ResearchPapersService);

  papers: ResearchPaper[] = [];
  selectedPaperId: number | null = null;
  loading = true;
  error = '';

  ngOnInit(): void {
    this.papersService.getPapers().subscribe({
      next: (data) => {
        // Sort papers by ID in ascending order (ID 1 first, ID 2 second, etc.)
        this.papers = data.sort((a, b) => a.id - b.id);
        // Select first paper by default
        if (this.papers.length > 0) {
          this.selectedPaperId = this.papers[0].id;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load research papers:', err);
        this.error = 'Failed to load research papers.';
        this.loading = false;
      }
    });
  }

  selectPaper(id: number): void {
    // Toggle: if already selected, collapse; otherwise expand
    this.selectedPaperId = this.selectedPaperId === id ? null : id;
  }

  isSelected(id: number): boolean {
    return this.selectedPaperId === id;
  }

  openExternalLink(event: Event, url: string | null): void {
    event.stopPropagation();
    if (url) {
      window.open(url, '_blank');
    }
  }

  downloadPdf(event: Event, url: string | null): void {
    event.stopPropagation();
    if (url) {
      window.open(url, '_blank');
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}
