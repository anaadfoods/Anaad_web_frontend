import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';

export interface ResearchPaper {
  id: number;
  title: string;           // Study title
  subtitle: string;        // Source / Publisher info
  description: string;     // HTML content with <strong> for findings, <p> for paragraphs
  publication_date: string;
  external_link: string | null;
}

@Injectable({ providedIn: 'root' })
export class ResearchPapersService {
  private http = inject(HttpClient);

  getPapers(): Observable<ResearchPaper[]> {
    return this.http.get<ResearchPaper[]>(API.RESEARCH_PAPERS.LIST);
  }
}
