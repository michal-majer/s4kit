'use client';

import { useState, useMemo } from 'react';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SystemService, System, InstanceService, InstanceEnvironment } from '@/lib/api';
import { Database, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

const envLabels: Record<InstanceEnvironment, string> = {
  sandbox: 'SBX',
  dev: 'DEV',
  quality: 'QA',
  preprod: 'PRE',
  production: 'PRD',
};

const envFullLabels: Record<InstanceEnvironment, string> = {
  sandbox: 'Sandbox',
  dev: 'Development',
  quality: 'Quality',
  preprod: 'Pre-Production',
  production: 'Production',
};

const envOrder: Record<InstanceEnvironment, number> = {
  sandbox: 0,
  dev: 1,
  quality: 2,
  preprod: 3,
  production: 4,
};

const allEnvironments: InstanceEnvironment[] = ['sandbox', 'dev', 'quality', 'preprod', 'production'];

type VerificationStatus = 'verified' | 'failed';

const statusLabels: Record<VerificationStatus, string> = {
  verified: 'Verified',
  failed: 'Failed',
};

interface ServicesTableProps {
  services: SystemService[];
  systems: System[];
  instanceServices?: InstanceService[];
}

export function ServicesTable({ services, systems, instanceServices = [] }: ServicesTableProps) {
  const [systemFilters, setSystemFilters] = useState<string[]>([]);
  const [envFilters, setEnvFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const systemMap = new Map(systems.map(s => [s.id, s]));

  // Options for filters
  const systemOptions = useMemo(() =>
    systems.map(s => ({ value: s.id, label: s.name })),
    [systems]
  );

  const envOptions = useMemo(() =>
    allEnvironments.map(env => ({ value: env, label: envFullLabels[env] })),
    []
  );

  // Group instance services by systemServiceId
  const instanceServicesBySystemService = useMemo(() => {
    const map = new Map<string, InstanceService[]>();
    for (const is of instanceServices) {
      const existing = map.get(is.systemServiceId) || [];
      existing.push(is);
      map.set(is.systemServiceId, existing);
    }
    return map;
  }, [instanceServices]);

  // Filter services based on selected filters
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // System filter (if any selected, service must match one of them)
      if (systemFilters.length > 0 && !systemFilters.includes(service.systemId)) {
        return false;
      }

      const envServices = instanceServicesBySystemService.get(service.id) || [];

      // Environment filter (if any selected, service must be deployed to at least one)
      if (envFilters.length > 0) {
        const hasMatchingEnv = envServices.some(
          (is) => is.instance?.environment && envFilters.includes(is.instance.environment)
        );
        if (!hasMatchingEnv) {
          return false;
        }
      }

      // Status filter (if selected, service must have at least one instance with that status)
      if (statusFilter !== 'all') {
        const hasMatchingStatus = envServices.some(
          (is) => is.verificationStatus === statusFilter
        );
        if (!hasMatchingStatus) {
          return false;
        }
      }

      return true;
    });
  }, [services, systemFilters, envFilters, statusFilter, instanceServicesBySystemService]);

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No services yet"
        description="Services are created within Systems. Go to a System to add services."
      />
    );
  }

  const columns: Column<SystemService>[] = [
    {
      id: 'system',
      header: 'System',
      accessorFn: (service) => systemMap.get(service.systemId)?.name || '',
      cell: (service) => {
        const system = systemMap.get(service.systemId);
        return system ? (
          <Link
            href={`/systems/${system.id}`}
            className="text-primary hover:underline font-medium"
          >
            {system.name}
          </Link>
        ) : (
          '-'
        );
      },
    },
    {
      id: 'environments',
      header: 'Environments',
      sortable: false,
      cell: (service) => {
        const envServices = instanceServicesBySystemService.get(service.id) || [];
        if (envServices.length === 0) {
          return <span className="text-muted-foreground text-sm">Not deployed</span>;
        }

        // Sort by environment order
        const sorted = [...envServices].sort((a, b) => {
          const envA = a.instance?.environment || 'dev';
          const envB = b.instance?.environment || 'dev';
          return envOrder[envA] - envOrder[envB];
        });

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {sorted.map((is) => {
              const env = is.instance?.environment || 'dev';
              const status = is.verificationStatus;
              const StatusIcon =
                status === 'verified'
                  ? CheckCircle2
                  : status === 'failed'
                  ? XCircle
                  : Clock;
              const statusColor =
                status === 'verified'
                  ? 'text-green-600'
                  : status === 'failed'
                  ? 'text-red-500'
                  : 'text-amber-500';

              return (
                <Link
                  key={is.id}
                  href={`/systems/${service.systemId}/instance-services/${is.id}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-muted hover:bg-muted/80 transition-colors"
                  title={`${envFullLabels[env]}: ${status || 'pending'}`}
                >
                  <span className="font-medium">{envLabels[env]}</span>
                  <StatusIcon className={`h-3 w-3 ${statusColor}`} />
                </Link>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: (service) => <span className="font-medium">{service.name}</span>,
    },
    {
      id: 'alias',
      header: 'Alias',
      accessorKey: 'alias',
      cell: (service) => (
        <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
          {service.alias}
        </code>
      ),
    },
    {
      id: 'servicePath',
      header: 'Service Path',
      accessorKey: 'servicePath',
      cell: (service) => (
        <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono truncate max-w-[200px]" title={service.servicePath}>
          {service.servicePath}
        </code>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="w-[220px]">
          <MultiSelect
            options={systemOptions}
            selected={systemFilters}
            onSelectionChange={setSystemFilters}
            placeholder="All Systems"
            searchPlaceholder="Search systems..."
          />
        </div>

        <div className="w-[220px]">
          <MultiSelect
            options={envOptions}
            selected={envFilters}
            onSelectionChange={setEnvFilters}
            placeholder="All Environments"
            searchPlaceholder="Search environments..."
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {(systemFilters.length > 0 || envFilters.length > 0 || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setSystemFilters([]);
              setEnvFilters([]);
              setStatusFilter('all');
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      <DataTable
        data={filteredServices}
        columns={columns}
        searchPlaceholder="Search services..."
        searchableColumns={['name', 'alias', 'servicePath']}
        getRowId={(service) => service.id}
      />
    </div>
  );
}
