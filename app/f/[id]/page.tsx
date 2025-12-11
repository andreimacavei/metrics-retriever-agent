'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FolderDetail } from '@/components/folder-detail';
import { Report, Folder } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function FolderPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.id as string;
  
  const [folder, setFolder] = useState<Folder | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadFolder = async () => {
    const { data } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .single();
    
    if (data) {
      setFolder(data);
    } else {
      router.push('/');
    }
  };

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setReports(data);
    }
  };

  useEffect(() => {
    loadFolder();
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, refreshKey]);

  const handleSelectReport = (report: Report) => {
    router.push(`/r/${report.id}`);
  };

  const handleFolderDeleted = () => {
    router.push('/');
  };

  const handleFolderUpdated = (updatedFolder: Folder) => {
    setFolder(updatedFolder);
    setRefreshKey(prev => prev + 1);
  };

  if (!folder) {
    return null;
  }

  return (
    <FolderDetail
      folder={folder}
      reports={reports}
      onSelectReport={handleSelectReport}
      onFolderDeleted={handleFolderDeleted}
      onFolderUpdated={handleFolderUpdated}
    />
  );
}

