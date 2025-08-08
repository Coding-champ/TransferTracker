// Minimal Telemetry wrapper (Sentry-compatible) with safe fallbacks
// - Dynamic import so no build-time dependency
// - Per-request context provider
// - Lightweight breadcrumb ring buffer + Sentry breadcrumbs when available

import type { FilterState } from '../types';

type TelemetryOptions = {
  environment?: string;
  release?: string;
  tracesSampleRate?: number; // optional override
};

let Sentry: any = null;
let sentryInitialized = false;

// Optional global user and context
let telemetryUserId: string | undefined;
let contextProvider: (() => Record<string, any>) | undefined;

// Simple in-memory breadcrumb buffer
type Breadcrumb = {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
  timestamp: number;
};
const BREADCRUMB_LIMIT = 50;
const breadcrumbs: Breadcrumb[] = [];

export async function initTelemetry(dsn?: string, options?: TelemetryOptions) {
  if (!dsn) return;
  try {
    const mod = await import('@sentry/browser');
    Sentry = mod;
    Sentry.init({
      dsn,
      environment: options?.environment,
      release: options?.release,
      tracesSampleRate: options?.tracesSampleRate ?? 0.1,
    });
    if (telemetryUserId) {
      try {
        Sentry.setUser({ id: telemetryUserId });
      } catch {}
    }
    sentryInitialized = true;
  } catch {
    // ignore loading failures
  }
}

export function setTelemetryUser(userId?: string) {
  telemetryUserId = userId;
  if (sentryInitialized && Sentry) {
    try {
      Sentry.setUser(userId ? { id: userId } : null);
    } catch {}
  }
}

export function setTelemetryContextProvider(fn?: () => Record<string, any>) {
  contextProvider = fn;
}

export function getTelemetryContext(): Record<string, any> {
  try {
    return contextProvider ? (contextProvider() || {}) : {};
  } catch {
    return {};
  }
}

export function captureException(error: unknown, extra?: Record<string, any>) {
  if (!sentryInitialized || !Sentry) return;
  try {
    const base = getTelemetryContext();
    Sentry.captureException(error, { extra: { ...base, ...extra } });
  } catch {
    // ignore
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', extra?: Record<string, any>) {
  if (!sentryInitialized || !Sentry) return;
  try {
    const base = getTelemetryContext();
    Sentry.captureMessage(message, { level, extra: { ...base, ...extra } });
  } catch {
    // ignore
  }
}

export function addBreadcrumb(bc: Breadcrumb) {
  const entry = { ...bc, timestamp: bc.timestamp ?? Date.now() };
  breadcrumbs.push(entry);
  if (breadcrumbs.length > BREADCRUMB_LIMIT) {
    breadcrumbs.shift();
  }
  if (sentryInitialized && Sentry) {
    try {
      Sentry.addBreadcrumb({
        category: entry.category,
        message: entry.message,
        level: entry.level,
        data: entry.data,
        timestamp: entry.timestamp / 1000,
      });
    } catch {
      // ignore
    }
  }
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

// Helper: compact snapshot for filters (no PII, just counts and keys with values)
export function recordFilterBreadcrumb(filters: FilterState, source: string = 'filters') {
  const activeCounts = {
    seasons: filters.seasons.length,
    leagues: filters.leagues.length,
    countries: filters.countries.length,
    continents: filters.continents.length,
    transferTypes: filters.transferTypes.length,
    transferWindows: filters.transferWindows.length,
    positions: filters.positions.length,
    nationalities: filters.nationalities.length,
    clubs: filters.clubs.length,
    leagueTiers: filters.leagueTiers.length,
  };

  const numericFlags = {
    minTransferFee: Number.isFinite(filters.minTransferFee as any),
    maxTransferFee: Number.isFinite(filters.maxTransferFee as any),
    minPlayerAge: Number.isFinite(filters.minPlayerAge as any),
    maxPlayerAge: Number.isFinite(filters.maxPlayerAge as any),
    minContractDuration: Number.isFinite(filters.minContractDuration as any),
    maxContractDuration: Number.isFinite(filters.maxContractDuration as any),
    minROI: Number.isFinite(filters.minROI as any),
    maxROI: Number.isFinite(filters.maxROI as any),
    minPerformanceRating: Number.isFinite(filters.minPerformanceRating as any),
    maxPerformanceRating: Number.isFinite(filters.maxPerformanceRating as any),
  };

  const boolFlags = {
    hasTransferFee: !!filters.hasTransferFee,
    excludeLoans: !!filters.excludeLoans,
    isLoanToBuy: !!filters.isLoanToBuy,
    onlySuccessfulTransfers: !!filters.onlySuccessfulTransfers,
  };

  addBreadcrumb({
    category: 'ui.filters',
    level: 'info',
    message: `Filter updated (${source})`,
    data: {
      activeCounts,
      numericFlags,
      boolFlags,
    },
    timestamp: Date.now(),
  });
}