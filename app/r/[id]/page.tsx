'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReportViewer } from '@/components/report-viewer';
import { Report } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);

  const loadReport = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (data) {
      setReport(data);
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const handleReportDeleted = () => {
    router.push('/');
  };

  if (!report) {
    return null;
  }

  return (
    <ReportViewer
      report={report}
      onReportDeleted={handleReportDeleted}
    />
  );
}

