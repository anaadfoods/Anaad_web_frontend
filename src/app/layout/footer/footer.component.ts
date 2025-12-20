import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RegistrationSourceService } from '../../shared/services/registration-source.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  year = new Date().getFullYear();

  private router = inject(Router);
  private registrationSourceService = inject(RegistrationSourceService);

  /**
   * Case 3: Navigate to registration form from footer inquiry
   * Sets redirection_from = 'USER_QUERY' and is_rfp = false
   */
  goToRegister(event?: Event): void {
    if (event) event.preventDefault();
    this.registrationSourceService.setSource('USER_QUERY');
    this.registrationSourceService.setIsRfp(false);
    this.router.navigate(['/register']);
  }
}
