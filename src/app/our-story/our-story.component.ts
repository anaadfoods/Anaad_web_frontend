import { Component, OnInit, AfterViewInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-our-story',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './our-story.component.html',
  styleUrls: ['./our-story.component.scss']
})
export class OurStoryComponent implements OnInit, AfterViewInit {
  private fragment: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.fragment.subscribe(fragment => {
      this.fragment = fragment;
    });
  }

  ngAfterViewInit(): void {
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
