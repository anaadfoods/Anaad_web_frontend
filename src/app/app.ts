import { Component, OnInit, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthState } from './core/state/auth.state';
import { CartApiService } from './core/services/cart-api.service';
import { FavoritesService } from './core/services/favorites.service';
import { CartState } from './core/state/cart.state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Anaad-Foods');
  private readonly authState = inject(AuthState);
  private readonly cartSvc = inject(CartApiService);
  private readonly cartState = inject(CartState);
  private readonly favSvc = inject(FavoritesService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId) && this.authState.isAuthenticated()) {
      this.cartSvc.syncOnLogin();
      this.favSvc.syncOnLogin();
    }
  }
}
