import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// RouterLink not needed directly here; template bindings work without import

@Component({
  selector: 'app-offerings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './offerings.component.html',
  styleUrl: './offerings.component.scss'
})
export class OfferingsComponent {}
