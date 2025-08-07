// Zentrale Utility-Funktionen

import { FilterState, FilterParams } from '../types';

// ========== CONSTANTS ==========
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ========== FORMATTING UTILITIES ==========

/**
 * Formatiert Geldbeträge in lesbarer Form
 * @param value - Betrag in Euro
 * @returns Formatierter String (z.B. "€10.5M", "€250K", "€1,500")
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (!value || value === 0) return 'Free';
  
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  } else {
    return `€${value.toLocaleString()}`;
  }
};

/**
 * Formatiert Datumsangaben in deutschem Format
 * @param dateString - ISO Date String oder Date Object
 * @returns Formatiertes Datum (z.B. "15. Mär 2024")
 */
export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formatiert Prozentwerte
 * @param value - Prozentwert als Dezimalzahl
 * @param decimals - Anzahl Dezimalstellen (default: 1)
 * @returns Formatierter Prozentstring (z.B. "85.5%")
 */
export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formatiert Transfertypen in lesbarer Form
 * @param transferType - Transfer-Typ aus der API
 * @returns Formatierter String (z.B. "Loan With Option")
 */
export const formatTransferType = (transferType: string): string => {
  const typeLabels: { [key: string]: string } = {
    'sale': 'Sale',
    'loan': 'Loan',
    'free': 'Free Transfer',
    'loan_with_option': 'Loan with Option',
    'loan_to_buy': 'Loan-to-Buy'
  };
  
  return typeLabels[transferType] || transferType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Formatiert Transferfenster
 * @param window - Transfer-Window aus der API
 * @returns Formatierter String (z.B. "Summer Window")
 */
export const formatTransferWindow = (window: string): string => {
  const windowLabels: { [key: string]: string } = {
    'summer': 'Summer Window',
    'winter': 'Winter Window'
  };
  
  return windowLabels[window] || window;
};

/**
 * Formatiert Bewertungen/Ratings
 * @param rating - Rating als Zahl (1-10)
 * @param maxRating - Maximale Bewertung (default: 10)
 * @returns Formatierter Rating-String (z.B. "8.5/10")
 */
export const formatRating = (rating: number | null | undefined, maxRating: number = 10): string => {
  if (rating === null || rating === undefined) return 'N/A';
  return `${rating.toFixed(1)}/${maxRating}`;
};

// ========== ARRAY UTILITIES ==========

/**
 * Sichere Array-Parsing für Query-Parameter
 * @param value - Wert der geparst werden soll
 * @returns Array von Strings
 */
export const safeParseArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(',').filter(Boolean);
};

/**
 * Sichere Integer-Array-Parsing
 * @param value - Wert der geparst werden soll
 * @returns Array von Zahlen (filtert ungültige Werte heraus)
 */
export const safeParseIntArray = (value: any): number[] => {
  if (!value) return [];
  const stringArray = safeParseArray(value);
  return stringArray
    .map(v => safeParseInt(v))
    .filter(v => v > 0);
};

/**
 * Sichere Integer-Parsing
 * @param value - Wert der geparst werden soll
 * @param defaultValue - Default-Wert falls Parsing fehlschlägt
 * @returns Geparste Zahl oder Default-Wert
 */
export const safeParseInt = (value: any, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Sichere Float-Parsing
 * @param value - Wert der geparst werden soll
 * @param defaultValue - Default-Wert falls Parsing fehlschlägt
 * @returns Geparste Zahl oder Default-Wert
 */
export const safeParseFloat = (value: any, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
};

// ========== API UTILITIES ==========

/**
 * Konvertiert BigInt zu Number (für API-Responses)
 * @param value - BigInt-Wert oder null
 * @returns Number oder null
 */
export const bigIntToNumber = (value: bigint | null): number | null => {
  return value ? Number(value) : null;
};

/**
 * Baut Query-Parameter-String aus Filter-Objekt
 * @param filters - Filter-State-Objekt
 * @returns URLSearchParams-Objekt
 */
export const buildQueryParams = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  
  // Array-Parameter
  const arrayFilters: (keyof FilterState)[] = [
    'seasons', 'leagues', 'countries', 'continents', 'transferTypes', 
    'transferWindows', 'positions', 'nationalities', 'clubs', 'leagueTiers'
  ];
  
  arrayFilters.forEach(key => {
    const value = filters[key];
    if (Array.isArray(value) && value.length > 0) {
      params.set(key, value.join(','));
    }
  });
  
  // Numerische Parameter
  const numericFilters: (keyof FilterState)[] = [
    'minTransferFee', 'maxTransferFee', 'minPlayerAge', 'maxPlayerAge',
    'minContractDuration', 'maxContractDuration', 'minROI', 'maxROI',
    'minPerformanceRating', 'maxPerformanceRating'
  ];
  
  numericFilters.forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null) {
      params.set(key, value.toString());
    }
  });
  
  // Boolean-Parameter
  const booleanFilters: (keyof FilterState)[] = [
    'hasTransferFee', 'excludeLoans', 'isLoanToBuy', 'onlySuccessfulTransfers'
  ];
  
  booleanFilters.forEach(key => {
    const value = filters[key];
    if (value === true) {
      params.set(key, 'true');
    }
  });
  
  return params;
};

