import { z } from 'zod';

// ========================================
// BASE SCHEMAS
// ========================================

const predefinedDateRangeSchema = z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'last_month']);

const customDateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
}).refine((data) => {
  const start = new Date(data.start);
  const end = new Date(data.end);
  return start <= end;
}, {
  message: 'Start date must be before or equal to end date'
});

const dateRangeSchema = z.union([predefinedDateRangeSchema, customDateRangeSchema]);

const groupBySchema = z.enum(['day', 'week', 'month', 'hour']);

const metricSchema = z.enum([
  'count_distinct_users',
  'count_events',
  'avg_session_duration',
  'daily_active_users',
  'weekly_active_users',
  'monthly_active_users'
]);

const filterSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.any()
});

const baseComponentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dateRange: dateRangeSchema.optional(),
  filters: z.array(filterSchema).optional()
});

// ========================================
// COMPONENT SCHEMAS
// ========================================

export const kpiComponentSchema = baseComponentSchema.extend({
  type: z.literal('kpi'),
  metric: metricSchema
});

export const lineChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('line_chart'),
  xAxis: z.string().min(1, 'X-axis is required'),
  yAxis: z.string().min(1, 'Y-axis is required'),
  groupBy: groupBySchema.optional()
});

export const barChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('bar_chart'),
  xAxis: z.string().min(1, 'X-axis is required'),
  yAxis: z.string().min(1, 'Y-axis is required'),
  groupBy: groupBySchema.optional()
});

export const tableComponentSchema = baseComponentSchema.extend({
  type: z.literal('table'),
  columns: z.array(z.string().min(1)).min(1, 'At least one column is required')
});

export const metricsGridComponentSchema = baseComponentSchema.extend({
  type: z.literal('metrics_grid'),
  metrics: z.array(z.object({
    label: z.string().min(1, 'Label is required'),
    metric: metricSchema
  })).min(1, 'At least one metric is required')
});

export const pieChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('pie_chart'),
  nameKey: z.string().min(1, 'Name key is required'),
  valueKey: z.string().min(1, 'Value key is required')
});

export const areaChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('area_chart'),
  xAxis: z.string().min(1, 'X-axis is required'),
  yAxis: z.string().min(1, 'Y-axis is required'),
  groupBy: groupBySchema.optional()
});

export const donutChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('donut_chart'),
  nameKey: z.string().min(1, 'Name key is required'),
  valueKey: z.string().min(1, 'Value key is required')
});

export const scatterChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('scatter_chart'),
  xAxis: z.string().min(1, 'X-axis is required'),
  yAxis: z.string().min(1, 'Y-axis is required')
});

export const horizontalBarChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('horizontal_bar_chart'),
  xAxis: z.string().min(1, 'X-axis is required'),
  yAxis: z.string().min(1, 'Y-axis is required')
});

// ========================================
// DISCRIMINATED UNION SCHEMA
// ========================================

export const componentSchema = z.discriminatedUnion('type', [
  kpiComponentSchema,
  lineChartComponentSchema,
  barChartComponentSchema,
  tableComponentSchema,
  metricsGridComponentSchema,
  pieChartComponentSchema,
  areaChartComponentSchema,
  donutChartComponentSchema,
  scatterChartComponentSchema,
  horizontalBarChartComponentSchema
]);

// ========================================
// REPORT SCHEMAS
// ========================================

export const reportConfigSchema = z.object({
  reportName: z.string().min(1, 'Report name is required'),
  components: z.array(componentSchema).min(1, 'At least one component is required')
});

export const componentsArraySchema = z.object({
  components: z.array(componentSchema).min(1, 'Components array cannot be empty')
});

// ========================================
// JSON SCHEMA FOR ANTHROPIC STRUCTURED OUTPUT
// ========================================

// Date range definition for use in all components
const dateRangeJsonSchema = {
  oneOf: [
    {
      type: "string",
      enum: ["last_7_days", "last_30_days", "last_90_days", "this_month", "last_month"]
    },
    {
      type: "object",
      required: ["start", "end"],
      properties: {
        start: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Start date in YYYY-MM-DD format"
        },
        end: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "End date in YYYY-MM-DD format"
        }
      },
      additionalProperties: false
    }
  ]
};

export const ANTHROPIC_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    reportName: {
      type: "string",
      description: "Descriptive name for the report"
    },
    components: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            required: ["type", "title", "metric"],
            properties: {
              type: { type: "string", enum: ["kpi"] },
              title: { type: "string" },
              metric: {
                type: "string",
                enum: [
                  "count_distinct_users",
                  "count_events",
                  "avg_session_duration",
                  "daily_active_users",
                  "weekly_active_users",
                  "monthly_active_users"
                ]
              },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "xAxis", "yAxis"],
            properties: {
              type: { type: "string", enum: ["line_chart"] },
              title: { type: "string" },
              xAxis: { type: "string" },
              yAxis: { type: "string" },
              groupBy: { type: "string", enum: ["day", "week", "month", "hour"] },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "xAxis", "yAxis"],
            properties: {
              type: { type: "string", enum: ["bar_chart"] },
              title: { type: "string" },
              xAxis: { type: "string" },
              yAxis: { type: "string" },
              groupBy: { type: "string", enum: ["day", "week", "month", "hour"] },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "xAxis", "yAxis"],
            properties: {
              type: { type: "string", enum: ["area_chart"] },
              title: { type: "string" },
              xAxis: { type: "string" },
              yAxis: { type: "string" },
              groupBy: { type: "string", enum: ["day", "week", "month", "hour"] },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "xAxis", "yAxis"],
            properties: {
              type: { type: "string", enum: ["scatter_chart"] },
              title: { type: "string" },
              xAxis: { type: "string" },
              yAxis: { type: "string" },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "xAxis", "yAxis"],
            properties: {
              type: { type: "string", enum: ["horizontal_bar_chart"] },
              title: { type: "string" },
              xAxis: { type: "string" },
              yAxis: { type: "string" },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "nameKey", "valueKey"],
            properties: {
              type: { type: "string", enum: ["pie_chart"] },
              title: { type: "string" },
              nameKey: { type: "string" },
              valueKey: { type: "string" },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "nameKey", "valueKey"],
            properties: {
              type: { type: "string", enum: ["donut_chart"] },
              title: { type: "string" },
              nameKey: { type: "string" },
              valueKey: { type: "string" },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "columns"],
            properties: {
              type: { type: "string", enum: ["table"] },
              title: { type: "string" },
              columns: {
                type: "array",
                items: { type: "string" },
                minItems: 1
              },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "metrics"],
            properties: {
              type: { type: "string", enum: ["metrics_grid"] },
              title: { type: "string" },
              metrics: {
                type: "array",
                items: {
                  type: "object",
                  required: ["label", "metric"],
                  properties: {
                    label: { type: "string" },
                    metric: {
                      type: "string",
                      enum: [
                        "count_distinct_users",
                        "count_events",
                        "avg_session_duration",
                        "daily_active_users",
                        "weekly_active_users",
                        "monthly_active_users"
                      ]
                    }
                  },
                  additionalProperties: false
                },
                minItems: 1
              },
              dateRange: dateRangeJsonSchema
            },
            additionalProperties: false
          }
        ]
      },
      minItems: 1
    }
  },
  required: ["reportName", "components"],
  additionalProperties: false
};

// ========================================
// TYPE INFERENCE
// ========================================

export type ComponentSchemaType = z.infer<typeof componentSchema>;
export type ReportConfigSchemaType = z.infer<typeof reportConfigSchema>;
