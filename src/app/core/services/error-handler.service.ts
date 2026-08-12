import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  
  parseError(err: any): string {
    const errorData = err?.error || err;
    let baseMessage = errorData?.message || errorData?.detail || 'Something went wrong.';
    
    // Non-field errors typically from Django Rest Framework
    if (errorData?.non_field_errors?.[0]) {
      baseMessage = errorData.non_field_errors[0];
    }
    
    const status = err?.status;
    
    if (status === 0 || status === 502 || status === 504 || status === 503) {
      return `Could not connect to the server. Please check your internet connection.`;
    } 
    
    if (status >= 500) {
      return `Our servers are experiencing an issue. Please try again shortly.`;
    }
    
    if (status === 401 || status === 403) {
      return `Session expired or unauthorized. Please log in again to continue.`;
    }

    return baseMessage;
  }
}
