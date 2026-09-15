import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  deepLink?: string;
  actionText?: string;
  onClick?: () => void;
}


@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  messages = signal<ToastMessage[]>([]);

  show(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    durationMs = 3000,
    options?: { deepLink?: string; actionText?: string; onClick?: () => void }
  ) {
    const id = this.nextId++;
    this.messages.update(msgs => [
      ...msgs,
      {
        id,
        message,
        type,
        deepLink: options?.deepLink,
        actionText: options?.actionText,
        onClick: options?.onClick
      }
    ]);

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  remove(id: number) {
    this.messages.update(msgs => msgs.filter(m => m.id !== id));
  }
}
