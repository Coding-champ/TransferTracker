import {
  groupBy,
  aggregateValues,
  getUniqueValues,
  sortBy,
  filterValidValues
} from '../data-processing';

describe('Data Processing Utilities', () => {
  describe('groupBy', () => {
    it('should group objects by a key function', () => {
      const data = [
        { name: 'John', department: 'IT' },
        { name: 'Jane', department: 'HR' },
        { name: 'Bob', department: 'IT' },
      ];

      const result = groupBy(data, item => item.department);
      
      expect(result.has('IT')).toBe(true);
      expect(result.has('HR')).toBe(true);
      expect(result.get('IT')).toHaveLength(2);
      expect(result.get('HR')).toHaveLength(1);
      expect(result.get('IT')).toEqual([
        { name: 'John', department: 'IT' },
        { name: 'Bob', department: 'IT' }
      ]);
    });

    it('should handle empty array', () => {
      const result = groupBy([], item => item.toString());
      expect(result.size).toBe(0);
    });
  });

  describe('aggregateValues', () => {
    it('should aggregate values by a key function', () => {
      const data = [
        { department: 'IT', salary: 50000 },
        { department: 'HR', salary: 45000 },
        { department: 'IT', salary: 60000 },
      ];

      const result = aggregateValues(
        data, 
        item => item.department, 
        item => item.salary
      );
      
      expect(result.get('IT')).toBe(110000);
      expect(result.get('HR')).toBe(45000);
    });

    it('should handle empty array', () => {
      const result = aggregateValues([], () => 'key', () => 1);
      expect(result.size).toBe(0);
    });
  });

  describe('getUniqueValues', () => {
    it('should return unique values from array', () => {
      const data = [1, 2, 2, 3, 1, 4, 3];
      const result = getUniqueValues(data);
      
      expect(result).toHaveLength(4);
      expect(result.sort()).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty array', () => {
      const result = getUniqueValues([]);
      expect(result).toHaveLength(0);
    });

    it('should work with strings', () => {
      const data = ['a', 'b', 'a', 'c', 'b'];
      const result = getUniqueValues(data);
      
      expect(result).toHaveLength(3);
      expect(result.sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('sortBy', () => {
    it('should sort objects by numeric key ascending', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];

      const result = sortBy(data, item => item.age, true);
      
      expect(result[0].name).toBe('Bob');
      expect(result[1].name).toBe('Alice');
      expect(result[2].name).toBe('Charlie');
    });

    it('should sort objects by numeric key descending', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];

      const result = sortBy(data, item => item.age, false);
      
      expect(result[0].name).toBe('Charlie');
      expect(result[1].name).toBe('Alice');
      expect(result[2].name).toBe('Bob');
    });

    it('should sort objects by string key', () => {
      const data = [
        { name: 'Charlie' },
        { name: 'Alice' },
        { name: 'Bob' },
      ];

      const result = sortBy(data, item => item.name);
      
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    it('should not modify original array', () => {
      const data = [{ value: 3 }, { value: 1 }, { value: 2 }];
      const original = [...data];
      
      sortBy(data, item => item.value);
      
      expect(data).toEqual(original);
    });
  });

  describe('filterValidValues', () => {
    it('should filter out null and undefined values', () => {
      const data = [1, null, 2, undefined, 3, null];
      const result = filterValidValues(data);
      
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle array with only valid values', () => {
      const data = [1, 2, 3, 4];
      const result = filterValidValues(data);
      
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should handle array with only null/undefined values', () => {
      const data = [null, undefined, null];
      const result = filterValidValues(data);
      
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = filterValidValues([]);
      expect(result).toEqual([]);
    });

    it('should preserve falsy but valid values', () => {
      const data = [0, false, '', null, undefined];
      const result = filterValidValues(data);
      
      expect(result).toEqual([0, false, '']);
    });
  });

  describe('Integration tests', () => {
    it('should work with complex data processing pipeline', () => {
      const salesData = [
        { region: 'North', amount: 1000, valid: true },
        { region: 'South', amount: null, valid: true },
        { region: 'North', amount: 1500, valid: false },
        { region: 'East', amount: 2000, valid: true },
        { region: 'North', amount: 500, valid: true },
      ];

      // Filter valid sales
      const validSales = salesData.filter(sale => sale.valid && sale.amount !== null);
      
      // Group by region
      const grouped = groupBy(validSales, sale => sale.region);
      
      // Aggregate amounts
      const aggregated = aggregateValues(validSales, sale => sale.region, sale => sale.amount);
      
      expect(grouped.get('North')).toHaveLength(2);
      expect(aggregated.get('North')).toBe(1500);
      expect(aggregated.get('East')).toBe(2000);
    });
  });
});