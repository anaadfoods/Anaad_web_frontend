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
    
    // Append Fun Facts based on error status
    const status = err?.status;
    
    if (status === 0 || status === 502 || status === 504 || status === 503) {
      return `Couldn't connect right now. Check your internet! 📶 \n\n🌿 Did you know? Desi cow dung has 300+ beneficial microbes that enrich soil naturally!`;
    } 
    
    if (status >= 500) {
      return `Our servers need a moment. Try again shortly! ☕ \n\n🐄 Fun fact: One desi cow can help fertilize up to 30 acres of farmland per year!`;
    }
    
    if (status === 401 || status === 403) {
      return `Please log in again to continue 🔐 \n\n🌾 Natural farming uses zero chemicals - just cow-based inputs and love!`;
    }

    return baseMessage;
  }
}
