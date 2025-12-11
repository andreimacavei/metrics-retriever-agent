'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Folder, Report } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FolderPlus, FileText, User, Settings, Crown, Moon, Sun, Monitor, ChevronRight,
  FolderOpen, Briefcase, Archive, Star, Heart, Bookmark, Box, Layers, Package,
  Target, Zap, Trophy, Rocket, Shield, Flag, Calendar, Clock, Bell, Mail, Users, Home,
  Database, Code, Terminal, Globe, Lock, Key, Settings as SettingsIcon, Wrench, PanelLeftClose, PanelLeft, Search, Plus
} from 'lucide-react';

const FOLDER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder: FolderOpen,
  Briefcase,
  Archive,
  Star,
  Heart,
  Bookmark,
  Box,
  Layers,
  Package,
  Target,
  Zap,
  Trophy,
  Rocket,
  Shield,
  Flag,
  Calendar,
  Clock,
  Bell,
  Mail,
  Users,
  Home,
  Database,
  Code,
  Terminal,
  Globe,
  Lock,
  Key,
  Settings: SettingsIcon,
  Wrench,
};
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useTheme } from 'next-themes';

interface FolderSidebarProps {
  onSelectReport: (report: Report) => void;
  onSelectFolder: (folder: Folder) => void;
  selectedReportId?: string;
  onNavigateToChat?: () => void;
}

