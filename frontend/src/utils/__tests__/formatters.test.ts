import { 
  formatCurrency, 
  formatDate, 
  formatPercentage, 
  formatTransferType, 
  formatTransferWindow, 
  formatRating 
} from '../formatters';

describe('Formatter Utilities', () => {
  describe('formatCurrency', () => {
    it('should return "Free" for zero, null, or undefined values', () => {
      expect(formatCurrency(0)).toBe('Free');
      expect(formatCurrency(null)).toBe('Free');
      expect(formatCurrency(undefined)).toBe('Free');
    });

    it('should format values in millions', () => {
      expect(formatCurrency(1000000)).toBe('€1.0M');
      expect(formatCurrency(1500000)).toBe('€1.5M');
      expect(formatCurrency(10500000)).toBe('€10.5M');
      expect(formatCurrency(50000000)).toBe('€50.0M');
    });

    it('should format values in thousands', () => {
      expect(formatCurrency(1000)).toBe('€1K');
      expect(formatCurrency(1500)).toBe('€2K');
      expect(formatCurrency(250000)).toBe('€250K');
      expect(formatCurrency(999999)).toBe('€1000K');
    });

    it('should format smaller values with locale formatting', () => {
      expect(formatCurrency(500)).toBe('€500');
      expect(formatCurrency(100)).toBe('€100');
      expect(formatCurrency(1)).toBe('€1');
    });

    it('should handle edge cases', () => {
      expect(formatCurrency(999)).toBe('€999');
      expect(formatCurrency(1000)).toBe('€1K');
      expect(formatCurrency(1000000)).toBe('€1.0M');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date strings correctly', () => {
      const result = formatDate('2024-03-15T10:30:00Z');
      expect(result).toMatch(/15\.\s*(Mär|März)\.?\s*2024/);
    });

    it('should format Date objects correctly', () => {
      const date = new Date('2024-12-25');
      const result = formatDate(date);
      expect(result).toMatch(/25\.\s*(Dez|Dezember)\.?\s*2024/);
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate('2024-13-45')).toBe('Invalid Date');
    });

    it('should handle different date formats', () => {
      const result1 = formatDate('2024-01-01');
      const result2 = formatDate('2024/01/01');
      expect(result1).toMatch(/1\.\s*(Jan|Januar)\.?\s*2024/);
      expect(result2).toMatch(/1\.\s*(Jan|Januar)\.?\s*2024/);
    });
  });

  describe('formatPercentage', () => {
    it('should return "N/A" for null or undefined values', () => {
      expect(formatPercentage(null)).toBe('N/A');
      expect(formatPercentage(undefined)).toBe('N/A');
    });

    it('should format percentages with default 1 decimal place', () => {
      expect(formatPercentage(85.5)).toBe('85.5%');
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(123.456)).toBe('123.5%');
    });

    it('should format percentages with custom decimal places', () => {
      expect(formatPercentage(85.5, 0)).toBe('86%');
      expect(formatPercentage(85.5, 2)).toBe('85.50%');
      expect(formatPercentage(85.567, 3)).toBe('85.567%');
    });

    it('should handle edge cases', () => {
      expect(formatPercentage(-10.5)).toBe('-10.5%');
      expect(formatPercentage(0.1)).toBe('0.1%');
      expect(formatPercentage(999.999)).toBe('1000.0%');
    });
  });

  describe('formatTransferType', () => {
    it('should format known transfer types', () => {
      expect(formatTransferType('sale')).toBe('Sale');
      expect(formatTransferType('loan')).toBe('Loan');
      expect(formatTransferType('free')).toBe('Free Transfer');
      expect(formatTransferType('loan_with_option')).toBe('Loan with Option');
      expect(formatTransferType('loan_to_buy')).toBe('Loan-to-Buy');
    });

    it('should format unknown transfer types by transforming underscores and capitalizing', () => {
      expect(formatTransferType('custom_type')).toBe('Custom Type');
      expect(formatTransferType('another_transfer_type')).toBe('Another Transfer Type');
      expect(formatTransferType('single')).toBe('Single');
    });

    it('should handle edge cases', () => {
      expect(formatTransferType('')).toBe('');
      expect(formatTransferType('_')).toBe(' ');
      expect(formatTransferType('test_')).toBe('Test ');
      expect(formatTransferType('_test')).toBe(' Test');
    });
  });

  describe('formatTransferWindow', () => {
    it('should format known transfer windows', () => {
      expect(formatTransferWindow('summer')).toBe('Summer Window');
      expect(formatTransferWindow('winter')).toBe('Winter Window');
    });

    it('should return unknown window types as-is', () => {
      expect(formatTransferWindow('spring')).toBe('spring');
      expect(formatTransferWindow('custom')).toBe('custom');
      expect(formatTransferWindow('')).toBe('');
    });
  });

  describe('formatRating', () => {
    it('should return "N/A" for null or undefined values', () => {
      expect(formatRating(null)).toBe('N/A');
      expect(formatRating(undefined)).toBe('N/A');
    });

    it('should format ratings with default max rating of 10', () => {
      expect(formatRating(8.5)).toBe('8.5/10');
      expect(formatRating(10)).toBe('10.0/10');
      expect(formatRating(0)).toBe('0.0/10');
      expect(formatRating(5)).toBe('5.0/10');
    });

    it('should format ratings with custom max rating', () => {
      expect(formatRating(4.5, 5)).toBe('4.5/5');
      expect(formatRating(85, 100)).toBe('85.0/100');
      expect(formatRating(3, 3)).toBe('3.0/3');
    });

    it('should handle decimal precision', () => {
      expect(formatRating(8.567)).toBe('8.6/10');
      expect(formatRating(8.123)).toBe('8.1/10');
      expect(formatRating(8.999)).toBe('9.0/10');
    });
  });

  describe('Integration tests', () => {
    it('should handle multiple formatter functions together', () => {
      const transfer = {
        fee: 1500000,
        date: '2024-03-15',
        successRate: 85.5,
        type: 'loan_with_option',
        window: 'summer',
        rating: 8.7
      };

      expect(formatCurrency(transfer.fee)).toBe('€1.5M');
      expect(formatDate(transfer.date)).toMatch(/15\.\s*(Mär|März)\.?\s*2024/);
      expect(formatPercentage(transfer.successRate)).toBe('85.5%');
      expect(formatTransferType(transfer.type)).toBe('Loan with Option');
      expect(formatTransferWindow(transfer.window)).toBe('Summer Window');
      expect(formatRating(transfer.rating)).toBe('8.7/10');
    });
  });
});