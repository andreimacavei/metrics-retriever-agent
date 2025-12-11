'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HorizontalBarChartComponent } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HorizontalBarChartVisualizationProps {
  component: HorizontalBarChartComponent;
}

export function HorizontalBarChartVisualization({ component }: HorizontalBarChartVisualizationProps) {
  const data = component.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey={component.yAxis} type="category" width={100} />
              <Tooltip />
              <Bar dataKey={component.xAxis} fill="hsl(var(--primary))" />
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

