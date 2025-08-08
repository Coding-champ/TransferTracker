// Lightweight pub/sub toast bus so non-React code (e.g., services) can trigger toasts.
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastEvent {
  type: ToastType;
  message: string;
  duration?: number;
  dedupeKey?: string;
  dedupeMs?: number;
}

type Listener = (event: ToastEvent) => void;

class ToastBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: ToastEvent) {
    Array.from(this.listeners).forEach(l => {
      try {
        l(event);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('ToastBus listener error:', e);
      }
    });
  }
}

export const toastBus = new ToastBus();