/**
 * Konvertiert FilterState zu FilterParams (für API-Calls)
 * @param filters - Filter-State-Objekt
 * @returns FilterParams-Objekt
 */
export const filtersToApiParams = (filters: FilterState): FilterParams => {
  const params: FilterParams = {};
  
  // Direkte Kopie der meisten Felder
  Object.keys(filters).forEach(key => {
    const value = filters[key as keyof FilterState];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) {
        (params as any)[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        (params as any)[key] = value;
      }
    }
  });
  
  return params;
};

// ========== VALIDATION UTILITIES ==========

/**
 * Validiert ob Filter-Kombination sinnvoll ist
 * @param filters - Filter-State-Objekt
 * @returns Array von Warnungen/Konflikten
 */
export const validateFilterCombination = (filters: FilterState): string[] => {
  const warnings: string[] = [];
  
  // Konflikt: Exclude loans vs Loan-to-buy
  if (filters.excludeLoans && filters.isLoanToBuy) {
    warnings.push('Conflicting filters: "Exclude loans" and "Loan-to-buy only" cannot both be active');
  }
  
  // Konflikt: Min > Max Werte
  if (filters.minTransferFee && filters.maxTransferFee && filters.minTransferFee > filters.maxTransferFee) {
    warnings.push('Minimum transfer fee cannot be higher than maximum transfer fee');
  }
  
  if (filters.minPlayerAge && filters.maxPlayerAge && filters.minPlayerAge > filters.maxPlayerAge) {
    warnings.push('Minimum player age cannot be higher than maximum player age');
  }
  
  if (filters.minContractDuration && filters.maxContractDuration && filters.minContractDuration > filters.maxContractDuration) {
    warnings.push('Minimum contract duration cannot be higher than maximum contract duration');
  }
  
  if (filters.minROI !== undefined && filters.maxROI !== undefined && filters.minROI > filters.maxROI) {
    warnings.push('Minimum ROI cannot be higher than maximum ROI');
  }
  
  if (filters.minPerformanceRating !== undefined && filters.maxPerformanceRating !== undefined && 
      filters.minPerformanceRating > filters.maxPerformanceRating) {
    warnings.push('Minimum performance rating cannot be higher than maximum performance rating');
  }
  
  // Info: Redundante Filter
  if (filters.leagues.length > 0 && filters.continents.length > 0) {
    warnings.push('Both league and continent filters are active - results will show intersection');
  }
  
  return warnings;
};

/**
 * Zählt aktive Filter
 * @param filters - Filter-State-Objekt
 * @returns Anzahl aktiver Filter
 */
export const countActiveFilters = (filters: FilterState): number => {
  let count = 0;
  
  // Array-Filter zählen
  Object.keys(filters).forEach(key => {
    const value = filters[key as keyof FilterState];
    if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'number' && value !== undefined) {
      count++;
    } else if (typeof value === 'boolean' && value === true) {
      count++;
    }
  });
  
  return count;
};

// ========== COLOR UTILITIES ==========

/**
 * Generiert konsistente Farben für Liga-Namen
 * @param league - Liga-Name
 * @returns Hex-Farbcode
 */
export const getLeagueColor = (league: string): string => {
  const leagueColors: { [key: string]: string } = {
    'Bundesliga': '#d70909',
    'Premier League': '#3d0845',
    'La Liga': '#ff6b35',
    'Serie A': '#004225',
    'Ligue 1': '#1e3a8a',
    'Eredivisie': '#ff8c00',
    'Primeira Liga': '#228b22',
    'Süper Lig': '#dc143c'
  };
  
  return leagueColors[league] || '#6b7280'; // Default grau
};

/**
 * Generiert Farbcode basierend auf Erfolgsrate
 * @param transferSuccessRate - Erfolgsrate in Prozent
 * @returns Hex-Farbcode
 */
export const gettransferSuccessRateColor = (transferSuccessRate: number): string => {
  if (transferSuccessRate >= 70) return '#10b981'; // Grün
  if (transferSuccessRate >= 50) return '#f59e0b'; // Gelb
  if (transferSuccessRate >= 30) return '#f97316'; // Orange
  return '#ef4444'; // Rot
};

/**
 * Generiert Farbcode basierend auf ROI
 * @param roi - ROI in Prozent
 * @returns Hex-Farbcode
 */
export const getROIColor = (roi: number): string => {
  if (roi > 50) return '#10b981'; // Dunkelgrün
  if (roi > 0) return '#84cc16'; // Hellgrün
  if (roi > -25) return '#f59e0b'; // Gelb
  if (roi > -50) return '#f97316'; // Orange
  return '#ef4444'; // Rot
};

// ========== DEBUG UTILITIES ==========

/**
 * Debug-Logger für Entwicklung
 * @param message - Log-Nachricht
 * @param data - Zusätzliche Daten
 */
export const debugLog = (message: string, data?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(`[DEBUG] ${message}:`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

/**
 * Performance-Timer für Entwicklung
 * @param label - Timer-Label
 * @returns Funktion zum Stoppen des Timers
 */
export const createPerformanceTimer = (label: string): (() => void) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[PERF] ${label}: ${(end - start).toFixed(2)}ms`);
    };
  }
  return () => {}; // No-op in production
};