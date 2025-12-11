'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SidebarRefreshContextType {
  refreshKey: number;
  refreshSidebar: () => void;
}

const SidebarRefreshContext = createContext<SidebarRefreshContextType | undefined>(undefined);

export function SidebarRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshSidebar = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <SidebarRefreshContext.Provider value={{ refreshKey, refreshSidebar }}>
      {children}
    </SidebarRefreshContext.Provider>
  );
}

export function useSidebarRefresh() {
  const context = useContext(SidebarRefreshContext);
  if (context === undefined) {
    throw new Error('useSidebarRefresh must be used within a SidebarRefreshProvider');
  }
  return context;
}

