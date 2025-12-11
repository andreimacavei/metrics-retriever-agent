import { ChartColor } from './types';

// Vibrant color palette for charts
export const CHART_COLORS: Record<ChartColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  teal: '#14b8a6',
  red: '#ef4444',
  yellow: '#eab308',
};

// Multi-color palette for pie/donut charts
export const PIE_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#ef4444', // red
  '#eab308', // yellow
];

// Get chart color with fallback
export function getChartColor(color?: ChartColor, defaultColor: ChartColor = 'blue'): string {
  return CHART_COLORS[color || defaultColor];
}
