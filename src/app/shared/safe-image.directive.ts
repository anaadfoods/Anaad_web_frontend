import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * SafeImageDirective handles image load errors gracefully.
 * 
 * When an image fails to load (e.g., due to GCS returning index.html for missing assets),
 * this directive replaces the src with a fallback placeholder.
 * 
 * Usage:
 * <img [src]="imageUrl" appSafeImage />
 * <img [src]="imageUrl" appSafeImage [fallbackSrc]="'assets/images/custom-placeholder.svg'" />
 */
@Directive({
    selector: 'img[appSafeImage]',
    standalone: true
})
export class SafeImageDirective {
    /**
     * Custom fallback image source. Defaults to an inline SVG placeholder.
     */
    @Input() fallbackSrc = '';

    /**
     * Emits when an image fails to load and fallback is applied.
     */
    @Output() imageError = new EventEmitter<Event>();

    private hasErrored = false;

    // Default inline SVG placeholder (a simple image icon)
    private readonly defaultPlaceholder =
        'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100" height="100" fill="#9CA3AF">
        <rect width="24" height="24" fill="#F3F4F6" rx="2"/>
        <path d="M21 19V5a2 2 0 0 0-2-2H5C3.9 3 3 3.9 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-3 7l4.5-6 3.5 4.5 2.5-3L19 18H5z"/>
      </svg>
    `.trim().replace(/\s+/g, ' '));

    constructor(private el: ElementRef<HTMLImageElement>) { }

    @HostListener('error', ['$event'])
    onError(event: Event): void {
        // Prevent infinite loop if fallback also fails
        if (this.hasErrored) {
            return;
        }

        this.hasErrored = true;
        const img = this.el.nativeElement;

        // Apply fallback
        img.src = this.fallbackSrc || this.defaultPlaceholder;

        // Add a CSS class for styling purposes
        img.classList.add('safe-image--fallback');

        // Emit event for logging/tracking
        this.imageError.emit(event);
    }

    /**
     * Reset the error state when src changes (allows retry with new URL)
     */
    @HostListener('load')
    onLoad(): void {
        this.hasErrored = false;
        this.el.nativeElement.classList.remove('safe-image--fallback');
    }
}
