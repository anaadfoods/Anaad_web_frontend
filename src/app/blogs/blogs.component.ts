import { Component, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective],
  templateUrl: './blogs.component.html',
  styleUrls: ['./blogs.component.scss']
})
export class BlogsComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Parallax effect for hero floating elements
      this.mouseMoveHandler = (e: MouseEvent) => {
        const floaters = document.querySelectorAll('.floating-shape');
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        floaters.forEach((el, i) => {
          const speed = (i + 1) * 0.5;
          (el as HTMLElement).style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
      };
      document.addEventListener('mousemove', this.mouseMoveHandler);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
  }
}
