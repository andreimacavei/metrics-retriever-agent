'use client';

import { useEffect, useState, useRef } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import { Report, Component, DateRange, ComponentLayout } from '@/lib/types';
import { useSidebarRefresh } from '@/components/sidebar-refresh-context';
import { KPICard } from './visualizations/kpi-card';
import { LineChartVisualization } from './visualizations/line-chart';
import { BarChartVisualization } from './visualizations/bar-chart';
import { DataTable } from './visualizations/data-table';
import { MetricsGrid } from './visualizations/metrics-grid';
import { PieChartVisualization } from './visualizations/pie-chart';
import { AreaChartVisualization } from './visualizations/area-chart';
import { DonutChartVisualization } from './visualizations/donut-chart';
import { ScatterChartVisualization } from './visualizations/scatter-chart';
import { HorizontalBarChartVisualization } from './visualizations/horizontal-bar-chart';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { RefreshCw, Filter, MoreHorizontal, Trash2, Calendar, Pencil } from 'lucide-react';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface ReportViewerProps {
  report: Report;
  onReportDeleted?: () => void;
}

// Helper function to format date range for display
const formatDateRange = (dateRange: string | { start: string; end: string } | undefined): string => {
  if (!dateRange) return 'N/A';
  
  if (typeof dateRange === 'string') {
    return dateRange.replace(/_/g, ' ');
  }
  
  if (typeof dateRange === 'object' && 'start' in dateRange && 'end' in dateRange) {
    return `${dateRange.start} to ${dateRange.end}`;
  }
  
  return 'N/A';
};

// Get default layout size based on component type
const getDefaultLayoutForType = (type: Component['type']): { w: number; h: number } => {
  switch (type) {
    case 'kpi':
      return { w: 1, h: 1 };
    case 'metrics_grid':
      return { w: 4, h: 1 };
    case 'table':
      return { w: 4, h: 2 };
    case 'line_chart':
    case 'bar_chart':
    case 'area_chart':
    case 'pie_chart':
    case 'donut_chart':
    case 'scatter_chart':
    case 'horizontal_bar_chart':
      return { w: 2, h: 2 };
    default:
      return { w: 2, h: 2 };
  }
};

// Grid configuration
const ROW_HEIGHT = 200;

