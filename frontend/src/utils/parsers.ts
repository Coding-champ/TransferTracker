/**
 * Parser Utilities
 * Provides safe parsing functions for arrays, integers, and floats from various input types
 */

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
  // Handle NaN specifically - if the parsed value is NaN and it wasn't explicitly 'NaN' string, return default
  if (isNaN(parsed)) {
    return String(value).toLowerCase() === 'nan' ? parsed : defaultValue;
  }
  return parsed;
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