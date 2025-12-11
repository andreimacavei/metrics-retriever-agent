'use client';

import { PieChartComponent } from '@/lib/types';
import { PIE_COLORS } from '@/lib/chart-colors';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartVisualizationProps {
  component: PieChartComponent;
}

export function PieChartVisualization({ component }: PieChartVisualizationProps) {
  const data = component.data || [];

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium text-foreground mb-3 px-1">{component.title}</h3>
      <div className="flex-1 min-h-0">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="70%"
                fill="#8884d8"
                dataKey={component.valueKey || 'value'}
                nameKey={component.nameKey || 'name'}
              >
                {data.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={PIE_COLORS[index % PIE_COLORS.length]} 
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
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
