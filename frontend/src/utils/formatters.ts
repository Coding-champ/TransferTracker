/**
 * Formatting Utilities
 * Provides functions for formatting various data types (currency, dates, percentages, etc.)
 */

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
  
  return typeLabels[transferType] || transferType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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