'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { api, AuthConfiguration, AuthType } from '@/lib/api';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ShieldCheck, KeyRound, Globe, Settings2, Key, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EditAuthConfigDialog } from '@/components/common/edit-auth-config-dialog';

interface AuthConfigListProps {
  initialConfigs: AuthConfiguration[];
}

const authTypeLabels: Record<AuthType, string> = {
  none: 'No Auth',
  basic: 'Basic',
  oauth2: 'OAuth 2.0',
  api_key: 'API Key',
  custom: 'Custom',
};

const authTypeIcons: Record<AuthType, React.ReactNode> = {
  none: <Globe className="h-3.5 w-3.5" />,
  basic: <KeyRound className="h-3.5 w-3.5" />,
  oauth2: <ShieldCheck className="h-3.5 w-3.5" />,
  api_key: <Key className="h-3.5 w-3.5" />,
  custom: <Settings2 className="h-3.5 w-3.5" />,
};

export function AuthConfigList({ initialConfigs }: AuthConfigListProps) {
  const [configs, setConfigs] = useState<AuthConfiguration[]>(initialConfigs);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<AuthConfiguration | null>(null);
  const [usageInfo, setUsageInfo] = useState<{
    instances: number;
    systemServices: number;
    instanceServices: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEdit = (config: AuthConfiguration) => {
    setSelectedConfig(config);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async (config: AuthConfiguration) => {
    setSelectedConfig(config);
    setLoading(true);
    try {
      // Check usage before showing delete dialog
      const usage = await api.authConfigurations.getUsage(config.id);
      setUsageInfo(usage);
      setDeleteDialogOpen(true);
    } catch {
      toast.error('Failed to check configuration usage');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;

    setLoading(true);
    try {
      await api.authConfigurations.delete(selectedConfig.id);
      setConfigs((prev) => prev.filter((c) => c.id !== selectedConfig.id));
      toast.success('Auth configuration deleted');
      setDeleteDialogOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message.includes('in use')) {
        toast.error('Cannot delete configuration that is in use');
      } else {
        toast.error('Failed to delete auth configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdated = (updatedConfig: AuthConfiguration) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === updatedConfig.id ? updatedConfig : c))
    );
  };

  const refreshConfigs = async () => {
    try {
      const updated = await api.authConfigurations.list();
      setConfigs(updated);
    } catch {
      // Silently fail - configs might be stale but that's ok
    }
  };

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No auth configurations</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Auth configurations are created when you set up authentication for instances or services.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1.5">
                    {authTypeIcons[config.authType]}
                    {authTypeLabels[config.authType]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {config.description || '-'}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(config.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(config)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(config)}
                      disabled={loading}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {selectedConfig && (
        <EditAuthConfigDialog
          config={selectedConfig}
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) refreshConfigs();
            setEditDialogOpen(open);
          }}
          onUpdated={handleUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Auth Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              {usageInfo && usageInfo.total > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Cannot delete</p>
                      <p className="text-sm">
                        This configuration is currently in use and cannot be deleted.
                      </p>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Currently used by:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {usageInfo.instances > 0 && (
                        <li>{usageInfo.instances} instance(s)</li>
                      )}
                      {usageInfo.systemServices > 0 && (
                        <li>{usageInfo.systemServices} system service(s)</li>
                      )}
                      {usageInfo.instanceServices > 0 && (
                        <li>{usageInfo.instanceServices} instance service(s)</li>
                      )}
                    </ul>
                    <p className="mt-2">
                      Remove all references to this configuration before deleting.
                    </p>
                  </div>
                </div>
              ) : (
                <p>
                  Are you sure you want to delete &quot;{selectedConfig?.name}&quot;? This action
                  cannot be undone.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {usageInfo && usageInfo.total === 0 && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
