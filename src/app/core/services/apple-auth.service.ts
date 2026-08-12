import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthState } from '../state/auth.state';
import { API } from '../constants/api-endpoints';

export interface AuthResponse {
  access: string;
  refresh: string;
  user: any;
}

@Injectable({ providedIn: 'root' })
export class AppleAuthService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly platformId = inject(PLATFORM_ID);

  initiateSignIn(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const state = 'web__' + this.generateRandomHex(32);
    // Using localStorage instead of sessionStorage so the state survives
    // even if Apple's auth flow opens in a new tab/window — sessionStorage
    // is scoped per-tab, localStorage is shared across all tabs on this origin.
    localStorage.setItem('apple_oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code id_token',
      response_mode: 'form_post',
      client_id: environment.appleServiceId,
      redirect_uri: environment.appleRedirectUri,
      scope: 'email name',
      state: state
    });

    window.location.href = 'https://appleid.apple.com/auth/authorize?' + params.toString();
  }

  loginWithToken(idToken: string): Observable<AuthResponse> {
    // Use relative path so apiBaseInterceptor prepends base URL + sets withCredentials
    return this.http.post<AuthResponse>(API.AUTH.APPLE_LOGIN, { id_token: idToken }).pipe(
      tap(res => {
        this.authState.setTokens(res.access, res.refresh);
        if (res.user) {
          this.authState.setUser(res.user);
        }
      })
    );
  }

  verifyState(returnedState: string): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const stored = localStorage.getItem('apple_oauth_state');
    localStorage.removeItem('apple_oauth_state');
    return stored === returnedState;
  }

  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  }
}