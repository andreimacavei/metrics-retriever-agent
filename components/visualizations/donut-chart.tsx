'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DonutChartComponent } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DonutChartVisualizationProps {
  component: DonutChartComponent;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

export function DonutChartVisualization({ component }: DonutChartVisualizationProps) {
  const data = component.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) => 
                  name && percent !== undefined ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                }
                outerRadius={80}
                innerRadius={50}
                fill="#8884d8"
                dataKey={component.valueKey}
                nameKey={component.nameKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
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

