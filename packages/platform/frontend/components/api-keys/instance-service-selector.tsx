'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Search, ChevronDown, ChevronRight, X, Check, Server, Database, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ServiceOption {
  id: string;
  label: string;
  environment: string;
  systemName: string;
  serviceName: string;
  isExisting?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'failed' | null;
  odataVersion?: 'v2' | 'v4' | null;
}

interface InstanceServiceSelectorProps {
  options: ServiceOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const ENV_CONFIG: Record<string, { label: string; short: string; color: string; order: number }> = {
  production: { label: 'Production', short: 'PROD', color: 'bg-red-100 text-red-700', order: 1 },
  quality: { label: 'Quality', short: 'QA', color: 'bg-amber-100 text-amber-700', order: 2 },
  dev: { label: 'Development', short: 'DEV', color: 'bg-blue-100 text-blue-700', order: 3 },
};

type ODataVersionFilter = 'all' | 'v2' | 'v4';
type VerificationStatusFilter = 'all' | 'verified' | 'pending' | 'failed' | 'none';

export function InstanceServiceSelector({
  options,
  selected,
  onSelectionChange,
  disabled = false,
  isLoading = false,
}: InstanceServiceSelectorProps) {
  const [search, setSearch] = useState('');
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());

  // Filter state
  const [versionFilter, setVersionFilter] = useState<ODataVersionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<VerificationStatusFilter>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Group: System → Environment → Services
  const groupedOptions = useMemo(() => {
    const systems: Record<string, Record<string, ServiceOption[]>> = {};
    
    options.forEach(opt => {
      const sys = opt.systemName || 'Unknown';
      const env = opt.environment || 'other';
      
      if (!systems[sys]) systems[sys] = {};
      if (!systems[sys][env]) systems[sys][env] = [];
      systems[sys][env].push(opt);
    });

    // Sort services within each env
    Object.values(systems).forEach(envs => {
      Object.values(envs).forEach(services => {
        services.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
      });
    });

    return systems;
  }, [options]);

  // Filter based on search and filter controls
  const filteredGroups = useMemo(() => {
    const lower = search.toLowerCase();
    const filtered: Record<string, Record<string, ServiceOption[]>> = {};

    Object.entries(groupedOptions).forEach(([sys, envs]) => {
      const filteredEnvs: Record<string, ServiceOption[]> = {};

      Object.entries(envs).forEach(([env, services]) => {
        const matches = services.filter(s => {
          // Search filter
          if (search.trim()) {
            const matchesSearch = s.serviceName.toLowerCase().includes(lower) ||
              s.systemName.toLowerCase().includes(lower);
            if (!matchesSearch) return false;
          }

          // OData version filter
          if (versionFilter !== 'all') {
            if (s.odataVersion !== versionFilter) return false;
          }

          // Verification status filter
          if (statusFilter !== 'all') {
            if (statusFilter === 'none') {
              if (s.verificationStatus) return false;
            } else {
              if (s.verificationStatus !== statusFilter) return false;
            }
          }

          // Show selected only filter
          if (showSelectedOnly) {
            if (!selected.includes(s.id)) return false;
          }

          return true;
        });

        if (matches.length > 0) {
          filteredEnvs[env] = matches;
        }
      });

      if (Object.keys(filteredEnvs).length > 0) {
        filtered[sys] = filteredEnvs;
      }
    });

    return filtered;
  }, [groupedOptions, search, versionFilter, statusFilter, showSelectedOnly, selected]);

  // Auto-expand when searching
  useMemo(() => {
    if (search.trim()) {
      setExpandedSystems(new Set(Object.keys(filteredGroups)));
      const allEnvKeys = new Set<string>();
      Object.entries(filteredGroups).forEach(([sys, envs]) => {
        Object.keys(envs).forEach(env => allEnvKeys.add(`${sys}:${env}`));
      });
      setExpandedEnvs(allEnvKeys);
    }
  }, [search, filteredGroups]);

  // Selected options info
  const selectedOptions = useMemo(() => {
    return options.filter(opt => selected.includes(opt.id));
  }, [options, selected]);

  const toggleSystem = (sys: string) => {
    const newExpanded = new Set(expandedSystems);
    if (newExpanded.has(sys)) {
      newExpanded.delete(sys);
    } else {
      newExpanded.add(sys);
    }
    setExpandedSystems(newExpanded);
  };

  const toggleEnv = (key: string) => {
    const newExpanded = new Set(expandedEnvs);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEnvs(newExpanded);
  };

