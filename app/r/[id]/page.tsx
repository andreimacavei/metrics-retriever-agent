'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReportViewer } from '@/components/report-viewer';
import { useReportContext } from '@/components/report-context';
import { Report, Component } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const { setReportContext } = useReportContext();
  
  const [report, setReport] = useState<Report | null>(null);

  const loadReport = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (data) {
      setReport(data);
      // Update report context for VoiceFab
      setReportContext(reportId, data.component_config.components);
    } else {
      setReportContext(null, []);
      router.push('/');
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  // Listen for report modifications
  useEffect(() => {
    if (!report) return;

    const handleReportModified = async (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.reportId !== reportId) return;

      const updatedComponents = detail.components as Component[];

      // Update report in database
      const { error } = await supabase
        .from('reports')
        .update({
          component_config: { components: updatedComponents },
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (!error) {
        // Update local state
        const updatedReport = {
          ...report,
          component_config: { components: updatedComponents },
          updated_at: new Date().toISOString()
        };
        setReport(updatedReport);
        // Update report context
        setReportContext(reportId, updatedComponents);
      } else {
        console.error('Error updating report:', error);
      }
    };

    window.addEventListener('report-modified', handleReportModified as EventListener);
    return () => window.removeEventListener('report-modified', handleReportModified as EventListener);
  }, [report, reportId]);

  const handleReportDeleted = () => {
    setReportContext(null, []);
    router.push('/');
  };

  const handleComponentsUpdated = (updatedComponents: Component[]) => {
    if (!report) return;
    setReport({
      ...report,
      component_config: { components: updatedComponents }
    });
  };

  if (!report) {
    return null;
  }

  return (
    <ReportViewer
      report={report}
      onReportDeleted={handleReportDeleted}
      onComponentsUpdated={handleComponentsUpdated}
    />
  );
}

