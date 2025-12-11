import { MetricsGridComponent } from '@/lib/types';

interface MetricsGridProps {
  component: MetricsGridComponent;
}

// Format large numbers with K, M, B suffixes
const formatValue = (value: number | undefined): string => {
  if (value === undefined) return '-';
  
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

export function MetricsGrid({ component }: MetricsGridProps) {
  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium text-foreground mb-3 px-1">{component.title}</h3>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {component.metrics.map((metric, index) => (
            <div 
              key={index} 
              className="border border-border/60 rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <p className="text-xs text-muted-foreground mb-1 truncate">{metric.label}</p>
              <p className="text-xl font-bold text-foreground">
                {formatValue(metric.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
