import { getSupabaseAdmin } from './supabase';
import { Component } from './types';
import { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeQuery(component: Component): Promise<any> {
  const supabaseAdmin = getSupabaseAdmin();
  const dateRange = getDateRange(component.dateRange);

  switch (component.type) {
    case 'kpi':
      return executeKPIQuery(supabaseAdmin, component.metric, dateRange);

    case 'line_chart':
    case 'bar_chart':
      return executeChartQuery(supabaseAdmin, component.yAxis, dateRange, component.groupBy);

    case 'table':
      return executeTableQuery(supabaseAdmin, component.columns, dateRange);

    case 'metrics_grid':
      return executeMetricsGridQuery(supabaseAdmin, component.metrics, dateRange);

    default:
      return null;
  }
}

function getDateRange(range?: string | { start: string; end: string }): { start: Date; end: Date } {
  // Handle custom date range object
  if (typeof range === 'object' && range !== null && 'start' in range && 'end' in range) {
    return {
      start: new Date(range.start),
      end: new Date(range.end)
    };
  }

  // Handle predefined date ranges
  const end = new Date();
  const start = new Date();

  switch (range) {
    case 'last_7_days':
      start.setDate(start.getDate() - 7);
      break;
    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      break;
    case 'last_90_days':
      start.setDate(start.getDate() - 90);
      break;
    case 'this_month':
      start.setDate(1);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

async function executeKPIQuery(supabaseAdmin: SupabaseClient, metric: string, dateRange: { start: Date; end: Date }) {
  switch (metric) {
    case 'count_distinct_users':
    case 'daily_active_users':
    case 'weekly_active_users':
    case 'monthly_active_users': {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: false })
        .gte('last_seen_at', dateRange.start.toISOString())
        .lte('last_seen_at', dateRange.end.toISOString());

      return data ? data.length : 0;
    }

    case 'count_events': {
      const { data } = await supabaseAdmin
        .from('events')
        .select('id', { count: 'exact', head: false })
        .gte('timestamp', dateRange.start.toISOString())
        .lte('timestamp', dateRange.end.toISOString());

      return data ? data.length : 0;
    }

    default:
      return 0;
  }
}

async function executeChartQuery(
  supabaseAdmin: SupabaseClient,
  metric: string,
  dateRange: { start: Date; end: Date },
  groupBy?: string
) {
  // For simplicity, we'll aggregate events by date
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('timestamp, user_id')
    .gte('timestamp', dateRange.start.toISOString())
    .lte('timestamp', dateRange.end.toISOString())
    .order('timestamp', { ascending: true });

  if (!events) return [];

  // Group data by day/week/month
  const grouped = new Map<string, Set<string>>();

  events.forEach((event) => {
    const date = new Date(event.timestamp);
    let key: string;

    switch (groupBy) {
      case 'hour':
        key = date.toISOString().substring(0, 13);
        break;
      case 'day':
        key = date.toISOString().substring(0, 10);
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().substring(0, 10);
        break;
      case 'month':
        key = date.toISOString().substring(0, 7);
        break;
      default:
        key = date.toISOString().substring(0, 10);
    }

    if (!grouped.has(key)) {
      grouped.set(key, new Set());
    }
    if (event.user_id) {
      grouped.get(key)!.add(event.user_id);
    }
  });

  return Array.from(grouped.entries()).map(([date, users]) => ({
    date,
    [metric]: users.size,
  }));
}

async function executeTableQuery(supabaseAdmin: SupabaseClient, columns: string[], dateRange: { start: Date; end: Date }) {
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('event_name, timestamp, user_id')
    .gte('timestamp', dateRange.start.toISOString())
    .lte('timestamp', dateRange.end.toISOString())
    .order('timestamp', { ascending: false })
    .limit(100);

  if (!events) return [];

  return events.map((event) => ({
    event_name: event.event_name,
    timestamp: new Date(event.timestamp).toLocaleDateString(),
    user_id: event.user_id?.substring(0, 8) + '...',
  }));
}

async function executeMetricsGridQuery(
  supabaseAdmin: SupabaseClient,
  metrics: { label: string; metric: string }[],
  dateRange: { start: Date; end: Date }
) {
  const results = await Promise.all(
    metrics.map(async (m) => {
      const value = await executeKPIQuery(supabaseAdmin, m.metric, dateRange);
      return { ...m, value };
    })
  );

  return results;
}
