import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/query-generator';
import { Component } from '@/lib/types';
import { componentsArraySchema } from '@/lib/schemas';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the entire request body with Zod
    const validationResult = componentsArraySchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Component validation errors:', validationResult.error.issues);
      return NextResponse.json(
        { 
          error: 'Invalid components provided',
          details: validationResult.error.issues.map((err: z.ZodIssue) => ({
            path: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { components } = validationResult.data;

    // Execute queries for each component
    const enrichedComponents = await Promise.all(
      components.map(async (component) => {
        // Cast to Component type as validated schemas match expected types
        const result = await executeQuery(component as Component);

        // Enrich component with query results
        switch (component.type) {
          case 'kpi':
            return { ...component, value: result };

          case 'line_chart':
          case 'bar_chart':
          case 'area_chart':
          case 'scatter_chart':
          case 'horizontal_bar_chart':
            return { ...component, data: result };

          case 'pie_chart':
          case 'donut_chart':
            return { ...component, data: result };

          case 'table':
            return { ...component, data: result };

          case 'metrics_grid':
            return { ...component, metrics: result };

          default:
            return component;
        }
      })
    );

    return NextResponse.json({ components: enrichedComponents });
  } catch (error) {
    console.error('Error executing queries:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.issues
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to execute queries' },
      { status: 500 }
    );
  }
}