function DraggableReport({
  report,
  isSelected,
  onSelect,
}: {
  report: Report;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: report.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3.5 px-4 py-3 rounded-md cursor-pointer hover:bg-accent/80 hover:shadow-sm transition-all duration-200 ${
        isSelected ? 'bg-accent shadow-md border border-primary/20' : ''
      }`}
      onClick={onSelect}
    >
      <FileText className="w-5 h-5 flex-shrink-0 text-primary/70" />
      <span className="text-base truncate font-medium">{report.name}</span>
    </div>
  );
}

function UncategorizedDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: 'uncategorized',
  });

  return <div ref={setNodeRef}>{children}</div>;
}

function DraggableFolder({
  folder,
  reports,
  selectedReportId,
  onSelectReport,
  onSelectFolder,
}: {
  folder: Folder;
  reports: Report[];
  selectedReportId?: string;
  onSelectReport: (report: Report) => void;
  onSelectFolder: (folder: Folder) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = folder.icon ? FOLDER_ICON_MAP[folder.icon] || FolderOpen : FolderOpen;

  return (
    <div ref={setNodeRef} style={style} className="mb-6" data-folder-id={folder.id}>
      <div className="flex items-center gap-2.5 group">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1.5 hover:bg-accent/70 rounded-md transition-colors"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        <div
          className="flex-1 flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/70 hover:shadow-sm rounded-md transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            onSelectFolder(folder);
          }}
        >
          <div
            {...attributes}
            {...listeners}
            className="cursor-move p-1 -m-1 hover:bg-accent/50 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon 
              className="w-5 h-5" 
              style={folder.color ? { color: folder.color } : undefined}
            />
          </div>
          <span className="text-base font-semibold tracking-tight">{folder.name}</span>
        </div>
      </div>
      {isExpanded && (
        <div className="ml-6 mt-2 space-y-1.5">
          {reports.map((report) => (
            <DraggableReport
              key={report.id}
              report={report}
              isSelected={selectedReportId === report.id}
              onSelect={() => onSelectReport(report)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderSidebar({ onSelectReport, onSelectFolder, selectedReportId, onNavigateToChat }: FolderSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, setTheme } = useTheme();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadFolders();
    loadReports();
  }, []);

  const loadFolders = async () => {
    const { data } = await supabase
      .from('folders')
      .select('*')
      .order('order', { ascending: true });

    if (data) setFolders(data);
  };

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setReports(data);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    const { data } = await supabase
      .from('folders')
      .insert([{ name: newFolderName, order: folders.length }])
      .select();

    if (data) {
      setFolders([...folders, ...data]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };


  const moveReportToFolder = async (reportId: string, folderId: string | null) => {
    const { error } = await supabase
      .from('reports')
      .update({ folder_id: folderId })
      .eq('id', reportId);

    if (!error) {
      setReports(
        reports.map((r) => (r.id === reportId ? { ...r, folder_id: folderId } : r))
      );
    }
  };

  const updateFolderOrder = async (reorderedFolders: Folder[]) => {
    // Update local state immediately
    setFolders(reorderedFolders);

    // Update database
    const updates = reorderedFolders.map((folder, index) => 
      supabase
        .from('folders')
        .update({ order: index })
        .eq('id', folder.id)
    );

    await Promise.all(updates);
  };

  const getFilteredData = () => {
    if (!searchQuery.trim()) {
      return { folders, reports };
    }

    const query = searchQuery.toLowerCase();
    const filteredReports: Report[] = [];
    const matchingFolderIds = new Set<string>();

    // Find matching reports
    reports.forEach(report => {
      if (report.name.toLowerCase().includes(query)) {
        filteredReports.push(report);
        if (report.folder_id) {
          matchingFolderIds.add(report.folder_id);
        }
      }
    });

    // Find matching folders and include all their reports
    const filteredFolders = folders.filter(folder => {
      const folderMatches = folder.name.toLowerCase().includes(query);
      if (folderMatches) {
        matchingFolderIds.add(folder.id);
        // Add all reports from this folder
        reports.forEach(report => {
          if (report.folder_id === folder.id && !filteredReports.find(r => r.id === report.id)) {
            filteredReports.push(report);
          }
        });
      }
      return folderMatches || matchingFolderIds.has(folder.id);
    });

    return { folders: filteredFolders, reports: filteredReports };
  };

  const { folders: filteredFolders, reports: filteredReports } = getFilteredData();

  const handleDragStart = (event: DragStartEvent) => {
    const report = reports.find((r) => r.id === event.active.id);
    const folder = folders.find((f) => f.id === event.active.id);
    
    setActiveReport(report || null);
    setActiveFolder(folder || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveReport(null);
      setActiveFolder(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle folder reordering
    const activeFolder = folders.find(f => f.id === activeId);
    const overFolder = folders.find(f => f.id === overId);
    
    if (activeFolder && overFolder && activeId !== overId) {
      const oldIndex = folders.findIndex(f => f.id === activeId);
      const newIndex = folders.findIndex(f => f.id === overId);
      const reorderedFolders = arrayMove(folders, oldIndex, newIndex);
      updateFolderOrder(reorderedFolders);
      setActiveFolder(null);
      return;
    }

    // Handle report dragging
    const reportId = activeId;
    setActiveReport(null);
    setActiveFolder(null);

    // Skip if it's a sortable placeholder
    if (overId === 'Sortable' || overId.startsWith('Sortable')) {
      return;
    }

    // If dropped on another report, find its parent folder
    const droppedOnReport = reports.find(r => r.id === overId);
    if (droppedOnReport) {
      moveReportToFolder(reportId, droppedOnReport.folder_id);
      return;
    }

    // Check if dropped directly on a folder
    const isFolder = folders.some(f => f.id === overId);
    if (isFolder) {
      moveReportToFolder(reportId, overId);
      return;
    }

    // Check if dropped on uncategorized area
    if (overId === 'uncategorized') {
      moveReportToFolder(reportId, null);
      return;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`border-r border-border/60 h-screen flex flex-col sticky top-0 left-0 bg-muted/50 backdrop-blur-xl transition-all duration-300 shadow-sm ${isCollapsed ? 'w-16' : 'w-80'}`}>
        {!isCollapsed ? (
          <>
            {/* Header with collapse button */}
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Reports</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
                className="flex-shrink-0"
              >
                <PanelLeftClose className="w-5 h-5" />
              </Button>
            </div>

            {/* Action buttons */}
            <div className="px-5 py-4 border-b border-border/50 space-y-2.5">
              <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                    />
                    <Button onClick={createFolder} className="w-full">
                      Create Folder
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  if (onNavigateToChat) {
                    onNavigateToChat();
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Report
              </Button>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="px-3 py-3 border-b border-border/40 flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="flex-shrink-0"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {!isCollapsed && (
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-5 py-4">
              {/* Uncategorized reports */}
              {filteredReports.filter(r => !r.folder_id).length > 0 && (
                <UncategorizedDroppable>
                  <div className="mb-6">
                    <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Uncategorized
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {filteredReports.filter(r => !r.folder_id).map((report) => (
                        <DraggableReport
                          key={report.id}
                          report={report}
                          isSelected={selectedReportId === report.id}
                          onSelect={() => onSelectReport(report)}
                        />
                      ))}
                    </div>
                  </div>
                </UncategorizedDroppable>
              )}

              {/* Folders with reports */}
              <SortableContext items={filteredFolders.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {filteredFolders.map((folder) => {
                  const folderReports = filteredReports.filter(r => r.folder_id === folder.id);
                  if (folderReports.length === 0 && searchQuery) return null;
                  return (
                    <DraggableFolder
                      key={folder.id}
                      folder={folder}
                      reports={folderReports}
                      selectedReportId={selectedReportId}
                      onSelectReport={onSelectReport}
                      onSelectFolder={onSelectFolder}
                    />
                  );
                })}
              </SortableContext>
            </div>
          </ScrollArea>
        )}

        {/* Spacer to push account section to bottom when collapsed */}
        {isCollapsed && <div className="flex-1" />}

        {/* Account Section */}
        <div className={`border-t border-border/60 bg-muted/70 shadow-inner ${isCollapsed ? 'px-3 py-5' : 'px-5 py-5'}`}>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`w-full flex items-center rounded-lg hover:bg-accent/70 hover:shadow-md transition-all duration-200 ${
              isCollapsed ? 'justify-center p-2' : 'gap-3.5 p-3.5'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-primary-foreground shadow-md">
              <User className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">John Doe</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Crown className="w-3.5 h-3.5 text-yellow-500/80" />
                    Pro Plan
                  </div>
                </div>
                <Settings className="w-5 h-5 text-muted-foreground" />
              </>
            )}
          </button>
        </div>

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Account Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Profile Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Profile</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-medium">John Doe</div>
                    <div className="text-sm text-muted-foreground">
                      john.doe@example.com
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Plan Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Subscription</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <div>
                      <div className="font-medium">Pro Plan</div>
                      <div className="text-xs text-muted-foreground">
                        Unlimited reports
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Settings Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Preferences</h3>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    General Settings
                  </Button>

                  {/* Theme Options */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2">Theme</p>
                    <Button
                      variant={theme === 'light' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      size="sm"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      size="sm"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      size="sm"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    size="sm"
                  >
                    Notifications
                  </Button>
                </div>
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-600"
              >
                Sign Out
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DragOverlay>
        {activeReport ? (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-accent rounded-lg shadow-lg">
            <FileText className="w-5 h-5" />
            <span className="text-base font-medium">{activeReport.name}</span>
          </div>
        ) : activeFolder ? (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-accent rounded-md shadow-lg">
            {(() => {
              const Icon = activeFolder.icon ? FOLDER_ICON_MAP[activeFolder.icon] || FolderOpen : FolderOpen;
              return <Icon className="w-5 h-5" style={activeFolder.color ? { color: activeFolder.color } : undefined} />;
            })()}
            <span className="text-base font-semibold tracking-tight">{activeFolder.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
