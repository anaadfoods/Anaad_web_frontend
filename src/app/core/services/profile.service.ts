// ============================================
// Profile Service
// Wraps profile-specific operations
// (delegates to AuthService for API calls)
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { AuthState } from '../state/auth.state';
import { UserProfile, ProfileUpdateRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);

  /** Fetch current user profile */
  getProfile(): Observable<UserProfile> {
    return this.http.get<{ data?: UserProfile } | UserProfile>(API.AUTH.PROFILE).pipe(
      map(res => ('data' in res && res.data ? res.data : res as UserProfile)),
      tap(profile => this.authState.setUser(profile))
    );
  }

  /** Update profile fields */
  updateProfile(data: ProfileUpdateRequest): Observable<UserProfile> {
    return this.http.put<{ data?: UserProfile } | UserProfile>(API.AUTH.PROFILE, data).pipe(
      map(res => ('data' in res && res.data ? res.data : res as UserProfile)),
      tap(profile => this.authState.setUser(profile))
    );
  }

  /** Upload profile picture */
  uploadProfilePicture(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return this.http.patch<{ data?: UserProfile } | UserProfile>(API.AUTH.PROFILE, formData).pipe(
      map(res => ('data' in res && res.data ? res.data : res as UserProfile)),
      tap(profile => {
        if (profile?.email) this.authState.setUser(profile);
      })
    );
  }
}
