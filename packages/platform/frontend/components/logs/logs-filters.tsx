'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Filter, RotateCcw } from 'lucide-react';

interface LogsFiltersProps {
  apiKeys?: Array<{ id: string; name: string }>;
  systems?: Array<{ id: string; name: string }>;
}

export function LogsFilters({ apiKeys = [], systems = [] }: LogsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    apiKeyId: searchParams.get('apiKeyId') || '',
    systemId: searchParams.get('systemId') || '',
    environment: searchParams.get('environment') || '',
    entity: searchParams.get('entity') || '',
    operation: searchParams.get('operation') || '',
    success: searchParams.get('success') || '',
    statusCode: searchParams.get('statusCode') || '',
    requestId: searchParams.get('requestId') || '',
    errorCategory: searchParams.get('errorCategory') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  });

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/logs?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      apiKeyId: '',
      systemId: '',
      environment: '',
      entity: '',
      operation: '',
      success: '',
      statusCode: '',
      requestId: '',
      errorCategory: '',
      from: '',
      to: '',
    });
    router.push('/logs');
  };

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Filters</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* API Key Filter */}
        {apiKeys.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <Select
              value={filters.apiKeyId}
              onValueChange={(v) => updateFilter('apiKeyId', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All API Keys" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All API Keys</SelectItem>
                {apiKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* System Filter */}
        {systems.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">System</Label>
            <Select
              value={filters.systemId}
              onValueChange={(v) => updateFilter('systemId', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                {systems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Environment Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs">Environment</Label>
          <Select
            value={filters.environment}
            onValueChange={(v) => updateFilter('environment', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Environments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Environments</SelectItem>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="dev">Development</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="preprod">Pre-Production</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entity Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs">Entity</Label>
          <Input
            placeholder="e.g., A_BusinessPartner"
            value={filters.entity}
            onChange={(e) => updateFilter('entity', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Operation Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs">Operation</Label>
          <Select
            value={filters.operation}
            onValueChange={(v) => updateFilter('operation', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Operations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              <SelectItem value="read">Read (GET)</SelectItem>
              <SelectItem value="create">Create (POST)</SelectItem>
              <SelectItem value="update">Update (PUT/PATCH)</SelectItem>
              <SelectItem value="delete">Delete (DELETE)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select
            value={filters.success}
            onValueChange={(v) => updateFilter('success', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="true">Success</SelectItem>
              <SelectItem value="false">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* HTTP Status Code Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs">HTTP Code</Label>
          <Input
            placeholder="e.g., 200, 404, 500"
            value={filters.statusCode}
            onChange={(e) => updateFilter('statusCode', e.target.value)}
            className="h-9"
            type="number"
          />
        </div>

        {/* Request ID Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs">Request ID</Label>
          <Input
            placeholder="Correlation ID"
            value={filters.requestId}
            onChange={(e) => updateFilter('requestId', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Error Category Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs">Error Category</Label>
          <Select
            value={filters.errorCategory}
            onValueChange={(v) => updateFilter('errorCategory', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="auth">Authentication</SelectItem>
              <SelectItem value="permission">Permission</SelectItem>
              <SelectItem value="validation">Validation</SelectItem>
              <SelectItem value="server">Server Error</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="timeout">Timeout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5">
          <Label className="text-xs">From Date</Label>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1.5">
          <Label className="text-xs">To Date</Label>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Apply Button */}
        <div className="flex items-end">
          <Button onClick={applyFilters} className="w-full h-9">
            Apply Filters
          </Button>
        </div>
      </div>
    </Card>
  );
}
