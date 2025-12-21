'use client';

import { useMemo } from 'react';
import { ConfigurableTable, ConfigurableTableConfig } from '@/components/ui/configurable-table';
import { EmptyState } from '@/components/common/empty-state';
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

interface ServicesTableProps {
  services: SystemService[];
  systems: System[];
  instanceServices?: InstanceService[];
}

export function ServicesTable({ services, systems, instanceServices = [] }: ServicesTableProps) {
  const systemMap = useMemo(() => new Map(systems.map(s => [s.id, s])), [systems]);

  const instanceServicesBySystemService = useMemo(() => {
    const map = new Map<string, InstanceService[]>();
    for (const is of instanceServices) {
      const existing = map.get(is.systemServiceId) || [];
      existing.push(is);
      map.set(is.systemServiceId, existing);
    }
    return map;
  }, [instanceServices]);

  const systemOptions = useMemo(() =>
    systems.map(s => ({ value: s.id, label: s.name })),
    [systems]
  );

  const envOptions = useMemo(() =>
    allEnvironments.map(env => ({ value: env, label: envFullLabels[env] })),
    []
  );

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No services yet"
        description="Services are created within Systems. Go to a System to add services."
      />
    );
  }

  const config: ConfigurableTableConfig<SystemService> = {
    columns: [
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
    ],
    filters: [
      {
        type: 'multi-select',
        id: 'system',
        placeholder: 'All Systems',
        searchPlaceholder: 'Search systems...',
        width: '220px',
        options: systemOptions,
        matchesItem: (service, selectedSystems) => selectedSystems.includes(service.systemId),
      },
      {
        type: 'multi-select',
        id: 'environment',
        placeholder: 'All Environments',
        searchPlaceholder: 'Search environments...',
        width: '220px',
        options: envOptions,
        matchesItem: (service, selectedEnvs) => {
          const envServices = instanceServicesBySystemService.get(service.id) || [];
          return envServices.some(
            (is) => is.instance?.environment && selectedEnvs.includes(is.instance.environment)
          );
        },
      },
      {
        type: 'select',
        id: 'status',
        placeholder: 'All Statuses',
        width: '140px',
        allValue: 'all',
        options: [
          { value: 'verified', label: 'Verified' },
          { value: 'failed', label: 'Failed' },
        ],
        getItemValue: (service) => {
          const envServices = instanceServicesBySystemService.get(service.id) || [];
          const matchingService = envServices.find(is => is.verificationStatus);
          return matchingService?.verificationStatus || undefined;
        },
      },
    ],
    searchPlaceholder: 'Search services...',
    searchableColumns: ['name', 'alias', 'servicePath'],
    getRowId: (service) => service.id,
  };

  return <ConfigurableTable data={services} config={config} />;
}
