'use client';

import { LineChartComponent } from '@/lib/types';
import { getChartColor } from '@/lib/chart-colors';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartVisualizationProps {
  component: LineChartComponent;
}

export function LineChartVisualization({ component }: LineChartVisualizationProps) {
  const data = component.data || [];
  const chartColor = getChartColor(component.color, 'blue');

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium text-foreground mb-3 px-1">{component.title}</h3>
      <div className="flex-1 min-h-0">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey={component.xAxis || 'date'} 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
              />
              <Line
                type="monotone"
                dataKey={component.yAxis || 'value'}
                stroke={chartColor}
                strokeWidth={2}
                dot={{ fill: chartColor, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