export function ReportViewer({ report, onReportDeleted }: ReportViewerProps) {
  const { refreshSidebar } = useSidebarRefresh();
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRangeType, setDateRangeType] = useState<'predefined' | 'custom'>('predefined');
  const [predefinedRange, setPredefinedRange] = useState<string>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [reportName, setReportName] = useState(report.name);
  const layoutSaveRef = useRef<Component[]>([]);
  const [editingChartIndex, setEditingChartIndex] = useState<number | null>(null);
  const [editingChartTitle, setEditingChartTitle] = useState('');
  const { containerRef: gridContainerRef, width: containerWidth } = useContainerWidth();

  // Generate layouts from components
  const generateLayouts = (comps: Component[]): LayoutItem[] => {
    let currentX = 0;
    let currentY = 0;
    
    return comps.map((comp, index) => {
      const defaultSize = getDefaultLayoutForType(comp.type);
      const layout = comp.layout || { x: 0, y: 0, ...defaultSize };
      
      // If no stored layout, calculate position automatically
      if (!comp.layout) {
        // Check if component fits on current row
        if (currentX + defaultSize.w > 4) {
          currentX = 0;
          currentY += 2; // Move to next row
        }
        layout.x = currentX;
        layout.y = currentY;
        currentX += defaultSize.w;
      }
      
      return {
        i: String(index),
        x: layout.x,
        y: layout.y,
        w: layout.w,
        h: layout.h,
        minW: 1,
        minH: 1,
      };
    });
  };

  // Save layout to database immediately
  const saveLayoutToDatabase = async (newLayouts: LayoutItem[]) => {
    const updatedComponents = layoutSaveRef.current.map((comp, index) => {
      const layoutItem = newLayouts.find(l => l.i === String(index));
      if (layoutItem) {
        return {
          ...comp,
          layout: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          } as ComponentLayout,
        };
      }
      return comp;
    });

    await supabase
      .from('reports')
      .update({
        component_config: { components: updatedComponents },
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);
  };

  // Handle layout change - save immediately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = (currentLayout: any) => {
    if (Array.isArray(currentLayout)) {
      saveLayoutToDatabase(currentLayout as LayoutItem[]);
    }
  };

  // Get the actual date range value to use in queries
  const getDateRange = (): DateRange => {
    if (dateRangeType === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    return predefinedRange as DateRange;
  };

  useEffect(() => {
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, dateRangeType, predefinedRange, customStartDate, customEndDate]);

  useEffect(() => {
    setReportName(report.name);
  }, [report.name]);

  const updateReportName = async () => {
    if (!reportName.trim() || reportName === report.name) {
      setIsEditingName(false);
      return;
    }

    const { error } = await supabase
      .from('reports')
      .update({ name: reportName, updated_at: new Date().toISOString() })
      .eq('id', report.id);

    if (!error) {
      setIsEditingName(false);
      refreshSidebar();
    }
  };

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      // Update components with the selected date range
      const currentDateRange = getDateRange();
      const componentsWithDateRange = report.component_config.components.map(comp => ({
        ...comp,
        dateRange: currentDateRange,
      }));

      const response = await fetch('/api/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ components: componentsWithDateRange }),
      });

      const data = await response.json();
      if (data.components) {
        // Preserve layout from original report config
        const componentsWithLayout = data.components.map((comp: Component, index: number) => ({
          ...comp,
          layout: report.component_config.components[index]?.layout,
        }));
        setComponents(componentsWithLayout);
        layoutSaveRef.current = componentsWithLayout;
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReportSettings = async () => {
    // Save updated report configuration to database
    const { error } = await supabase
      .from('reports')
      .update({
        component_config: { components: report.component_config.components },
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    if (!error) {
      setIsSettingsOpen(false);
    }
  };

  const deleteReport = async () => {
    const { error } = await supabase.from('reports').delete().eq('id', report.id);

    if (!error) {
      setIsDeleteDialogOpen(false);
      setIsSettingsOpen(false);
      refreshSidebar();
      onReportDeleted?.();
    }
  };

  const renderComponent = (component: Component) => {
    switch (component.type) {
      case 'kpi':
        return <KPICard component={component} />;
      case 'line_chart':
        return <LineChartVisualization component={component} />;
      case 'bar_chart':
        return <BarChartVisualization component={component} />;
      case 'table':
        return <DataTable component={component} />;
      case 'metrics_grid':
        return <MetricsGrid component={component} />;
      case 'pie_chart':
        return <PieChartVisualization component={component} />;
      case 'area_chart':
        return <AreaChartVisualization component={component} />;
      case 'donut_chart':
        return <DonutChartVisualization component={component} />;
      case 'scatter_chart':
        return <ScatterChartVisualization component={component} />;
      case 'horizontal_bar_chart':
        return <HorizontalBarChartVisualization component={component} />;
      default:
        return null;
    }
  };

  const startRenameChart = (index: number, title: string) => {
    setEditingChartIndex(index);
    setEditingChartTitle(title);
  };

  const saveChartTitle = async () => {
    if (editingChartIndex === null) return;
    const newTitle = editingChartTitle.trim();
    if (!newTitle) {
      setEditingChartIndex(null);
      return;
    }

    const currentTitle = components[editingChartIndex]?.title;
    const response = await fetch('/api/report-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'rename_chart',
        reportId: report.id,
        title: currentTitle,
        newTitle
      })
    });

    if (response.ok) {
      const updatedComponents = components.map((comp, idx) =>
        idx === editingChartIndex ? { ...comp, title: newTitle } : comp
      );
      setComponents(updatedComponents);
      layoutSaveRef.current = updatedComponents;
    }

    setEditingChartIndex(null);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-5">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              onBlur={updateReportName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateReportName();
                if (e.key === 'Escape') {
                  setReportName(report.name);
                  setIsEditingName(false);
                }
              }}
              className="text-2xl md:text-3xl font-bold h-auto py-2 px-3 border-0 shadow-none focus-visible:ring-2"
              autoFocus
            />
          ) : (
            <h1 
              className="text-2xl md:text-3xl font-bold tracking-tight truncate cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              {report.name}
            </h1>
          )}
          <p className="text-sm text-muted-foreground mt-1.5">
            Created {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 overflow-x-auto">
          {dateRangeType === 'predefined' ? (
            <Select value={predefinedRange} onValueChange={setPredefinedRange}>
              <SelectTrigger className="w-[140px] md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Last 7 days</SelectItem>
                <SelectItem value="last_30_days">Last 30 days</SelectItem>
                <SelectItem value="last_90_days">Last 90 days</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_month">Last month</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[140px]"
              />
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDateRangeType(dateRangeType === 'predefined' ? 'custom' : 'predefined')}
            title={dateRangeType === 'predefined' ? 'Switch to custom dates' : 'Switch to predefined ranges'}
          >
            <Calendar className="w-4 h-4" />
          </Button>
          <Button onClick={loadReportData} disabled={isLoading} variant="outline" className="hidden md:flex">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={loadReportData} disabled={isLoading} variant="outline" size="icon" className="md:hidden">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                Rename Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                View Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div ref={gridContainerRef}>
        {components.length > 0 && containerWidth > 0 ? (
          <Responsive
            className="layout"
            width={containerWidth}
            layouts={{ lg: generateLayouts(components), md: generateLayouts(components), sm: generateLayouts(components) }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
            rowHeight={ROW_HEIGHT}
            margin={[16, 16] as const}
            dragConfig={{ enabled: true, handle: '.drag-handle', bounded: false, threshold: 3 }}
            onLayoutChange={handleLayoutChange}
          >
            {components.map((component, index) => (
              <div key={String(index)} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="drag-handle cursor-move h-2 bg-muted/50 hover:bg-muted transition-colors" />
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                  {editingChartIndex === index ? (
                    <Input
                      value={editingChartTitle}
                      onChange={(e) => setEditingChartTitle(e.target.value)}
                      onBlur={saveChartTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveChartTitle();
                        if (e.key === 'Escape') setEditingChartIndex(null);
                      }}
                      className="h-9 text-sm"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="text-sm font-semibold truncate">{component.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startRenameChart(index, component.title)}
                        title="Rename chart"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="h-[calc(100%-8px-44px)] overflow-auto">
                  {renderComponent(component)}
                </div>
              </div>
            ))}
          </Responsive>
        ) : (
          !isLoading && components.length === 0 && (
            <div className="text-center py-12 md:py-16 text-base md:text-lg text-muted-foreground">
              No components to display
            </div>
          )
        )}
      </div>

      {/* Report Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Report Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Report Information</h3>
              <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/50">
                <div>
                  <div className="text-xs text-muted-foreground">Report Name</div>
                  <div className="text-sm font-medium">{report.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-sm">{new Date(report.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Updated</div>
                  <div className="text-sm">{new Date(report.updated_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Components</div>
                  <div className="text-sm">{report.component_config.components.length}</div>
                </div>
              </div>
            </div>

            {/* Component Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Components</h3>
              <div className="space-y-2">
                {report.component_config.components.map((comp, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{comp.title}</div>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {comp.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {comp.dateRange && (
                        <div>Date Range: {formatDateRange(comp.dateRange)}</div>
                      )}
                      {'query' in comp && <div>Query: {comp.query}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Raw Configuration (JSON)</h3>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(report.component_config, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsSettingsOpen(false)}>
                Close
              </Button>
              <Button className="flex-1" onClick={saveReportSettings}>
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{report.name}</span>?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteReport}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