  const toggleItem = (id: string) => {
    if (selected.includes(id)) {
      onSelectionChange(selected.filter(s => s !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  const totalAvailable = options.length;
  const totalSelected = selected.length;
  const sortedSystems = Object.keys(filteredGroups).sort();

  return (
    <TooltipProvider>
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Instance Services</span>
          <Badge variant="secondary" className="font-normal">
            {totalSelected} of {totalAvailable} selected
          </Badge>
        </div>
        {totalSelected > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Selected tags */}
      {totalSelected > 0 && (
        <div className="px-4 py-3 bg-muted/10 border-b">
          <div className="text-xs text-muted-foreground mb-2">Selected services:</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map(opt => {
              const envConfig = ENV_CONFIG[opt.environment] || { short: opt.environment.toUpperCase(), color: 'bg-gray-100 text-gray-700' };
              return (
                <Badge
                  key={opt.id}
                  variant="outline"
                  className={cn("pl-2 pr-1 py-0.5 gap-1.5 font-normal cursor-pointer", envConfig.color)}
                  onClick={() => !disabled && toggleItem(opt.id)}
                >
                  <span className="font-semibold text-xs">{envConfig.short}</span>
                  <span className="opacity-70">{opt.systemName} /</span>
                  <span>{opt.serviceName}</span>
                  <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-3 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            disabled={disabled}
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Filters:</span>
          </div>

          {/* OData version filter */}
          <Select value={versionFilter} onValueChange={(v) => setVersionFilter(v as ODataVersionFilter)} disabled={disabled}>
            <SelectTrigger className="h-7 w-[90px] text-xs">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="v2">OData v2</SelectItem>
              <SelectItem value="v4">OData v4</SelectItem>
            </SelectContent>
          </Select>

          {/* Verification status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VerificationStatusFilter)} disabled={disabled}>
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="none">Not configured</SelectItem>
            </SelectContent>
          </Select>

          {/* Show selected only toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="show-selected"
              checked={showSelectedOnly}
              onCheckedChange={setShowSelectedOnly}
              disabled={disabled}
              className="h-4 w-7"
            />
            <Label htmlFor="show-selected" className="text-xs text-muted-foreground cursor-pointer">
              Selected only
            </Label>
          </div>
        </div>
      </div>

      {/* Tree: System → Environment → Services */}
      <ScrollArea className="h-[350px]">
        <div className="p-2">
          {sortedSystems.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground">
              {search ? `No services match "${search}"` : 'No services available'}
            </div>
          ) : (
            sortedSystems.map(sys => {
              const envs = filteredGroups[sys];
              const isSystemExpanded = expandedSystems.has(sys);
              const sortedEnvs = Object.keys(envs).sort((a, b) => 
                (ENV_CONFIG[a]?.order ?? 99) - (ENV_CONFIG[b]?.order ?? 99)
              );
              
              // Count selected in this system
              const systemServices = Object.values(envs).flat();
              const selectedInSystem = systemServices.filter(s => selected.includes(s.id)).length;
              const totalInSystem = systemServices.length;

              return (
                <div key={sys} className="mb-1">
                  {/* System header */}
                  <button
                    onClick={() => toggleSystem(sys)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded-md"
                  >
                    {isSystemExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{sys}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {selectedInSystem > 0 && <span className="text-foreground font-medium">{selectedInSystem} / </span>}
                      {totalInSystem}
                    </span>
                  </button>

                  {/* Environments */}
                  {isSystemExpanded && (
                    <div className="ml-6 border-l-2 border-muted pl-3 mt-1">
                      {sortedEnvs.map(env => {
                        const envKey = `${sys}:${env}`;
                        const services = envs[env];
                        const isEnvExpanded = expandedEnvs.has(envKey);
                        const config = ENV_CONFIG[env] || { label: env, short: env.toUpperCase(), color: 'bg-gray-100 text-gray-700', order: 99 };
                        const selectedInEnv = services.filter(s => selected.includes(s.id)).length;

                        return (
                          <div key={envKey} className="mb-1">
                            {/* Environment header */}
                            <button
                              onClick={() => toggleEnv(envKey)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded"
                            >
                              {isEnvExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <Badge variant="outline" className={cn("text-xs px-2", config.color)}>
                                {config.short}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {selectedInEnv > 0 && <span className="text-foreground font-medium">{selectedInEnv} / </span>}
                                {services.length}
                              </span>
                            </button>

                            {/* Services */}
                            {isEnvExpanded && (
                              <div className="ml-6 py-1 space-y-0.5">
                                {services.map(svc => {
                                  const isSelected = selected.includes(svc.id);
                                  return (
                                    <button
                                      key={svc.id}
                                      onClick={() => !disabled && toggleItem(svc.id)}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors",
                                        isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/40 border border-transparent"
                                      )}
                                    >
                                      <div className={cn(
                                        "flex h-5 w-5 items-center justify-center rounded border shrink-0 transition-colors",
                                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                      )}>
                                        {isSelected && <Check className="h-3.5 w-3.5" />}
                                      </div>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className={cn(
                                            "h-2 w-2 rounded-full shrink-0",
                                            svc.verificationStatus === 'verified' && "bg-emerald-500",
                                            svc.verificationStatus === 'pending' && "bg-amber-500",
                                            svc.verificationStatus === 'failed' && "bg-red-500",
                                            !svc.verificationStatus && "bg-gray-400"
                                          )} />
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          {svc.verificationStatus === 'verified' ? 'Verified' :
                                           svc.verificationStatus === 'pending' ? 'Pending verification' :
                                           svc.verificationStatus === 'failed' ? 'Verification failed' :
                                           'Not configured'}
                                        </TooltipContent>
                                      </Tooltip>
                                      <span className={cn("flex-1", isSelected && "text-primary font-medium")}>
                                        {svc.serviceName}
                                      </span>
                                      {svc.odataVersion && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono text-muted-foreground shrink-0">
                                          {svc.odataVersion}
                                        </Badge>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}


