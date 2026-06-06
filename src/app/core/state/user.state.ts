import { Injectable, inject } from '@angular/core';
import { AuthState } from './auth.state';
import { UserProfile } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class UserStateService {
  private readonly authState = inject(AuthState);

  readonly user = this.authState.user;
  readonly loading = this.authState.loading;
  readonly fullName = this.authState.fullName;
  readonly initials = this.authState.initials;

  setUser(user: UserProfile): void {
    this.authState.setUser(user);
  }

  updateUser(partial: Partial<UserProfile>): void {
    this.authState.updateUser(partial);
  }

  clear(): void {
    this.authState.logout();
  }
}
