export interface Folder {
  id: string;
  name: string;
  created_at: string;
  order: number;
  icon?: string;
  color?: string;
}

export interface Report {
  id: string;
  folder_id: string | null;
  name: string;
  component_config: ComponentConfig;
  created_at: string;
  updated_at: string;
}

export interface ComponentConfig {
  components: Component[];
}

export type Component = KPIComponent | LineChartComponent | BarChartComponent | TableComponent | MetricsGridComponent | PieChartComponent | AreaChartComponent | DonutChartComponent | ScatterChartComponent | HorizontalBarChartComponent;

export type DateRange = 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'last_90_days' 
  | 'this_month' 
  | 'last_month'
  | { start: string; end: string };

export interface ComponentLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BaseComponent {
  type: 'kpi' | 'line_chart' | 'bar_chart' | 'table' | 'metrics_grid' | 'pie_chart' | 'area_chart' | 'donut_chart' | 'scatter_chart' | 'horizontal_bar_chart';
  title: string;
  dateRange?: DateRange;
  filters?: Filter[];
  layout?: ComponentLayout;
}

export interface KPIComponent extends BaseComponent {
  type: 'kpi';
  query: string;
  value?: number | string;
}

export interface LineChartComponent extends BaseComponent {
  type: 'line_chart';
  query: string;
  xAxis?: string;
  yAxis?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface BarChartComponent extends BaseComponent {
  type: 'bar_chart';
  query: string;
  xAxis?: string;
  yAxis?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface TableComponent extends BaseComponent {
  type: 'table';
  columns: string[];
  query: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface MetricsGridComponent extends BaseComponent {
  type: 'metrics_grid';
  metrics: { label: string; query: string; value?: number | string }[];
}

export interface PieChartComponent extends BaseComponent {
  type: 'pie_chart';
  query: string;
  valueKey?: string;
  nameKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface AreaChartComponent extends BaseComponent {
  type: 'area_chart';
  query: string;
  xAxis?: string;
  yAxis?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface DonutChartComponent extends BaseComponent {
  type: 'donut_chart';
  query: string;
  valueKey?: string;
  nameKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface ScatterChartComponent extends BaseComponent {
  type: 'scatter_chart';
  query: string;
  xAxis?: string;
  yAxis?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface HorizontalBarChartComponent extends BaseComponent {
  type: 'horizontal_bar_chart';
  query: string;
  xAxis?: string;
  yAxis?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: { [key: string]: any }[];
}

export interface Filter {
  field: string;
  operator: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
