import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Settings, 
  RefreshCw, 
  Save, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { 
  useTravelVisaConfig, 
  useUpdateTravelVisaConfig,
  useSyncTravelStatus,
  useTravelVisaAuditLog
} from '@/hooks/useTravelVisa';
import { format } from 'date-fns';

export default function TravelVisaAdmin() {
  const { data: config, isLoading: loadingConfig } = useTravelVisaConfig();
  const updateConfig = useUpdateTravelVisaConfig();
  const syncStatus = useSyncTravelStatus();
  const { data: auditLogs, isLoading: loadingLogs } = useTravelVisaAuditLog(null);

  const [formData, setFormData] = useState<any>({});

  React.useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate(formData);
  };

  const handleSync = () => {
    syncStatus.mutate(undefined);
  };

  if (loadingConfig) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Travel & Visa Integration</h1>
            <p className="text-muted-foreground">
              Configure integration with corporate travel and visa systems
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncStatus.isPending}>
              {syncStatus.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {config?.last_sync_status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <div className="font-medium">Last Sync</div>
                  <div className="text-sm text-muted-foreground">
                    {config?.last_sync_at 
                      ? format(new Date(config.last_sync_at), 'dd MMM HH:mm')
                      : 'Never'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Sync Interval</div>
                  <div className="text-sm text-muted-foreground">
                    Every {config?.sync_interval_minutes || 60} minutes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">API Timeout</div>
                  <div className="text-sm text-muted-foreground">
                    {config?.travel_api_timeout_ms || 5000}ms
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {config?.sync_enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <div className="font-medium">Auto Sync</div>
                  <div className="text-sm text-muted-foreground">
                    {config?.sync_enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="travel-api">
          <TabsList>
            <TabsTrigger value="travel-api">Travel API</TabsTrigger>
            <TabsTrigger value="visa-api">Visa API</TabsTrigger>
            <TabsTrigger value="sync">Sync Settings</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="travel-api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Travel System Configuration</CardTitle>
                <CardDescription>
                  Configure connection to the corporate travel system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="travel_api_url">API Base URL</Label>
                    <Input
                      id="travel_api_url"
                      value={formData.travel_api_url || ''}
                      onChange={(e) => setFormData({...formData, travel_api_url: e.target.value})}
                      placeholder="https://travel-api.company.com/v1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travel_api_auth_method">Authentication Method</Label>
                    <Select
                      value={formData.travel_api_auth_method || 'api_key'}
                      onValueChange={(v) => setFormData({...formData, travel_api_auth_method: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travel_api_timeout_ms">Timeout (ms)</Label>
                    <Input
                      id="travel_api_timeout_ms"
                      type="number"
                      value={formData.travel_api_timeout_ms || 5000}
                      onChange={(e) => setFormData({...formData, travel_api_timeout_ms: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travel_api_retry_count">Retry Count</Label>
                    <Input
                      id="travel_api_retry_count"
                      type="number"
                      value={formData.travel_api_retry_count || 3}
                      onChange={(e) => setFormData({...formData, travel_api_retry_count: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="training_purpose_code">Training Purpose Code</Label>
                    <Input
                      id="training_purpose_code"
                      value={formData.training_purpose_code || 'TRN'}
                      onChange={(e) => setFormData({...formData, training_purpose_code: e.target.value})}
                      placeholder="TRN"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visa-api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Visa System Configuration</CardTitle>
                <CardDescription>
                  Configure connection to the visa/immigration system (if separate from travel)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visa_api_url">API Base URL</Label>
                    <Input
                      id="visa_api_url"
                      value={formData.visa_api_url || ''}
                      onChange={(e) => setFormData({...formData, visa_api_url: e.target.value})}
                      placeholder="https://visa-api.company.com/v1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa_api_auth_method">Authentication Method</Label>
                    <Select
                      value={formData.visa_api_auth_method || 'api_key'}
                      onValueChange={(v) => setFormData({...formData, visa_api_auth_method: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visa_api_timeout_ms">Timeout (ms)</Label>
                    <Input
                      id="visa_api_timeout_ms"
                      type="number"
                      value={formData.visa_api_timeout_ms || 5000}
                      onChange={(e) => setFormData({...formData, visa_api_timeout_ms: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Synchronization Settings</CardTitle>
                <CardDescription>
                  Configure how and when travel/visa status is synchronized
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Automatic Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync travel/visa status at regular intervals
                    </p>
                  </div>
                  <Switch
                    checked={formData.sync_enabled ?? true}
                    onCheckedChange={(v) => setFormData({...formData, sync_enabled: v})}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="sync_interval_minutes">Sync Interval (minutes)</Label>
                  <Input
                    id="sync_interval_minutes"
                    type="number"
                    value={formData.sync_interval_minutes || 60}
                    onChange={(e) => setFormData({...formData, sync_interval_minutes: parseInt(e.target.value)})}
                    disabled={!formData.sync_enabled}
                  />
                  <p className="text-sm text-muted-foreground">
                    How often to check for status updates from external systems
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
                <CardDescription>
                  Enable or disable specific features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bulk Travel Initiation</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow L&D to initiate travel for multiple participants at once
                    </p>
                  </div>
                  <Switch
                    checked={formData.enable_bulk_initiation ?? true}
                    onCheckedChange={(v) => setFormData({...formData, enable_bulk_initiation: v})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cost Display</Label>
                    <p className="text-sm text-muted-foreground">
                      Show travel cost information from external systems
                    </p>
                  </div>
                  <Switch
                    checked={formData.enable_cost_display ?? true}
                    onCheckedChange={(v) => setFormData({...formData, enable_cost_display: v})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Manual Linking</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow linking external travel/visa requests manually
                    </p>
                  </div>
                  <Switch
                    checked={formData.enable_manual_linking ?? true}
                    onCheckedChange={(v) => setFormData({...formData, enable_manual_linking: v})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  Recent travel/visa integration activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No audit logs yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogs?.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{log.action}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                {log.external_request_id || 
                                  (log.new_value ? JSON.stringify(log.new_value).substring(0, 50) + '...' : '-')
                                }
                              </TableCell>
                              <TableCell>
                                {log.error_details ? (
                                  <Badge variant="destructive">Error</Badge>
                                ) : (
                                  <Badge variant="default">Success</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}