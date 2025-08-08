import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toastBus, ToastEvent } from '../utils/ToastBus';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, options?: { type?: ToastType; duration?: number; dedupeKey?: string; dedupeMs?: number }) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dedupeRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: { type?: ToastType; duration?: number; dedupeKey?: string; dedupeMs?: number }) => {
    const dedupeKey = options?.dedupeKey || message;
    const dedupeMs = options?.dedupeMs ?? 8000;
    const now = Date.now();
    const last = dedupeRef.current.get(dedupeKey);

    if (last && now - last < dedupeMs) {
      // skip duplicate within window
      return;
    }
    dedupeRef.current.set(dedupeKey, now);

    const id = `${now}_${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = {
      id,
      message,
      type: options?.type || 'info',
      duration: options?.duration ?? 4000
    };
    setToasts(prev => [...prev, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => removeToast(id), toast.duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => showToast(message, { type: 'success', duration }), [showToast]);
  const error = useCallback((message: string, duration?: number) => showToast(message, { type: 'error', duration }), [showToast]);
  const info = useCallback((message: string, duration?: number) => showToast(message, { type: 'info', duration }), [showToast]);
  const warning = useCallback((message: string, duration?: number) => showToast(message, { type: 'warning', duration }), [showToast]);

  // Subscribe to ToastBus so services can trigger toasts globally
  useEffect(() => {
    const unsubscribe = toastBus.subscribe((event: ToastEvent) => {
      showToast(event.message, { type: event.type, duration: event.duration, dedupeKey: event.dedupeKey, dedupeMs: event.dedupeMs });
    });
    return () => unsubscribe();
  }, [showToast]);

  const value = useMemo(() => ({
    toasts,
    showToast,
    success,
    error,
    info,
    warning,
    removeToast
  }), [toasts, showToast, success, error, info, warning, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): Pick<ToastContextValue, 'showToast' | 'success' | 'error' | 'info' | 'warning'> => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  const { showToast, success, error, info, warning } = ctx;
  return { showToast, success, error, info, warning };
};

const ToastContainer: React.FC<{ toasts: Toast[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={[
            'px-4 py-3 rounded shadow-md text-sm flex items-start gap-3 transition-opacity',
            t.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : '',
            t.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : '',
            t.type === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-200' : '',
            t.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : '',
          ].join(' ')}
          role="alert"
        >
          <span className="mt-0.5">
            {t.type === 'success' && '✅'}
            {t.type === 'error' && '⚠️'}
            {t.type === 'info' && 'ℹ️'}
            {t.type === 'warning' && '⚠️'}
          </span>
          <div className="flex-1">{t.message}</div>
          <button
            onClick={() => onClose(t.id)}
            className="ml-2 text-gray-500 hover:text-gray-700"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};