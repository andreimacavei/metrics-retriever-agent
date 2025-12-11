import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPIComponent } from '@/lib/types';

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

export function KPICard({ component }: KPICardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-muted-foreground">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
          {component.value !== undefined ? component.value.toLocaleString() : '-'}
        </div>
        {component.dateRange && (
          <p className="text-sm text-muted-foreground mt-2">
            {formatDateRange(component.dateRange)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
