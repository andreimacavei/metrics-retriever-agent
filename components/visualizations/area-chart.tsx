'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChartComponent } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaChartVisualizationProps {
  component: AreaChartComponent;
}

export function AreaChartVisualization({ component }: AreaChartVisualizationProps) {
  const data = component.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={component.xAxis} />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey={component.yAxis}
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
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

