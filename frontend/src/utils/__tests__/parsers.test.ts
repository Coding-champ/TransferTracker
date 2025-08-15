import { safeParseArray, safeParseInt, safeParseFloat, safeParseIntArray } from '../parsers';

describe('Parser Utilities', () => {
  describe('safeParseArray', () => {
    it('should return empty array for null, undefined, or empty values', () => {
      expect(safeParseArray(null)).toEqual([]);
      expect(safeParseArray(undefined)).toEqual([]);
      expect(safeParseArray('')).toEqual([]);
      expect(safeParseArray(0)).toEqual([]);
      expect(safeParseArray(false)).toEqual([]);
    });

    it('should return arrays as-is after converting to strings', () => {
      expect(safeParseArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(safeParseArray([1, 2, 3])).toEqual(['1', '2', '3']);
      expect(safeParseArray([true, false])).toEqual(['true', 'false']);
    });

    it('should split comma-separated strings', () => {
      expect(safeParseArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(safeParseArray('one,two,three')).toEqual(['one', 'two', 'three']);
      expect(safeParseArray('1,2,3')).toEqual(['1', '2', '3']);
    });

    it('should filter out empty values from comma-separated strings', () => {
      expect(safeParseArray('a,,b,c')).toEqual(['a', 'b', 'c']);
      expect(safeParseArray(',a,b,c,')).toEqual(['a', 'b', 'c']);
      expect(safeParseArray('a,b,,c,,')).toEqual(['a', 'b', 'c']);
    });

    it('should handle single values', () => {
      expect(safeParseArray('single')).toEqual(['single']);
      expect(safeParseArray(123)).toEqual(['123']);
      expect(safeParseArray(true)).toEqual(['true']);
    });

    it('should handle edge cases', () => {
      expect(safeParseArray(',')).toEqual([]);
      expect(safeParseArray(',,')).toEqual([]);
      expect(safeParseArray(' , , ')).toEqual([' ', ' ', ' ']);
    });
  });

  describe('safeParseInt', () => {
    it('should parse valid integer strings', () => {
      expect(safeParseInt('123')).toBe(123);
      expect(safeParseInt('0')).toBe(0);
      expect(safeParseInt('-456')).toBe(-456);
      expect(safeParseInt('999')).toBe(999);
    });

    it('should parse numbers', () => {
      expect(safeParseInt(123)).toBe(123);
      expect(safeParseInt(0)).toBe(0);
      expect(safeParseInt(-456)).toBe(-456);
      expect(safeParseInt(999.99)).toBe(999); // Should truncate
    });

    it('should return default value for invalid inputs', () => {
      expect(safeParseInt('abc')).toBe(0);
      expect(safeParseInt('')).toBe(0);
      expect(safeParseInt(null)).toBe(0);
      expect(safeParseInt(undefined)).toBe(0);
      expect(safeParseInt('not-a-number')).toBe(0);
    });

    it('should use custom default values', () => {
      expect(safeParseInt('abc', -1)).toBe(-1);
      expect(safeParseInt('', 100)).toBe(100);
      expect(safeParseInt(null, 999)).toBe(999);
      expect(safeParseInt(undefined, -999)).toBe(-999);
    });

    it('should handle partial numeric strings', () => {
      expect(safeParseInt('123abc')).toBe(123);
      expect(safeParseInt('456.789')).toBe(456);
      expect(safeParseInt('0xff')).toBe(0); // Not a valid decimal
    });

    it('should handle whitespace', () => {
      expect(safeParseInt(' 123 ')).toBe(123);
      expect(safeParseInt('\t456\n')).toBe(456);
    });
  });

  describe('safeParseFloat', () => {
    it('should parse valid float strings', () => {
      expect(safeParseFloat('123.45')).toBe(123.45);
      expect(safeParseFloat('0.0')).toBe(0);
      expect(safeParseFloat('-456.789')).toBe(-456.789);
      expect(safeParseFloat('999')).toBe(999);
    });

    it('should parse numbers', () => {
      expect(safeParseFloat(123.45)).toBe(123.45);
      expect(safeParseFloat(0)).toBe(0);
      expect(safeParseFloat(-456.789)).toBe(-456.789);
      expect(safeParseFloat(999)).toBe(999);
    });

    it('should return default value for invalid inputs', () => {
      expect(safeParseFloat('abc')).toBe(0);
      expect(safeParseFloat('')).toBe(0);
      expect(safeParseFloat(null)).toBe(0);
      expect(safeParseFloat(undefined)).toBe(0);
      expect(safeParseFloat('not-a-number')).toBe(0);
    });

    it('should use custom default values', () => {
      expect(safeParseFloat('abc', -1.5)).toBe(-1.5);
      expect(safeParseFloat('', 100.99)).toBe(100.99);
      expect(safeParseFloat(null, 999.999)).toBe(999.999);
      expect(safeParseFloat(undefined, -999.001)).toBe(-999.001);
    });

    it('should handle scientific notation', () => {
      expect(safeParseFloat('1e3')).toBe(1000);
      expect(safeParseFloat('1.23e-2')).toBe(0.0123);
      expect(safeParseFloat('2.5E+2')).toBe(250);
    });

    it('should handle partial numeric strings', () => {
      expect(safeParseFloat('123.45abc')).toBe(123.45);
      expect(safeParseFloat('456.789xyz')).toBe(456.789);
    });

    it('should handle infinity and special values', () => {
      expect(safeParseFloat('Infinity')).toBe(Infinity);
      expect(safeParseFloat('-Infinity')).toBe(-Infinity);
      expect(safeParseFloat('NaN')).toBeNaN();
    });

    it('should handle whitespace', () => {
      expect(safeParseFloat(' 123.45 ')).toBe(123.45);
      expect(safeParseFloat('\t456.789\n')).toBe(456.789);
    });
  });

  describe('safeParseIntArray', () => {
    it('should return empty array for null, undefined, or empty values', () => {
      expect(safeParseIntArray(null)).toEqual([]);
      expect(safeParseIntArray(undefined)).toEqual([]);
      expect(safeParseIntArray('')).toEqual([]);
      expect(safeParseIntArray(0)).toEqual([]);
      expect(safeParseIntArray(false)).toEqual([]);
    });

    it('should parse arrays of numbers', () => {
      expect(safeParseIntArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(safeParseIntArray(['1', '2', '3'])).toEqual([1, 2, 3]);
      expect(safeParseIntArray([10, 20, 30])).toEqual([10, 20, 30]);
    });

    it('should parse comma-separated strings', () => {
      expect(safeParseIntArray('1,2,3')).toEqual([1, 2, 3]);
      expect(safeParseIntArray('10,20,30')).toEqual([10, 20, 30]);
      expect(safeParseIntArray('100,200,300')).toEqual([100, 200, 300]);
    });

    it('should filter out invalid and zero/negative values', () => {
      expect(safeParseIntArray([1, 0, 2, -1, 3])).toEqual([1, 2, 3]);
      expect(safeParseIntArray('1,0,2,abc,3')).toEqual([1, 2, 3]);
      expect(safeParseIntArray([1, null, 2, undefined, 3] as any)).toEqual([1, 2, 3]);
    });

    it('should handle mixed valid and invalid values', () => {
      expect(safeParseIntArray('1,abc,2,def,3')).toEqual([1, 2, 3]);
      expect(safeParseIntArray('10,,20,,30')).toEqual([10, 20, 30]);
      expect(safeParseIntArray([5, 'abc', 10, '', 15] as any)).toEqual([5, 10, 15]);
    });

    it('should return empty array if no valid positive integers', () => {
      expect(safeParseIntArray('0,-1,-2')).toEqual([]);
      expect(safeParseIntArray('abc,def,ghi')).toEqual([]);
      expect(safeParseIntArray([0, -1, -2])).toEqual([]);
    });

    it('should handle decimal values by truncating', () => {
      expect(safeParseIntArray('1.5,2.9,3.1')).toEqual([1, 2, 3]);
      expect(safeParseIntArray([1.5, 2.9, 3.1])).toEqual([1, 2, 3]);
    });
  });

  describe('Integration tests', () => {
    it('should work together for complex parsing scenarios', () => {
      const queryString = 'seasons=2023/24,2022/23&minAge=18&maxAge=35.5&clubs=1,2,3';
      
      // Simulate parsing query parameters
      const params = new URLSearchParams(queryString);
      
      const seasons = safeParseArray(params.get('seasons'));
      const minAge = safeParseInt(params.get('minAge'));
      const maxAge = safeParseFloat(params.get('maxAge'));
      const clubs = safeParseIntArray(params.get('clubs'));
      
      expect(seasons).toEqual(['2023/24', '2022/23']);
      expect(minAge).toBe(18);
      expect(maxAge).toBe(35.5);
      expect(clubs).toEqual([1, 2, 3]);
    });

    it('should handle malformed data gracefully', () => {
      const malformedData = {
        arrayData: 'a,,b,c,',
        intData: 'not-a-number',
        floatData: '123.abc',
        intArrayData: '1,0,abc,2,3'
      };

      const parsedArray = safeParseArray(malformedData.arrayData);
      const parsedInt = safeParseInt(malformedData.intData, -1);
      const parsedFloat = safeParseFloat(malformedData.floatData, -1.5);
      const parsedIntArray = safeParseIntArray(malformedData.intArrayData);

      expect(parsedArray).toEqual(['a', 'b', 'c']);
      expect(parsedInt).toBe(-1);
      expect(parsedFloat).toBe(123); // parseFloat handles '123.abc' as 123
      expect(parsedIntArray).toEqual([1, 2, 3]);
    });
  });
});