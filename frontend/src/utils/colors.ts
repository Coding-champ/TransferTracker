/**
 * Color Utilities
 * Provides functions for generating colors based on leagues, ROI, and transfer success rates
 */

/**
 * Returns a color for a specific league
 * @param league - League name
 * @returns Hex color string for the league
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
  return leagueColors[league] || '#6b7280'; // Default gray color
};

/**
 * Returns a color based on transfer success rate
 * @param transferSuccessRate - Success rate as a percentage (0-100)
 * @returns Hex color string indicating success level
 */
export const gettransferSuccessRateColor = (transferSuccessRate: number): string => {
  if (transferSuccessRate >= 70) return '#10b981'; // Green
  if (transferSuccessRate >= 50) return '#f59e0b'; // Yellow
  if (transferSuccessRate >= 30) return '#f97316'; // Orange
  return '#ef4444'; // Red
};

/**
 * Returns a color based on ROI (Return on Investment)
 * @param roi - ROI percentage
 * @returns Hex color string indicating ROI level
 */
export const getROIColor = (roi: number): string => {
  if (roi > 50) return '#10b981';   // Bright green for excellent ROI
  if (roi >= 0) return '#84cc16';   // Light green for positive ROI (including 0)
  if (roi >= -25) return '#f59e0b'; // Yellow for slight loss (down to -25%)
  if (roi >= -50) return '#f97316'; // Orange for moderate loss (down to -50%)
  return '#ef4444';                 // Red for significant loss (below -50%)
};