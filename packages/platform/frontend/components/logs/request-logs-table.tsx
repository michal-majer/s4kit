'use client';

import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { RequestLog, ApiKey } from '@/lib/api';
import { format } from 'date-fns';
import { FileText, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface RequestLogsTableProps {
  logs: RequestLog[];
}

export function RequestLogsTable({ logs: initialLogs }: RequestLogsTableProps) {
  const [apiKeys, setApiKeys] = useState<Map<string, ApiKey>>(new Map());

  // Fetch API keys to display key names
  useEffect(() => {
    api.apiKeys.list().then(keys => {
      const keyMap = new Map<string, ApiKey>();
      keys.forEach(key => {
        keyMap.set(key.id, key);
      });
      setApiKeys(keyMap);
    }).catch(() => {
      // Ignore errors
    });
  }, []);

  const getStatusVariant = (status: number): 'default' | 'secondary' | 'destructive' => {
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400) return 'destructive';
    return 'secondary';
  };

  const formatTime = (ms?: number) => {
    if (!ms) return '-';
    return `${ms}ms`;
  };

  if (initialLogs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No request logs"
        description="Request logs will appear here as API calls are made."
      />
    );
  }

  const columns: Column<RequestLog>[] = [
    {
      id: 'createdAt',
      header: 'Time',
      accessorKey: 'createdAt',
      cell: (log) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {format(new Date(log.createdAt), 'MMM d, yyyy, h:mm a')}
        </div>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      accessorKey: 'method',
      cell: (log) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {log.method}
        </Badge>
      ),
    },
    {
      id: 'path',
      header: 'Path',
      accessorKey: 'path',
      cell: (log) => (
        <code
          className="text-xs bg-muted px-2 py-1 rounded-md font-mono max-w-[300px] truncate block"
          title={log.path}
        >
          {log.path}
        </code>
      ),
    },
    {
      id: 'statusCode',
      header: 'Status',
      accessorKey: 'statusCode',
      cell: (log) => (
        <Badge variant={getStatusVariant(log.statusCode)}>
          {log.statusCode}
        </Badge>
      ),
    },
    {
      id: 'responseTime',
      header: 'Response Time',
      accessorKey: 'responseTime',
      cell: (log) => (
        <span className="text-sm">{formatTime(log.responseTime)}</span>
      ),
    },
    {
      id: 'sapResponseTime',
      header: 'SAP Time',
      accessorKey: 'sapResponseTime',
      cell: (log) => (
        <span className="text-sm">{formatTime(log.sapResponseTime)}</span>
      ),
    },
    {
      id: 'apiKeyId',
      header: 'API Key',
      accessorKey: 'apiKeyId',
      sortable: false,
      cell: (log) => {
        const apiKey = apiKeys.get(log.apiKeyId);
        return apiKey ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{apiKey.name}</span>
            <code className="text-xs text-muted-foreground font-mono">
              {apiKey.displayKey}
            </code>
          </div>
        ) : (
          <code className="text-xs text-muted-foreground font-mono">
            {log.apiKeyId.substring(0, 8)}...
          </code>
        );
      },
    },
  ];

  const hasDetails = (log: RequestLog) =>
    !!(log.errorMessage);

  const renderExpandedContent = (log: RequestLog) => (
    <div className="space-y-4">
      {log.errorMessage && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-sm">Error Message</span>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap break-words">
              {log.errorMessage}
            </pre>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DataTable
      data={initialLogs}
      columns={columns}
      searchPlaceholder="Search logs..."
      searchableColumns={['id', 'path', 'method']}
      getRowId={(log) => log.id}
      rowClassName={(log) => (log.statusCode >= 500 ? 'bg-destructive/5' : '')}
      expandableContent={renderExpandedContent}
      isExpandable={hasDetails}
      pageSize={20}
      pageSizeOptions={[10, 20, 50, 100]}
    />
  );
}
