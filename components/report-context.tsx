'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Component } from '@/lib/types';

interface ReportContextValue {
  reportId: string | null;
  components: Component[];
  setReportContext: (reportId: string | null, components: Component[]) => void;
}

const ReportContext = createContext<ReportContextValue | undefined>(undefined);

export function ReportContextProvider({ children }: { children: ReactNode }) {
  const [reportId, setReportId] = useState<string | null>(null);
  const [components, setComponents] = useState<Component[]>([]);

  const setReportContext = useCallback((id: string | null, comps: Component[]) => {
    setReportId(id);
    setComponents(comps);
  }, []);

  return (
    <ReportContext.Provider value={{ reportId, components, setReportContext }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReportContext() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    // Return default values if context is not available (shouldn't happen, but safe fallback)
    return { reportId: null, components: [], setReportContext: () => {} };
  }
  return context;
}

