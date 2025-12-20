import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RegistrationSourceService } from '../shared/services/registration-source.service';

@Component({
  selector: 'app-offerings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offerings.component.html',
  styleUrl: './offerings.component.scss'
})
export class OfferingsComponent {
  private router = inject(Router);
  private registrationSourceService = inject(RegistrationSourceService);

  /**
   * Case 2: Navigate to registration form from contract farming/RFP page
   * Sets redirection_from = 'RFP' and is_rfp = true
   */
  goToRegister(event?: Event): void {
    if (event) event.preventDefault();
    this.registrationSourceService.setSource('RFP');
    this.registrationSourceService.setIsRfp(true);
    this.router.navigate(['/register']);
  }
}
