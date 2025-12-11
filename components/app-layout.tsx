'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderSidebar } from '@/components/folder-sidebar';
import { useSidebarRefresh } from '@/components/sidebar-refresh-context';
import { Report, Folder } from '@/lib/types';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { refreshKey } = useSidebarRefresh();

  const handleSelectReport = (report: Report) => {
    router.push(`/r/${report.id}`);
    setIsSidebarOpen(false);
  };

  const handleSelectFolder = (folder: Folder) => {
    router.push(`/f/${folder.id}`);
    setIsSidebarOpen(false);
  };

  const handleNavigateToChat = () => {
    router.push('/');
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - Persistent */}
      <div className="hidden lg:block">
        <FolderSidebar
          key={refreshKey}
          onSelectReport={handleSelectReport}
          onSelectFolder={handleSelectFolder}
          onNavigateToChat={handleNavigateToChat}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <FolderSidebar
            key={refreshKey}
            onSelectReport={handleSelectReport}
            onSelectFolder={handleSelectFolder}
            onNavigateToChat={handleNavigateToChat}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 overflow-y-auto">
        {/* Mobile Menu Button */}
        <div className="lg:hidden sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/60 shadow-sm">
          <div className="flex items-center gap-4 p-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">Analytics Reports</h1>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

