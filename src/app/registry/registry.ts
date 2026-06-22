import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AuthState } from '../core/state/auth.state';
import { SubscriptionPlansComponent } from '../shared/components/subscription-plans/subscription-plans.component';

export interface CropReport {
  title: string;
  photos: string[];
}

export interface CropItem {
  crop_id: string;
  crop_name: string;
  harvest_date: string | null;
  reports: CropReport[];
}

export interface CropListResponse {
  success: boolean;
  count: number;
  data: CropItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-registry',
  standalone: true,
  imports: [CommonModule, SubscriptionPlansComponent],
  templateUrl: './registry.html',
  styleUrls: ['./registry.scss'],
})
export class Registry implements OnInit {
  readonly authState = inject(AuthState);
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);
  private http = inject(HttpClient);

  // Signals
  crops = signal<CropItem[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  filter = signal<string>('All');

  // Computed filtered list
  filteredCrops = computed(() => {
    const list = this.crops();
    const currentFilter = this.filter();
    if (currentFilter === 'All') return list;
    
    if (currentFilter === 'Pulses') {
      return list.filter(c => 
        c.crop_name.toLowerCase().includes('sesame') || 
        c.crop_name.toLowerCase().includes('pulse') || 
        c.crop_name.toLowerCase().includes('mustard')
      );
    }
    return list.filter(c => c.crop_name.toLowerCase().includes(currentFilter.toLowerCase()));
  });

  ngOnInit() {
    this.titleSvc.setTitle('The Batch Ledger — Trace Your Food from Field to Shelf | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Open-access batch ledger for every product we offer. Access field details, handling steps, and downloadable records for transparent tracing.'
    });
    this.loadCrops();
  }

  loadCrops() {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.http.get<CropListResponse>('https://nwmimvqcoxxdulpmdqvp.supabase.co/functions/v1/crop-list')
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            this.crops.set(response.data);
          } else {
            this.error.set('Failed to retrieve crops registry.');
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error fetching crops registry:', err);
          this.error.set('Failed to connect to the farm registry server.');
          this.isLoading.set(false);
        }
      });
  }

  setFilter(f: string) {
    this.filter.set(f);
  }

  // Data mapping helpers
  getHarvestDate(crop: CropItem): string {
    if (!crop.harvest_date) return 'Growing';
    try {
      return this.formatDate(new Date(crop.harvest_date));
    } catch {
      return crop.harvest_date;
    }
  }

  getProcessingDate(crop: CropItem): string {
    if (!crop.harvest_date) return 'Pending';
    try {
      const d = new Date(crop.harvest_date);
      d.setDate(d.getDate() + 3);
      return this.formatDate(d);
    } catch {
      return 'Pending';
    }
  }

  getLocation(crop: CropItem): string {
    const name = crop.crop_name.toLowerCase();
    if (name.includes('rice')) {
      return 'Sonipat Farm, Plot 2';
    } else if (name.includes('wheat')) {
      return 'Sonipat Farm, Plot 5';
    } else if (name.includes('mango')) {
      return 'Ratnagiri Orchard';
    } else if (name.includes('mustard')) {
      return 'Partner Farm, MP';
    } else if (name.includes('sugarcane')) {
      return 'Sonipat Farm, Plot 1';
    }
    return 'Sonipat Farm, Plot 3';
  }

  getPackaging(crop: CropItem): string {
    const name = crop.crop_name.toLowerCase();
    if (name.includes('flour') || name.includes('wheat')) {
      return 'Vacuum Pouch';
    } else if (name.includes('rice')) {
      return 'Cotton Bag';
    } else if (name.includes('juice')) {
      return 'Glass Bottle';
    } else if (name.includes('mango')) {
      return 'Corrugated Box';
    }
    return 'Eco-friendly Bag';
  }

  getStatus(crop: CropItem): string {
    if (this.hasPhotos(crop)) {
      return 'Verified';
    }
    return crop.harvest_date ? 'Available' : 'In Progress';
  }

  hasPhotos(crop: CropItem): boolean {
    return !!(crop.reports && crop.reports.length > 0 && crop.reports[0].photos && crop.reports[0].photos.length > 0);
  }

  getFilename(url: string, defaultFilename: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        return decodeURIComponent(lastPart);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
    return defaultFilename;
  }

  downloadFile(url: string, defaultFilename: string) {
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (response) => {
        let filename = '';
        
        // 1. Try to get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(contentDisposition);
          if (matches != null && matches[1]) { 
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        // 2. If not found in Content-Disposition, try to extract from URL path
        if (!filename) {
          try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart.includes('.')) {
              filename = decodeURIComponent(lastPart);
            }
          } catch (e) {
            // Ignore URL parsing errors
          }
        }
        
        // 3. Fallback to defaultFilename
        if (!filename) {
          filename = defaultFilename;
        }

        const blob = response.body;
        if (blob) {
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        }
      },
      error: (err) => {
        console.warn('Direct blob download failed, falling back to window.open due to CORS:', err);
        window.open(url, '_blank');
      }
    });
  }

  private formatDate(date: Date): string {
    if (isNaN(date.getTime())) return '-';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}
