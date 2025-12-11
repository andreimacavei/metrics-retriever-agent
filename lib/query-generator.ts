import { Component } from './types';
import { validateReadOnlySQL, sanitizeSQL } from './sql-validator';
import postgres from 'postgres';

// Create a connection pool for executing raw SQL
function getPostgresClient() {
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL or DATABASE_URL');
  }
  return postgres(connectionString);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeQuery(component: Component): Promise<any> {
  switch (component.type) {
    case 'kpi':
      return executeKPIQuery(component.query);

    case 'line_chart':
    case 'area_chart':
      return executeTimeSeriesQuery(component.query);

    case 'bar_chart':
    case 'horizontal_bar_chart':
      return executeBarChartQuery(component.query);

    case 'pie_chart':
    case 'donut_chart':
      return executePieChartQuery(component.query);

    case 'scatter_chart':
      return executeScatterQuery(component.query);

    case 'table':
      return executeTableQuery(component.query);

    case 'metrics_grid':
      return executeMetricsGridQuery(component.metrics);

    default:
      return null;
  }
}

/**
 * Executes a validated SQL query and returns the results
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeSQL(query: string): Promise<any[]> {
  // Validate the query is read-only
  const validation = validateReadOnlySQL(query);
  if (!validation.isValid) {
    throw new Error(`SQL validation failed: ${validation.error}`);
  }

  // Sanitize the query
  const sanitizedQuery = sanitizeSQL(query);

  // Execute the query
  const sql = getPostgresClient();
  try {
    const result = await sql.unsafe(sanitizedQuery);
    return result;
  } finally {
    await sql.end();
  }
}

/**
 * KPI Query - expects a single row with a 'value' column
 */
async function executeKPIQuery(query: string): Promise<number | string> {
  const results = await executeSQL(query);
  
  if (results.length === 0) {
    return 0;
  }

  const row = results[0];
  // Look for 'value' column, or take the first column
  if ('value' in row) {
    return row.value;
  }
  
  // Fallback: return first column value
  const firstKey = Object.keys(row)[0];
  return firstKey ? row[firstKey] : 0;
}

/**
 * Time Series Query (line_chart, area_chart) - expects rows with 'date' and 'value' columns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTimeSeriesQuery(query: string): Promise<any[]> {
  const results = await executeSQL(query);
  
  return results.map(row => ({
    date: row.date,
    value: row.value ?? row.count ?? 0
  }));
}

/**
 * Bar Chart Query - expects rows with 'label' and 'value' columns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeBarChartQuery(query: string): Promise<any[]> {
  const results = await executeSQL(query);
  
  return results.map(row => ({
    label: row.label ?? row.name ?? '',
    value: row.value ?? row.count ?? 0
  }));
}

/**
 * Pie/Donut Chart Query - expects rows with 'name' and 'value' columns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executePieChartQuery(query: string): Promise<any[]> {
  const results = await executeSQL(query);
  
  return results.map(row => ({
    name: row.name ?? row.label ?? '',
    value: row.value ?? row.count ?? 0
  }));
}

/**
 * Scatter Chart Query - expects rows with 'x' and 'y' columns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeScatterQuery(query: string): Promise<any[]> {
  const results = await executeSQL(query);
  
  return results.map(row => ({
    x: row.x ?? 0,
    y: row.y ?? 0
  }));
}

/**
 * Table Query - returns raw results
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTableQuery(query: string): Promise<any[]> {
  return executeSQL(query);
}

/**
 * Metrics Grid Query - executes multiple KPI queries
 */
async function executeMetricsGridQuery(
  metrics: { label: string; query: string }[]
): Promise<{ label: string; value: number | string }[]> {
  const results = await Promise.all(
    metrics.map(async (m) => {
      const value = await executeKPIQuery(m.query);
      return { label: m.label, value };
    })
  );

  return results;
}
