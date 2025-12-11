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
  query: z.string().min(1, 'SQL query is required')
});

export const lineChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('line_chart'),
  query: z.string().min(1, 'SQL query is required')
});

export const barChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('bar_chart'),
  query: z.string().min(1, 'SQL query is required')
});

export const tableComponentSchema = baseComponentSchema.extend({
  type: z.literal('table'),
  columns: z.array(z.string().min(1)).min(1, 'At least one column is required'),
  query: z.string().min(1, 'SQL query is required')
});

export const metricsGridComponentSchema = baseComponentSchema.extend({
  type: z.literal('metrics_grid'),
  metrics: z.array(z.object({
    label: z.string().min(1, 'Label is required'),
    query: z.string().min(1, 'SQL query is required')
  })).min(1, 'At least one metric is required')
});

export const pieChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('pie_chart'),
  query: z.string().min(1, 'SQL query is required')
});

export const areaChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('area_chart'),
  query: z.string().min(1, 'SQL query is required')
});

export const donutChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('donut_chart'),
  query: z.string().min(1, 'SQL query is required')
});

export const scatterChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('scatter_chart'),
  query: z.string().min(1, 'SQL query is required')
});

export const horizontalBarChartComponentSchema = baseComponentSchema.extend({
  type: z.literal('horizontal_bar_chart'),
  query: z.string().min(1, 'SQL query is required')
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
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["kpi"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns a single row with a 'value' column" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["line_chart"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns rows with 'date' and 'value' columns" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["bar_chart"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns rows with 'label' and 'value' columns" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["area_chart"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns rows with 'date' and 'value' columns" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["scatter_chart"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns rows with 'x' and 'y' columns" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["horizontal_bar_chart"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns rows with 'label' and 'value' columns" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["pie_chart"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns rows with 'name' and 'value' columns" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "query"],
            properties: {
              type: { type: "string", enum: ["donut_chart"] },
              title: { type: "string" },
              query: { type: "string", description: "SQL query that returns rows with 'name' and 'value' columns" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["type", "title", "columns", "query"],
            properties: {
              type: { type: "string", enum: ["table"] },
              title: { type: "string" },
              columns: {
                type: "array",
                items: { type: "string" },
                minItems: 1
              },
              query: { type: "string", description: "SQL query that returns rows with columns matching the columns array" }
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
                  required: ["label", "query"],
                  properties: {
                    label: { type: "string" },
                    query: { type: "string", description: "SQL query that returns a single row with a 'value' column" }
                  },
                  additionalProperties: false
                },
                minItems: 1
              }
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
