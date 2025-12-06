import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RedirectionSource = 'WAITLIST' | 'PDF_REQUEST' | 'RFP' | 'USER_QUERY';
export type RequirementType = 'INDIVIDUAL' | 'FAMILY' | 'BUSINESS';

export interface UserQueryPayload {
  name: string;
  phone_number: string; // Must include 91 prefix for WhatsApp
  email: string;
  message: string;
  requirement_type: RequirementType | string;
  business_or_family_name: string;
  is_from_rfp: boolean;
  redirection_from: RedirectionSource;
  article_id?: number; // Optional - only when user comes from article page
}

export interface UserQueryResponse {
  id?: number;
  success?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class UserQueriesService {
  private http = inject(HttpClient);
  // Use relative URL - goes through SSR server proxy which forwards to backend
  private endpoint = '/api/user-queries/';

  submitQuery(payload: UserQueryPayload): Observable<UserQueryResponse> {
    // Format payload with proper phone number and uppercase requirement_type
    const formattedPayload = {
      ...payload,
      phone_number: this.formatPhoneNumber(payload.phone_number),
      requirement_type: this.formatRequirementType(payload.requirement_type)
    };
    
    console.log('Submitting user query with payload:', formattedPayload);
    return this.http.post<UserQueryResponse>(this.endpoint, formattedPayload);
  }

  /**
   * Format requirement type to uppercase (INDIVIDUAL, FAMILY, BUSINESS)
   */
  private formatRequirementType(type: string): RequirementType {
    const normalized = type.toUpperCase().trim();
    
    // Map common variations to correct values
    if (normalized === 'INDIVIDUAL' || normalized === 'PERSONAL') {
      return 'INDIVIDUAL';
    }
    if (normalized === 'FAMILY') {
      return 'FAMILY';
    }
    if (normalized === 'BUSINESS' || normalized === 'B2B') {
      return 'BUSINESS';
    }
    
    // Default fallback - return as uppercase
    return normalized as RequirementType;
  }

  /**
   * Format phone number to include 91 prefix for WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or other characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If already starts with 91 and is 12 digits, return as is
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned;
    }
    
    // If it's a 10 digit number, add 91 prefix
    if (cleaned.length === 10) {
      return '91' + cleaned;
    }
    
    // Return as is if format is unexpected
    return cleaned;
  }
}
