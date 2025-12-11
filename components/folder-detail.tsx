'use client';

import { useState, useEffect } from 'react';
import { Folder, Report } from '@/lib/types';
import { useSidebarRefresh } from '@/components/sidebar-refresh-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  FileText, MoreHorizontal, Trash2, FolderOpen, Briefcase, Archive, Star, Heart, Bookmark, Box, Layers, Package,
  Target, Zap, Trophy, Rocket, Shield, Flag, Calendar, Clock, Bell, Mail, Users, Home,
  Database, Code, Terminal, Globe, Lock, Key, Settings as SettingsIcon, Wrench
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

const FOLDER_ICONS = [
  { name: 'Folder', icon: FolderOpen },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Archive', icon: Archive },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Box', icon: Box },
  { name: 'Layers', icon: Layers },
  { name: 'Package', icon: Package },
  { name: 'Target', icon: Target },
  { name: 'Zap', icon: Zap },
  { name: 'Trophy', icon: Trophy },
  { name: 'Rocket', icon: Rocket },
  { name: 'Shield', icon: Shield },
  { name: 'Flag', icon: Flag },
  { name: 'Calendar', icon: Calendar },
  { name: 'Clock', icon: Clock },
  { name: 'Bell', icon: Bell },
  { name: 'Mail', icon: Mail },
  { name: 'Users', icon: Users },
  { name: 'Home', icon: Home },
  { name: 'Database', icon: Database },
  { name: 'Code', icon: Code },
  { name: 'Terminal', icon: Terminal },
  { name: 'Globe', icon: Globe },
  { name: 'Lock', icon: Lock },
  { name: 'Key', icon: Key },
  { name: 'Settings', icon: SettingsIcon },
  { name: 'Wrench', icon: Wrench },
];

const FOLDER_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
];

interface FolderDetailProps {
  folder: Folder;
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onFolderDeleted: () => void;
  onFolderUpdated: (folder: Folder) => void;
}

export function FolderDetail({
  folder,
  reports,
  onSelectReport,
  onFolderDeleted,
  onFolderUpdated,
}: FolderDetailProps) {
  const { refreshSidebar } = useSidebarRefresh();
  const [isEditingName, setIsEditingName] = useState(false);
  const [folderName, setFolderName] = useState(folder.name);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setFolderName(folder.name);
  }, [folder.name]);

  const updateFolderName = async () => {
    if (!folderName.trim() || folderName === folder.name) {
      setIsEditingName(false);
      return;
    }

    const { data, error } = await supabase
      .from('folders')
      .update({ name: folderName })
      .eq('id', folder.id)
      .select()
      .single();

    if (data && !error) {
      onFolderUpdated(data);
      setIsEditingName(false);
      refreshSidebar();
    }
  };

  const deleteFolder = async () => {
    const { error } = await supabase.from('folders').delete().eq('id', folder.id);

    if (!error) {
      setIsDeleteDialogOpen(false);
      refreshSidebar();
      onFolderDeleted();
    }
  };

  const updateFolderIcon = async (iconName: string) => {
    const { data, error } = await supabase
      .from('folders')
      .update({ icon: iconName })
      .eq('id', folder.id)
      .select()
      .single();

    if (data && !error) {
      onFolderUpdated(data);
      setIsIconPickerOpen(false);
      refreshSidebar();
    }
  };

  const updateFolderColor = async (color: string) => {
    const { data, error } = await supabase
      .from('folders')
      .update({ color: color })
      .eq('id', folder.id)
      .select()
      .single();

    if (data && !error) {
      onFolderUpdated(data);
      setIsColorPickerOpen(false);
      refreshSidebar();
    }
  };

  const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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

  const FolderIconComponent = folder.icon ? ICON_MAP[folder.icon] || FolderOpen : FolderOpen;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 md:mb-10 gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <FolderIconComponent 
            className="w-9 h-9 md:w-10 md:h-10 flex-shrink-0" 
            style={folder.color ? { color: folder.color } : undefined}
          />
          {isEditingName ? (
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onBlur={updateFolderName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateFolderName();
                if (e.key === 'Escape') {
                  setFolderName(folder.name);
                  setIsEditingName(false);
                }
              }}
              className="text-2xl md:text-4xl font-bold h-auto py-2.5 px-4 border-0 shadow-none focus-visible:ring-2"
              autoFocus
            />
          ) : (
            <h1
              className="text-2xl md:text-4xl font-bold tracking-tight cursor-pointer hover:text-muted-foreground transition-colors truncate"
              onClick={() => setIsEditingName(true)}
            >
              {folder.name}
            </h1>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditingName(true)}>
              Rename Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsIconPickerOpen(true)}>
              Change Icon
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsColorPickerOpen(true)}>
              Change Color
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon Picker Dialog */}
      <Dialog open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Folder Icon</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 md:grid-cols-6 gap-2 py-4">
            {FOLDER_ICONS.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => updateFolderIcon(name)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:border-primary hover:bg-accent/50 ${
                  folder.icon === name ? 'border-primary bg-accent' : 'border-border'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium text-center leading-tight">{name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Color Picker Dialog */}
      <Dialog open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Folder Color</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-2 py-4">
            {FOLDER_COLORS.map(({ name, value }) => (
              <button
                key={name}
                onClick={() => updateFolderColor(value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:border-primary hover:scale-105 ${
                  folder.color === value ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
                title={name}
              >
                {value ? (
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: value }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-border bg-background" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{folder.name}</span>?
            </p>
            <p className="text-sm text-muted-foreground">
              All reports in this folder will be moved to Uncategorized.
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
                onClick={deleteFolder}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-muted-foreground">
            {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
          </h2>
        </div>
        {reports.length === 0 ? (
          <div className="text-center py-16 md:py-20 px-6 border-2 border-dashed border-border/60 rounded-lg bg-muted/30">
            <FileText className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-4 md:mb-5 text-muted-foreground/50" />
            <p className="text-base md:text-lg text-muted-foreground font-medium mb-1.5">No reports in this folder</p>
            <p className="text-sm md:text-base text-muted-foreground/70">Drag reports here to organize them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="group p-5 md:p-6 border border-border/60 rounded-lg hover:border-border hover:shadow-lg hover:bg-card/50 hover:scale-[1.02] cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-all flex-shrink-0">
                    <FileText className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold truncate mb-1.5 group-hover:text-primary transition-colors">
                      {report.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Updated {new Date(report.updated_at).toLocaleDateString()}
                    </p>
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-sm text-muted-foreground">
                        {report.component_config.components.length} components
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
