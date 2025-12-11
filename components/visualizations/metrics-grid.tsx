import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsGridComponent } from '@/lib/types';

interface MetricsGridProps {
  component: MetricsGridComponent;
}

export function MetricsGrid({ component }: MetricsGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {component.metrics.map((metric, index) => (
            <div key={index} className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
              <p className="text-2xl font-bold">
                {metric.value !== undefined ? metric.value.toLocaleString() : '-'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
