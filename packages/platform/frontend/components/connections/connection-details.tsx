'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { api, Connection, ConnectionService, Service } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Link as LinkIcon, Unlink, Plus } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/connections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{connection.name}</h1>
          <p className="text-muted-foreground">Connection Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Base URL</Label>
              <p className="font-mono text-sm">{connection.baseUrl}</p>
            </div>
            <div className="flex gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Environment</Label>
                <div className="mt-1">
                  <Badge variant="outline">{connection.environment}</Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Auth Type</Label>
                <div className="mt-1">
                  <Badge variant="secondary">{connection.authType}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Linked Services</CardTitle>
              <CardDescription>{linkedServices.length} services linked</CardDescription>
            </div>
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Link Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Service</DialogTitle>
                  <DialogDescription>Add an OData service to this connection</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Service</Label>
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unlinkkedServices.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">All services already linked</div>
                        ) : (
                          unlinkkedServices.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} ({service.alias})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleLinkService} disabled={loading || !selectedServiceId}>
                      {loading ? 'Linking...' : 'Link Service'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {linkedServices.length === 0 ? (
              <p className="text-muted-foreground text-sm">No services linked yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedServices.map((cs) => (
                    <TableRow key={cs.id}>
                      <TableCell className="font-medium">{cs.service?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{cs.service?.alias}</code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleUnlinkService(cs.id)}>
                          <Unlink className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
