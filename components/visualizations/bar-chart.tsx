'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartVisualizationProps {
  component: BarChartComponent;
}

export function BarChartVisualization({ component }: BarChartVisualizationProps) {
  const data = component.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={component.xAxis} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={component.yAxis} fill="hsl(var(--primary))" />
            </BarChart>
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
