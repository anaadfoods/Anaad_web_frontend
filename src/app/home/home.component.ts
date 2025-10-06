import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { PlansCarouselComponent } from '../shared/plans-carousel/plans-carousel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective, PlansCarouselComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {}
