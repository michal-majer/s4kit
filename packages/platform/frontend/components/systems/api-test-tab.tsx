'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Play,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Loader2,
  AlertTriangle,
  Zap,
  Terminal,
  Database,
  ShieldAlert,
} from 'lucide-react';

interface ApiTestTabProps {
  instanceServiceId: string;
  entities: string[];
  fullEndpoint: string;
  initialEntity?: string | null;
}

interface TestResponse {
  success: boolean;
  statusCode: number;
  responseTime: number;
  sapResponseTime?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  recordCount?: number;
  bodyHidden?: boolean;
  error?: {
    code: string;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
  };
  request: {
    method: string;
    url: string;
    authType: string;
  };
}

export function ApiTestTab({ instanceServiceId, entities, fullEndpoint, initialEntity }: ApiTestTabProps) {
  // Path mode: 'entity' | 'custom'
  const [pathMode, setPathMode] = useState<'entity' | 'custom'>('entity');
  const [selectedEntity, setSelectedEntity] = useState<string>(entities[0] || '');
  const [customPath, setCustomPath] = useState('');

  // Handle initialEntity from parent (when clicking play on an entity)
  useEffect(() => {
    if (initialEntity && entities.includes(initialEntity)) {
      setSelectedEntity(initialEntity);
      setPathMode('entity');
    }
  }, [initialEntity, entities]);

  // OData params
  const [top, setTop] = useState('');
  const [skip, setSkip] = useState('');
  const [filter, setFilter] = useState('');
  const [select, setSelect] = useState('');
  const [expand, setExpand] = useState('');
  const [orderby, setOrderby] = useState('');

  // UI state
  const [paramsOpen, setParamsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TestResponse | null>(null);

  // Build request preview URL
  const previewUrl = useMemo(() => {
    const path = pathMode === 'entity' ? selectedEntity : customPath;
    if (!path) return '';

    const params = new URLSearchParams();
    if (top) params.set('$top', top);
    if (skip) params.set('$skip', skip);
    if (filter) params.set('$filter', filter);
    if (select) params.set('$select', select);
    if (expand) params.set('$expand', expand);
    if (orderby) params.set('$orderby', orderby);

    const queryString = params.toString();
    const baseUrl = `${fullEndpoint}/${path}`.replace(/\/+/g, '/');
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [pathMode, selectedEntity, customPath, fullEndpoint, top, skip, filter, select, expand, orderby]);

  // Send request
  const handleSendRequest = async () => {
    const path = pathMode === 'entity' ? selectedEntity : customPath;
    if (!path) {
      toast.error('Please select an entity or enter a custom path');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const result = await api.instanceServices.test(instanceServiceId, {
        ...(pathMode === 'entity' ? { entity: selectedEntity } : { customPath }),
        ...(top && { $top: parseInt(top, 10) }),
        ...(skip && { $skip: parseInt(skip, 10) }),
        ...(filter && { $filter: filter }),
        ...(select && { $select: select }),
        ...(expand && { $expand: expand }),
        ...(orderby && { $orderby: orderby }),
      });

      setResponse(result);
      if (result.success) {
        toast.success(`Request completed in ${result.responseTime}ms`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send request';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    if (code >= 400 && code < 500) return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    if (code >= 500) return 'bg-red-500/15 text-red-600 border-red-500/30';
    return 'bg-muted text-muted-foreground';
  };

  const hasParams = top || skip || filter || select || expand || orderby;

  return (
    <div className="space-y-4">
      {/* Request Builder */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">API Request</CardTitle>
              <CardDescription>
                Test OData queries using the service&apos;s configured authentication
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Path Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tabs
                value={pathMode}
                onValueChange={(v) => setPathMode(v as 'entity' | 'custom')}
                className="w-auto"
              >
                <TabsList className="h-9">
                  <TabsTrigger value="entity" className="gap-2 text-xs">
                    <Database className="h-3.5 w-3.5" />
                    Entity
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2 text-xs">
                    <Terminal className="h-3.5 w-3.5" />
                    Custom Path
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {pathMode === 'entity' ? (
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue placeholder="Select an entity..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity} value={entity} className="font-mono text-sm">
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="e.g., A_BusinessPartner('1000001') or A_SalesOrder"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="font-mono text-sm"
              />
            )}
          </div>

          {/* Query Parameters */}
          <Collapsible open={paramsOpen} onOpenChange={setParamsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 cursor-pointer">
              <span className="flex items-center gap-2">
                {paramsOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                OData Query Parameters
              </span>
              {hasParams && (
                <Badge variant="secondary" className="text-xs">
                  {[top, skip, filter, select, expand, orderby].filter(Boolean).length} set
                </Badge>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="top" className="text-xs text-muted-foreground">
                    $top <span className="opacity-60">(limit)</span>
                  </Label>
                  <Input
                    id="top"
                    type="number"
                    placeholder="10"
                    value={top}
                    onChange={(e) => setTop(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skip" className="text-xs text-muted-foreground">
                    $skip <span className="opacity-60">(offset)</span>
                  </Label>
                  <Input
                    id="skip"
                    type="number"
                    placeholder="0"
                    value={skip}
                    onChange={(e) => setSkip(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="filter" className="text-xs text-muted-foreground">
                    $filter <span className="opacity-60">(where clause)</span>
                  </Label>
                  <Input
                    id="filter"
                    placeholder="e.g., BusinessPartnerCategory eq '1'"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="select" className="text-xs text-muted-foreground">
                    $select <span className="opacity-60">(fields)</span>
                  </Label>
                  <Input
                    id="select"
                    placeholder="e.g., BusinessPartner,BusinessPartnerFullName"
                    value={select}
                    onChange={(e) => setSelect(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expand" className="text-xs text-muted-foreground">
                    $expand <span className="opacity-60">(join)</span>
                  </Label>
                  <Input
                    id="expand"
                    placeholder="e.g., to_Customer"
                    value={expand}
                    onChange={(e) => setExpand(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderby" className="text-xs text-muted-foreground">
                    $orderby <span className="opacity-60">(sort)</span>
                  </Label>
                  <Input
                    id="orderby"
                    placeholder="e.g., CreationDate desc"
                    value={orderby}
                    onChange={(e) => setOrderby(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Request Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Request Preview</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => copyToClipboard(previewUrl, 'URL')}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <div className="group relative overflow-hidden rounded-lg border bg-slate-950 p-4">
                <div className="flex items-start gap-3">
                  <Badge className="shrink-0 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">
                    GET
                  </Badge>
                  <code className="break-all font-mono text-sm text-slate-300">
                    {previewUrl}
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSendRequest}
              disabled={loading || !previewUrl}
              size="lg"
              className="gap-2 px-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Display */}
      {response && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    response.success
                      ? 'bg-emerald-500/10'
                      : 'bg-red-500/10'
                  }`}
                >
                  {response.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">Response</CardTitle>
                  <CardDescription>
                    {response.success ? 'Request completed successfully' : 'Request failed'}
                  </CardDescription>
                </div>
              </div>
              {response.data !== undefined && !response.bodyHidden && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(response.data, null, 2),
                      'Response'
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Response Stats */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={`gap-1.5 font-mono text-sm ${getStatusColor(response.statusCode)}`}
              >
                {response.statusCode}
              </Badge>

              <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono">{response.responseTime}ms</span>
                <span className="text-muted-foreground">total</span>
              </div>

              {response.sapResponseTime !== undefined && (
                <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-sm">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-mono">{response.sapResponseTime}ms</span>
                  <span className="text-muted-foreground">SAP</span>
                </div>
              )}

              {response.recordCount !== undefined && (
                <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-sm">
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{response.recordCount}</span>
                  <span className="text-muted-foreground">
                    record{response.recordCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <Badge variant="secondary" className="gap-1.5 text-xs">
                Auth: {response.request.authType}
              </Badge>
            </div>

            {/* Error Display */}
            {response.error !== undefined && (
              <div className="overflow-hidden rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-mono text-sm font-semibold text-red-600">
                    {response.error.code}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-red-600">{response.error.message}</p>
                  {response.error.details !== undefined && (
                    <pre className="mt-3 overflow-x-auto rounded bg-red-500/5 p-3 font-mono text-xs text-red-500/80">
                      {typeof response.error.details === 'string'
                        ? response.error.details
                        : JSON.stringify(response.error.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Response Body */}
            {response.bodyHidden ? (
              <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span className="font-mono text-sm font-semibold text-amber-600">
                    Response Body Hidden
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-amber-600">
                    Response body is hidden for production instances to protect sensitive data.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    The request was successful. Use record count and response time to verify functionality.
                  </p>
                </div>
              </div>
            ) : response.data && (
              <div className="overflow-hidden rounded-lg border bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-2">
                  <span className="font-mono text-xs text-slate-400">Response Body</span>
                </div>
                <ScrollArea className="h-[400px]">
                  <pre className="p-4 font-mono text-sm leading-relaxed text-slate-300">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
