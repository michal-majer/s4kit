'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { RequestLog, InstanceEnvironment } from '@/lib/api';
import { format } from 'date-fns';
import {
  FileText,
  Clock,
  ArrowRight,
  Database,
  Server,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { envShortLabels, envBadgeColors } from '@/lib/environment';

interface LogsTableProps {
  logs: RequestLog[];
  systems?: Array<{ id: string; name: string }>;
  instances?: Array<{ id: string; systemId: string; environment: string }>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    total: number;
  };
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700 border-blue-200',
  POST: 'bg-green-100 text-green-700 border-green-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  PATCH: 'bg-orange-100 text-orange-700 border-orange-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

const statusColors: Record<string, string> = {
  success: 'text-emerald-600 border-emerald-200 bg-emerald-50',
  error: 'text-red-600 border-red-200 bg-red-50',
};

export function LogsTable({ logs, systems = [], instances = [], pagination }: LogsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Create lookup maps for efficient name resolution
  const systemMap = new Map(systems.map((s) => [s.id, s.name]));
  const instanceMap = new Map(instances.map((i) => [i.id, i.environment]));

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/logs?${params.toString()}`);
  };

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No logs found"
        description="Request logs will appear here when API calls are made."
      />
    );
  }

  const columns: Column<RequestLog>[] = [
    {
      id: 'method',
      header: 'Method',
      accessorKey: 'method',
      cell: (log) => (
        <Badge variant="outline" className={methodColors[log.method] || ''}>
          {log.method}
        </Badge>
      ),
      className: 'w-20',
    },
    {
      id: 'system',
      header: 'System / Instance',
      accessorFn: (log) => log.systemId || '',
      cell: (log) => {
        const systemName = log.systemId ? systemMap.get(log.systemId) : null;
        const instanceEnv = log.instanceId ? instanceMap.get(log.instanceId) : null;

        if (!systemName && !instanceEnv) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }

        return (
          <TooltipProvider>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate max-w-[100px]">
                      {systemName || '-'}
                    </span>
                  </div>
                </TooltipTrigger>
                {systemName && (
                  <TooltipContent side="top">
                    <p>{systemName}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              {instanceEnv && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 h-4 font-medium ${envBadgeColors[instanceEnv as InstanceEnvironment] || ''}`}
                >
                  {envShortLabels[instanceEnv as InstanceEnvironment] || instanceEnv.toUpperCase()}
                </Badge>
              )}
            </div>
          </TooltipProvider>
        );
      },
    },
    {
      id: 'entity',
      header: 'Entity',
      accessorKey: 'entity',
      cell: (log) => (
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-sm">{log.entity || '-'}</span>
        </div>
      ),
    },
    {
      id: 'path',
      header: 'Path',
      accessorKey: 'path',
      cell: (log) => (
        <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono max-w-[200px] truncate block">
          {log.path}
        </code>
      ),
    },
    {
      id: 'statusCode',
      header: 'Code',
      accessorKey: 'statusCode',
      cell: (log) => (
        <Badge
          variant="outline"
          className={log.success ? statusColors.success : statusColors.error}
        >
          {log.statusCode}
        </Badge>
      ),
      className: 'w-16',
    },
    {
      id: 'responseTime',
      header: 'Latency',
      accessorKey: 'responseTime',
      cell: (log) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {log.responseTime ? `${log.responseTime}ms` : '-'}
        </div>
      ),
      className: 'w-24',
    },
    {
      id: 'size',
      header: 'Size',
      accessorFn: (log) => log.responseSize || 0,
      cell: (log) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {log.requestSize ? formatBytes(log.requestSize) : '0'}
          <ArrowRight className="h-3 w-3" />
          {log.responseSize ? formatBytes(log.responseSize) : '0'}
        </div>
      ),
      className: 'w-28',
    },
    {
      id: 'createdAt',
      header: 'Time',
      accessorKey: 'createdAt',
      cell: (log) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        data={logs}
        columns={columns}
        searchPlaceholder="Search logs..."
        searchableColumns={['entity', 'path', 'errorMessage']}
        getRowId={(log) => log.id}
        pageSize={50}
        pageSizeOptions={[50]}
        expandableContent={(log) => <LogDetails log={log} />}
        showPagination={false}
      />

      {/* Server-side Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            {pagination.total > 0 ? (
              <>Showing {((pagination.currentPage - 1) * 50) + 1} to {Math.min(pagination.currentPage * 50, pagination.total)} of {pagination.total} logs</>
            ) : (
              <>0 logs</>
            )}
          </p>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogDetails({ log }: { log: RequestLog }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div>
        <p className="text-muted-foreground text-xs mb-1">Request ID</p>
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {log.requestId || '-'}
        </code>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">Operation</p>
        <span className="capitalize">{log.operation || '-'}</span>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">SAP Latency</p>
        <span>{log.sapResponseTime ? `${log.sapResponseTime}ms` : '-'}</span>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">Records</p>
        <span>{log.recordCount ?? '-'}</span>
      </div>
      {log.errorMessage && (
        <div className="col-span-full">
          <p className="text-muted-foreground text-xs mb-1">Error Message</p>
          <p className="text-red-600 text-sm">{log.errorMessage}</p>
        </div>
      )}
      {log.userAgent && (
        <div className="col-span-full">
          <p className="text-muted-foreground text-xs mb-1">User Agent</p>
          <code className="text-xs text-muted-foreground">{log.userAgent}</code>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
