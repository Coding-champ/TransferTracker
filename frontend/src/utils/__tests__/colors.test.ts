import { getLeagueColor, gettransferSuccessRateColor, getROIColor } from '../colors';

describe('Color Utilities', () => {
  describe('getLeagueColor', () => {
    it('should return correct colors for known leagues', () => {
      expect(getLeagueColor('Bundesliga')).toBe('#d70909');
      expect(getLeagueColor('Premier League')).toBe('#3d0845');
      expect(getLeagueColor('La Liga')).toBe('#ff6b35');
      expect(getLeagueColor('Serie A')).toBe('#004225');
      expect(getLeagueColor('Ligue 1')).toBe('#1e3a8a');
      expect(getLeagueColor('Eredivisie')).toBe('#ff8c00');
      expect(getLeagueColor('Primeira Liga')).toBe('#228b22');
      expect(getLeagueColor('Süper Lig')).toBe('#dc143c');
    });

    it('should return default gray color for unknown leagues', () => {
      expect(getLeagueColor('Unknown League')).toBe('#6b7280');
      expect(getLeagueColor('Championship')).toBe('#6b7280');
      expect(getLeagueColor('MLS')).toBe('#6b7280');
      expect(getLeagueColor('')).toBe('#6b7280');
    });

    it('should be case sensitive', () => {
      expect(getLeagueColor('bundesliga')).toBe('#6b7280'); // lowercase
      expect(getLeagueColor('BUNDESLIGA')).toBe('#6b7280'); // uppercase
      expect(getLeagueColor('premier league')).toBe('#6b7280'); // lowercase
    });

    it('should handle special characters correctly', () => {
      expect(getLeagueColor('Süper Lig')).toBe('#dc143c');
    });
  });

  describe('gettransferSuccessRateColor', () => {
    it('should return green for high success rates (>=70%)', () => {
      expect(gettransferSuccessRateColor(70)).toBe('#10b981');
      expect(gettransferSuccessRateColor(80)).toBe('#10b981');
      expect(gettransferSuccessRateColor(90)).toBe('#10b981');
      expect(gettransferSuccessRateColor(100)).toBe('#10b981');
    });

    it('should return yellow for moderate success rates (50-69%)', () => {
      expect(gettransferSuccessRateColor(50)).toBe('#f59e0b');
      expect(gettransferSuccessRateColor(60)).toBe('#f59e0b');
      expect(gettransferSuccessRateColor(69)).toBe('#f59e0b');
      expect(gettransferSuccessRateColor(69.9)).toBe('#f59e0b');
    });

    it('should return orange for low success rates (30-49%)', () => {
      expect(gettransferSuccessRateColor(30)).toBe('#f97316');
      expect(gettransferSuccessRateColor(40)).toBe('#f97316');
      expect(gettransferSuccessRateColor(49)).toBe('#f97316');
      expect(gettransferSuccessRateColor(49.9)).toBe('#f97316');
    });

    it('should return red for very low success rates (<30%)', () => {
      expect(gettransferSuccessRateColor(0)).toBe('#ef4444');
      expect(gettransferSuccessRateColor(10)).toBe('#ef4444');
      expect(gettransferSuccessRateColor(29)).toBe('#ef4444');
      expect(gettransferSuccessRateColor(29.9)).toBe('#ef4444');
    });

    it('should handle edge cases', () => {
      expect(gettransferSuccessRateColor(-10)).toBe('#ef4444'); // Negative values
      expect(gettransferSuccessRateColor(110)).toBe('#10b981'); // Values over 100
    });

    it('should handle decimal values correctly', () => {
      expect(gettransferSuccessRateColor(69.99)).toBe('#f59e0b'); // Should be yellow
      expect(gettransferSuccessRateColor(70.01)).toBe('#10b981'); // Should be green
      expect(gettransferSuccessRateColor(49.99)).toBe('#f97316'); // Should be orange
      expect(gettransferSuccessRateColor(50.01)).toBe('#f59e0b'); // Should be yellow
    });
  });

  describe('getROIColor', () => {
    it('should return bright green for excellent ROI (>50%)', () => {
      expect(getROIColor(51)).toBe('#10b981');
      expect(getROIColor(75)).toBe('#10b981');
      expect(getROIColor(100)).toBe('#10b981');
      expect(getROIColor(200)).toBe('#10b981');
    });

    it('should return light green for positive ROI (0-50%)', () => {
      expect(getROIColor(1)).toBe('#84cc16');
      expect(getROIColor(25)).toBe('#84cc16');
      expect(getROIColor(50)).toBe('#84cc16');
      expect(getROIColor(0.1)).toBe('#84cc16');
      expect(getROIColor(0)).toBe('#84cc16'); // Zero is included in positive
    });

    it('should return yellow for slight loss (-25% to 0%)', () => {
      expect(getROIColor(-1)).toBe('#f59e0b');
      expect(getROIColor(-10)).toBe('#f59e0b');
      expect(getROIColor(-25)).toBe('#f59e0b');
      expect(getROIColor(-24.9)).toBe('#f59e0b');
    });

    it('should return orange for moderate loss (below -25% to -50%)', () => {
      expect(getROIColor(-25.1)).toBe('#f97316');
      expect(getROIColor(-30)).toBe('#f97316');
      expect(getROIColor(-40)).toBe('#f97316');
      expect(getROIColor(-50)).toBe('#f97316');
      expect(getROIColor(-49.9)).toBe('#f97316');
    });

    it('should return red for significant loss (<-50%)', () => {
      expect(getROIColor(-50.1)).toBe('#ef4444');
      expect(getROIColor(-60)).toBe('#ef4444');
      expect(getROIColor(-75)).toBe('#ef4444');
      expect(getROIColor(-100)).toBe('#ef4444');
    });

    it('should handle edge cases and boundary values', () => {
      expect(getROIColor(50)).toBe('#84cc16'); // Exactly 50 is light green
      expect(getROIColor(50.1)).toBe('#10b981'); // Just over 50 is bright green
      expect(getROIColor(0)).toBe('#84cc16'); // Zero is positive (>= 0)
      expect(getROIColor(-0.1)).toBe('#f59e0b'); // Just below zero is yellow
      expect(getROIColor(-25)).toBe('#f59e0b'); // Exactly -25 is yellow
      expect(getROIColor(-25.1)).toBe('#f97316'); // Just below -25 is orange
      expect(getROIColor(-50)).toBe('#f97316'); // Exactly -50 is orange
      expect(getROIColor(-50.1)).toBe('#ef4444'); // Just below -50 is red
    });

    it('should handle decimal precision correctly', () => {
      expect(getROIColor(50.001)).toBe('#10b981');
      expect(getROIColor(49.999)).toBe('#84cc16');
      expect(getROIColor(-24.999)).toBe('#f59e0b');
      expect(getROIColor(-25.001)).toBe('#f97316');
      expect(getROIColor(-49.999)).toBe('#f97316');
      expect(getROIColor(-50.001)).toBe('#ef4444');
    });
  });

  describe('Integration tests', () => {
    it('should provide consistent color schemes across functions', () => {
      // All functions should use similar color schemes for consistency
      const greenColor = '#10b981';
      const yellowColor = '#f59e0b';
      const orangeColor = '#f97316';
      const redColor = '#ef4444';

      // High performance values should be green
      expect(gettransferSuccessRateColor(80)).toBe(greenColor);
      expect(getROIColor(75)).toBe(greenColor);

      // Medium performance should be yellow
      expect(gettransferSuccessRateColor(60)).toBe(yellowColor);
      expect(getROIColor(-10)).toBe(yellowColor);

      // Low performance should be orange
      expect(gettransferSuccessRateColor(40)).toBe(orangeColor);
      expect(getROIColor(-40)).toBe(orangeColor);

      // Very poor performance should be red
      expect(gettransferSuccessRateColor(20)).toBe(redColor);
      expect(getROIColor(-60)).toBe(redColor);
    });

    it('should handle various data types and scenarios', () => {
      // Should work with various league scenarios
      expect(getLeagueColor('Bundesliga')).toMatch(/^#[0-9a-f]{6}$/i);
      expect(getLeagueColor('Unknown')).toMatch(/^#[0-9a-f]{6}$/i);

      // Should work with various performance metrics
      const successRates = [0, 25, 50, 75, 100];
      const roiValues = [-75, -25, 0, 25, 75];

      successRates.forEach(rate => {
        expect(gettransferSuccessRateColor(rate)).toMatch(/^#[0-9a-f]{6}$/i);
      });

      roiValues.forEach(roi => {
        expect(getROIColor(roi)).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});