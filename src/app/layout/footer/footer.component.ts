import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  year = new Date().getFullYear();
  constructor(private router: Router) {}

  goToRegister(event?: Event) {
    // Ensure navigation even if directive isn't bound for some reason
    if (event) event.preventDefault();
    this.router.navigateByUrl('/register');
  }
}
