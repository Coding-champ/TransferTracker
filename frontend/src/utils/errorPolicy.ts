// Centralized error -> toast policy mapping
import { AxiosError } from 'axios';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export interface ToastDescriptor {
  type: ToastSeverity;
  message: string;
  dedupeKey?: string;
  dedupeMs?: number;
  duration?: number;
}

export function describeAxiosError(err: AxiosError): ToastDescriptor {
  const status = err.response?.status;
  const path = err.config?.url || '';
  const base: ToastDescriptor = { type: 'error', message: 'Unexpected error', dedupeMs: 8000, duration: 5000 };

  if (!err.response) {
    return { ...base, type: 'warning', message: `Netzwerkfehler bei ${path || 'Request'}`, dedupeKey: `net:${path}` };
  }

  switch (status) {
    case 400:
      return { ...base, type: 'warning', message: `Ungültige Anfrage (400) bei ${path}`, dedupeKey: `400:${path}` };
    case 401:
      return { ...base, type: 'warning', message: `Nicht angemeldet (401). Bitte neu einloggen.`, dedupeKey: `401` };
    case 403:
      return { ...base, type: 'warning', message: `Keine Berechtigung (403) für ${path}`, dedupeKey: `403:${path}` };
    case 404:
      return { ...base, type: 'info', message: `Nicht gefunden (404): ${path}`, dedupeKey: `404:${path}` };
    case 429:
      return { ...base, type: 'warning', message: `Rate-Limit erreicht (429). Bitte etwas warten.`, dedupeKey: `429` };
    case 500:
    case 502:
    case 503:
    case 504:
      return { ...base, type: 'error', message: `Serverproblem (${status}) bei ${path}`, dedupeKey: `5xx:${path}` };
    default:
      return { ...base, type: 'error', message: `Fehler ${status} bei ${path}`, dedupeKey: `${status}:${path}` };
  }
}