'use client';

import { HorizontalBarChartComponent } from '@/lib/types';
import { getChartColor } from '@/lib/chart-colors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HorizontalBarChartVisualizationProps {
  component: HorizontalBarChartComponent;
}

export function HorizontalBarChartVisualization({ component }: HorizontalBarChartVisualizationProps) {
  const data = component.data || [];
  const chartColor = getChartColor(component.color, 'purple');

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium text-foreground mb-3 px-1">{component.title}</h3>
      <div className="flex-1 min-h-0">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={true} vertical={false} />
              <XAxis 
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                dataKey={component.yAxis || 'label'} 
                type="category" 
                width={80}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
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
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              <Bar 
                dataKey={component.xAxis || 'value'} 
                fill={chartColor} 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
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
