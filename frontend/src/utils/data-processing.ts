/**
 * Data Processing Utilities
 * Provides functions for common data transformation operations
 */

/**
 * Gruppiert ein Array von Objekten nach einem bestimmten Schlüssel
 * @param array - Array von Objekten die gruppiert werden sollen
 * @param keyFunc - Funktion die den Gruppierungsschlüssel für jedes Objekt bestimmt
 * @returns Map mit Gruppierungsschlüsseln als Keys und Arrays von Objekten als Values
 */
export const groupBy = <T>(array: T[], keyFunc: (item: T) => string): Map<string, T[]> => {
  return array.reduce((groups, item) => {
    const key = keyFunc(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
    return groups;
  }, new Map<string, T[]>());
};

/**
 * Aggregiert Werte in einem Array basierend auf einem Gruppierungsschlüssel
 * @param array - Array von Objekten die aggregiert werden sollen
 * @param keyFunc - Funktion die den Gruppierungsschlüssel für jedes Objekt bestimmt
 * @param valueFunc - Funktion die den zu aggregierenden Wert für jedes Objekt bestimmt
 * @returns Map mit Gruppierungsschlüsseln als Keys und aggregierten Summen als Values
 */
export const aggregateValues = <T>(
  array: T[],
  keyFunc: (item: T) => string,
  valueFunc: (item: T) => number
): Map<string, number> => {
  return array.reduce((aggregates, item) => {
    const key = keyFunc(item);
    const value = valueFunc(item);
    aggregates.set(key, (aggregates.get(key) || 0) + value);
    return aggregates;
  }, new Map<string, number>());
};

/**
 * Findet eindeutige Werte in einem Array
 * @param array - Array mit möglicherweise doppelten Werten
 * @returns Array mit eindeutigen Werten
 */
export const getUniqueValues = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

/**
 * Sortiert ein Array von Objekten nach einem bestimmten Feld
 * @param array - Array von Objekten die sortiert werden sollen
 * @param keyFunc - Funktion die den Sortierschlüssel für jedes Objekt bestimmt
 * @param ascending - Ob aufsteigend (true) oder absteigend (false) sortiert werden soll
 * @returns Neues sortiertes Array
 */
export const sortBy = <T>(
  array: T[], 
  keyFunc: (item: T) => string | number, 
  ascending: boolean = true
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = keyFunc(a);
    const bVal = keyFunc(b);
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    const numA = Number(aVal);
    const numB = Number(bVal);
    return ascending ? numA - numB : numB - numA;
  });
};

/**
 * Filtert ein Array und entfernt null/undefined Werte
 * @param array - Array mit möglicherweise null/undefined Werten
 * @returns Array nur mit gültigen (nicht-null/undefined) Werten
 */
export const filterValidValues = <T>(array: (T | null | undefined)[]): T[] => {
  return array.filter((item): item is T => item !== null && item !== undefined);
};