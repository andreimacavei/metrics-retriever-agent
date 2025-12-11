'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { useReportContext } from '@/components/report-context';
import { Report } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const { setReportContext } = useReportContext();

  // Clear report context when on home page
  useEffect(() => {
    setReportContext(null, []);
  }, [setReportContext]);

  const handleReportGenerated = async (reportName: string, config: Report['component_config']) => {
    const { data } = await supabase
      .from('reports')
      .insert([
        {
          name: reportName,
          component_config: config,
          folder_id: null,
        },
      ])
      .select()
      .single();

    if (data) {
      router.push(`/r/${data.id}`);
    }
  };

  return <ChatInterface onReportGenerated={handleReportGenerated} />;
}
