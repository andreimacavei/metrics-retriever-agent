'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScatterChartComponent } from '@/lib/types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScatterChartVisualizationProps {
  component: ScatterChartComponent;
}

export function ScatterChartVisualization({ component }: ScatterChartVisualizationProps) {
  const data = component.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={component.xAxis} name={component.xAxis} />
              <YAxis dataKey={component.yAxis} name={component.yAxis} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Data" data={data} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

