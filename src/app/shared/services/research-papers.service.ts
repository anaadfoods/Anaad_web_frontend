import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResearchPaper {
  id: number;
  title: string;           // Study title
  subtitle: string;        // Source
  description: string;     // HTML content with <strong> for findings, <p> for paragraphs
  publication_date: string;
  pdf_file: string | null;
  external_link: string | null;
}

@Injectable({ providedIn: 'root' })
export class ResearchPapersService {
  private http = inject(HttpClient);
  private endpoint = '/api/research-papers/';

  getPapers(): Observable<ResearchPaper[]> {
    return this.http.get<ResearchPaper[]>(this.endpoint);
  }
}
