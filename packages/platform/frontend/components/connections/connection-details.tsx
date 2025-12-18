'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/common/page-header';
import { api, Connection, ConnectionService, Service } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Unlink, Plus, Globe, Shield, Layers } from 'lucide-react';
import Link from 'next/link';

interface ConnectionDetailsProps {
  connection: Connection;
  linkedServices: ConnectionService[];
  availableServices: Service[];
}

export function ConnectionDetails({ connection, linkedServices, availableServices }: ConnectionDetailsProps) {
  const router = useRouter();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const linkedServiceIds = new Set(linkedServices.map(cs => cs.serviceId));
  const unlinkkedServices = availableServices.filter(s => !linkedServiceIds.has(s.id));

  const handleLinkService = async () => {
    if (!selectedServiceId) {
      toast.error('Please select a service');
      return;
    }

    setLoading(true);
    try {
      await api.connectionServices.create({
        connectionId: connection.id,
        serviceId: selectedServiceId,
      });
      toast.success('Service linked');
      setLinkDialogOpen(false);
      setSelectedServiceId('');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link service');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkService = async (connectionServiceId: string) => {
    if (!confirm('Are you sure you want to unlink this service?')) return;
    try {
      await api.connectionServices.delete(connectionServiceId);
      toast.success('Service unlinked');
      router.refresh();
    } catch (error) {
      toast.error('Failed to unlink service');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link href="/connections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={connection.name}
          description="Connection configuration and linked services"
          className="flex-1"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connection Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connection Info</CardTitle>
            <CardDescription>SAP system connection details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Globe className="h-3.5 w-3.5" />
                Base URL
              </div>
              <code className="block text-sm bg-muted px-3 py-2 rounded-lg font-mono break-all">
                {connection.baseUrl}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Environment
                </p>
                <Badge
                  variant={connection.environment === 'production' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {connection.environment}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Shield className="h-3 w-3" />
                  Auth Type
                </div>
                <Badge variant="outline" className="capitalize">
                  {connection.authType}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Services Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Linked Services</CardTitle>
                <CardDescription>
                  {linkedServices.length} {linkedServices.length === 1 ? 'service' : 'services'} linked to this connection
                </CardDescription>
              </div>
              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Link Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Service</DialogTitle>
                    <DialogDescription>Add an OData service to this connection</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Service</Label>
                      <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {unlinkkedServices.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              All services already linked
                            </div>
                          ) : (
                            unlinkkedServices.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                <div className="flex items-center gap-2">
                                  <span>{service.name}</span>
                                  <code className="text-xs text-muted-foreground">
                                    {service.alias}
                                  </code>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleLinkService} disabled={loading || !selectedServiceId}>
                        {loading ? 'Linking...' : 'Link Service'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {linkedServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No services linked</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Link an OData service to use with this connection
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Service</TableHead>
                      <TableHead className="font-semibold">Alias</TableHead>
                      <TableHead className="text-right font-semibold w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedServices.map((cs) => (
                      <TableRow key={cs.id} className="group">
                        <TableCell className="font-medium">
                          {cs.service?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-mono">
                            {cs.service?.alias}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleUnlinkService(cs.id)}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

