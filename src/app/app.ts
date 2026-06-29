import { Component, OnInit, inject, PLATFORM_ID, signal, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthState } from './core/state/auth.state';
import { AuthService } from './core/services/auth.service';
import { CartApiService } from './core/services/cart-api.service';
import { FavoritesService } from './core/services/favorites.service';
import { CartState } from './core/state/cart.state';
import { isDevBypassSession } from './core/utils/dev-auth.util';
import { environment } from '../environments/environment';
import { AaharVigyanStateService } from './aahar-vigyan/services/aahar-vigyan-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Anaad-Foods');
  protected readonly immersiveLayout = signal(false);
  private readonly authState = inject(AuthState);
  private readonly authSvc = inject(AuthService);
  private readonly cartSvc = inject(CartApiService);
  private readonly cartState = inject(CartState);
  private readonly favSvc = inject(FavoritesService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly avState = inject(AaharVigyanStateService);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.immersiveLayout.set(this.router.url.startsWith('/aahar-vigyan'));
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Drop leftover fake dev session from earlier local testing
    if (
      !environment.devBypassAuth &&
      isDevBypassSession(this.authState.accessToken(), this.authState.refreshToken())
    ) {
      this.authState.logout();
      this.avState.clearAllProfiles();
      sessionStorage.removeItem('av-hero-intro-seen');
      return;
    }

    if (this.authState.accessToken() || this.authState.refreshToken()) {
      // Validate session on startup — silently refreshes if access token expired
      this.authSvc.initSession().subscribe(valid => {
        if (valid) {
          this.cartSvc.syncOnLogin();
          this.favSvc.syncOnLogin();
        }
      });
    }
  }
}

