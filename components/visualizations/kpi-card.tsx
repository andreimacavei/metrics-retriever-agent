import { KPIComponent } from '@/lib/types';
import { Minus } from 'lucide-react';

interface KPICardProps {
  component: KPIComponent;
}

// Helper function to format date range for display
const formatDateRange = (dateRange: string | { start: string; end: string } | undefined): string => {
  if (!dateRange) return '';
  
  if (typeof dateRange === 'string') {
    return dateRange.replace(/_/g, ' ');
  }
  
  if (typeof dateRange === 'object' && 'start' in dateRange && 'end' in dateRange) {
    return `${dateRange.start} to ${dateRange.end}`;
  }
  
  return '';
};

// Format large numbers with K, M, B suffixes
const formatValue = (value: number | string | undefined): string => {
  if (value === undefined) return '-';
  if (typeof value === 'string') return value;
  
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
};

export function KPICard({ component }: KPICardProps) {
  return (
    <div className="h-full flex flex-col p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-auto">
        <h3 className="text-sm font-medium text-muted-foreground leading-tight">
          {component.title}
        </h3>
        <div className="flex-shrink-0">
          <Minus className="w-4 h-4 text-muted-foreground/50" />
        </div>
      </div>
      
      {/* Value */}
      <div className="flex-1 flex items-center">
        <span className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
          {formatValue(component.value)}
        </span>
      </div>
      
      {/* Footer */}
      {component.dateRange && (
        <p className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
          {formatDateRange(component.dateRange)}
        </p>
      )}
    </div>
  );
}
