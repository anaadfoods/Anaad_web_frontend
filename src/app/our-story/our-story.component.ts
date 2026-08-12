import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-our-story',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './our-story.component.html',
  styleUrls: ['./our-story.component.scss']
})
export class OurStoryComponent implements OnInit, AfterViewInit {
  private fragment: string | null = null;
  private platformId = inject(PLATFORM_ID);

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.fragment.subscribe(fragment => {
      this.fragment = fragment;
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        if (this.fragment) {
          const element = document.getElementById(this.fragment);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    }
  }
}
