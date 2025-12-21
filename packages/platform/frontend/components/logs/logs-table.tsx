'use client';

import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { RequestLog } from '@/lib/api';
import { format } from 'date-fns';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Database,
} from 'lucide-react';

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

const errorCategoryLabels: Record<string, string> = {
  auth: 'Authentication',
  permission: 'Permission',
  validation: 'Validation',
  server: 'Server Error',
  network: 'Network',
  timeout: 'Timeout',
};

export function LogsTable({ logs }: { logs: RequestLog[] }) {
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
      id: 'status',
      header: 'Status',
      accessorFn: (log) => (log.success ? 'success' : 'error'),
      cell: (log) =>
        log.success ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        ),
      className: 'w-12',
    },
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
      id: 'error',
      header: 'Error',
      accessorKey: 'errorCategory',
      cell: (log) =>
        log.errorCategory ? (
          <Badge variant="destructive" className="text-xs">
            {errorCategoryLabels[log.errorCategory] || log.errorCategory}
          </Badge>
        ) : null,
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
    <DataTable
      data={logs}
      columns={columns}
      searchPlaceholder="Search logs..."
      searchableColumns={['entity', 'path', 'errorMessage']}
      getRowId={(log) => log.id}
      pageSize={20}
      pageSizeOptions={[20, 50, 100]}
      expandableContent={(log) => <LogDetails log={log} />}
    />
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
