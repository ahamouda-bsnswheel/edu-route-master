import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useExportConfigs, useSaveConfig, ExportConfig, ExportType, ExportFormat, DeliveryMethod } from '@/hooks/useExpenseExport';
import { Settings, Plus, Pencil, Copy, Trash2, FileJson, FileSpreadsheet, Globe, Server } from 'lucide-react';
import { format } from 'date-fns';

const defaultFieldMappings = [
  { lmsField: 'export_key', targetField: 'REFERENCE_ID', included: true },
  { lmsField: 'employee_payroll_id', targetField: 'EMPLOYEE_ID', included: true },
  { lmsField: 'employee_name', targetField: 'EMPLOYEE_NAME', included: true },
  { lmsField: 'expense_type', targetField: 'EXPENSE_TYPE', included: true },
  { lmsField: 'amount', targetField: 'AMOUNT', included: true },
  { lmsField: 'currency', targetField: 'CURRENCY', included: true },
  { lmsField: 'cost_centre', targetField: 'COST_CENTER', included: true },
  { lmsField: 'gl_account', targetField: 'GL_ACCOUNT', included: true },
  { lmsField: 'expense_date', targetField: 'EXPENSE_DATE', included: true },
  { lmsField: 'posting_period', targetField: 'POSTING_PERIOD', included: true },
  { lmsField: 'destination_country', targetField: 'COUNTRY', included: true },
  { lmsField: 'destination_city', targetField: 'CITY', included: false },
  { lmsField: 'training_request_id', targetField: 'TRAINING_REF', included: false },
  { lmsField: 'session_id', targetField: 'SESSION_REF', included: false },
  { lmsField: 'has_incident_adjustment', targetField: 'HAS_ADJUSTMENT', included: true },
];

interface ConfigFormData {
  config_name: string;
  export_type: ExportType;
  export_format: ExportFormat;
  delivery_method: DeliveryMethod;
  date_basis: string;
  default_gl_account: string;
  default_cost_element: string;
  sftp_host: string;
  sftp_port: number;
  sftp_path: string;
  api_endpoint: string;
  api_auth_type: string;
  is_active: boolean;
  field_mappings: typeof defaultFieldMappings;
}

const initialFormData: ConfigFormData = {
  config_name: '',
  export_type: 'per_diem',
  export_format: 'csv',
  delivery_method: 'file_download',
  date_basis: 'completion_date',
  default_gl_account: '',
  default_cost_element: '',
  sftp_host: '',
  sftp_port: 22,
  sftp_path: '',
  api_endpoint: '',
  api_auth_type: 'oauth2',
  is_active: true,
  field_mappings: defaultFieldMappings,
};

export default function ExportConfigAdmin() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigFormData>(initialFormData);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  const { data: configs, isLoading } = useExportConfigs();
  const saveConfig = useSaveConfig();

  const handleCreateNew = () => {
    setEditingConfig(initialFormData);
    setEditingConfigId(null);
    setEditDialogOpen(true);
  };

  const handleEditConfig = (config: ExportConfig) => {
    setEditingConfig({
      config_name: config.config_name,
      export_type: config.export_type,
      export_format: config.export_format,
      delivery_method: config.delivery_method,
      date_basis: config.date_basis,
      default_gl_account: config.default_gl_account || '',
      default_cost_element: config.default_cost_element || '',
      sftp_host: config.sftp_host || '',
      sftp_port: config.sftp_port || 22,
      sftp_path: config.sftp_path || '',
      api_endpoint: config.api_endpoint || '',
      api_auth_type: config.api_auth_type || 'oauth2',
      is_active: config.is_active,
      field_mappings: config.field_mappings?.length > 0 ? config.field_mappings : defaultFieldMappings,
    });
    setEditingConfigId(config.id);
    setEditDialogOpen(true);
  };

  const handleDuplicateConfig = (config: ExportConfig) => {
    setEditingConfig({
      ...editingConfig,
      config_name: `${config.config_name} (Copy)`,
      export_type: config.export_type,
      export_format: config.export_format,
      delivery_method: config.delivery_method,
      date_basis: config.date_basis,
      default_gl_account: config.default_gl_account || '',
      default_cost_element: config.default_cost_element || '',
      sftp_host: config.sftp_host || '',
      sftp_port: config.sftp_port || 22,
      sftp_path: config.sftp_path || '',
      api_endpoint: config.api_endpoint || '',
      api_auth_type: config.api_auth_type || 'oauth2',
      is_active: true,
      field_mappings: config.field_mappings?.length > 0 ? config.field_mappings : defaultFieldMappings,
    });
    setEditingConfigId(null);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    await saveConfig.mutateAsync({
      config: editingConfig,
      configId: editingConfigId || undefined,
    });
    setEditDialogOpen(false);
  };

  const toggleFieldMapping = (index: number) => {
    const newMappings = [...editingConfig.field_mappings];
    newMappings[index] = { ...newMappings[index], included: !newMappings[index].included };
    setEditingConfig({ ...editingConfig, field_mappings: newMappings });
  };

  const updateFieldMapping = (index: number, field: 'targetField', value: string) => {
    const newMappings = [...editingConfig.field_mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setEditingConfig({ ...editingConfig, field_mappings: newMappings });
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv': return <FileSpreadsheet className="h-4 w-4" />;
      case 'json': return <FileJson className="h-4 w-4" />;
      case 'xml': return <Globe className="h-4 w-4" />;
      default: return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getDeliveryIcon = (method: DeliveryMethod) => {
    switch (method) {
      case 'file_download': return <FileSpreadsheet className="h-4 w-4" />;
      case 'sftp': return <Server className="h-4 w-4" />;
      case 'api': return <Globe className="h-4 w-4" />;
      default: return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout
      title="Export Configuration"
      description="Configure export formats, field mappings, and delivery methods for Finance/ERP integration"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div />
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Configuration
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Configurations</CardTitle>
            <CardDescription>
              Manage export templates for different expense types and target systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (configs || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No export configurations found. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Configuration Name</TableHead>
                    <TableHead>Export Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Date Basis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(configs || []).map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.config_name}</TableCell>
                      <TableCell className="capitalize">{config.export_type.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getFormatIcon(config.export_format)}
                          <span className="uppercase">{config.export_format}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getDeliveryIcon(config.delivery_method)}
                          <span className="capitalize">{config.delivery_method.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{config.date_basis.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={config.is_active ? 'default' : 'secondary'}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(config.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditConfig(config)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicateConfig(config)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfigId ? 'Edit Export Configuration' : 'New Export Configuration'}
              </DialogTitle>
              <DialogDescription>
                Configure the export format, field mappings, and delivery settings
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Configuration Name</Label>
                    <Input
                      value={editingConfig.config_name}
                      onChange={(e) => setEditingConfig({ ...editingConfig, config_name: e.target.value })}
                      placeholder="e.g., Per Diem SAP Export"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Export Type</Label>
                    <Select
                      value={editingConfig.export_type}
                      onValueChange={(v) => setEditingConfig({ ...editingConfig, export_type: v as ExportType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_diem">Per Diem</SelectItem>
                        <SelectItem value="tuition">Tuition</SelectItem>
                        <SelectItem value="travel_cost">Travel Cost</SelectItem>
                        <SelectItem value="combined">Combined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select
                      value={editingConfig.export_format}
                      onValueChange={(v) => setEditingConfig({ ...editingConfig, export_format: v as ExportFormat })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="xml">XML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Basis</Label>
                    <Select
                      value={editingConfig.date_basis}
                      onValueChange={(v) => setEditingConfig({ ...editingConfig, date_basis: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completion_date">Training Completion Date</SelectItem>
                        <SelectItem value="travel_completion">Travel Completion Date</SelectItem>
                        <SelectItem value="posting_period">Posting Period</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default GL Account</Label>
                    <Input
                      value={editingConfig.default_gl_account}
                      onChange={(e) => setEditingConfig({ ...editingConfig, default_gl_account: e.target.value })}
                      placeholder="e.g., 6100100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Cost Element</Label>
                    <Input
                      value={editingConfig.default_cost_element}
                      onChange={(e) => setEditingConfig({ ...editingConfig, default_cost_element: e.target.value })}
                      placeholder="e.g., TRAINING_PD"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingConfig.is_active}
                    onCheckedChange={(v) => setEditingConfig({ ...editingConfig, is_active: v })}
                  />
                  <Label>Active Configuration</Label>
                </div>
              </TabsContent>

              <TabsContent value="mappings" className="space-y-4 mt-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Configure which fields to include in the export and their target field names for the ERP/Finance system.
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Include</TableHead>
                      <TableHead>LMS Field</TableHead>
                      <TableHead>Target Field Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editingConfig.field_mappings.map((mapping, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Switch
                            checked={mapping.included}
                            onCheckedChange={() => toggleFieldMapping(index)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{mapping.lmsField}</TableCell>
                        <TableCell>
                          <Input
                            value={mapping.targetField}
                            onChange={(e) => updateFieldMapping(index, 'targetField', e.target.value)}
                            disabled={!mapping.included}
                            className="font-mono"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="delivery" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Delivery Method</Label>
                  <Select
                    value={editingConfig.delivery_method}
                    onValueChange={(v) => setEditingConfig({ ...editingConfig, delivery_method: v as DeliveryMethod })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file_download">File Download</SelectItem>
                      <SelectItem value="sftp">SFTP Upload</SelectItem>
                      <SelectItem value="api">API Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingConfig.delivery_method === 'sftp' && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">SFTP Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SFTP Host</Label>
                        <Input
                          value={editingConfig.sftp_host}
                          onChange={(e) => setEditingConfig({ ...editingConfig, sftp_host: e.target.value })}
                          placeholder="sftp.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input
                          type="number"
                          value={editingConfig.sftp_port}
                          onChange={(e) => setEditingConfig({ ...editingConfig, sftp_port: parseInt(e.target.value) || 22 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Remote Path</Label>
                      <Input
                        value={editingConfig.sftp_path}
                        onChange={(e) => setEditingConfig({ ...editingConfig, sftp_path: e.target.value })}
                        placeholder="/uploads/training-expenses/"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Note: SFTP credentials should be configured in system secrets.
                    </p>
                  </div>
                )}

                {editingConfig.delivery_method === 'api' && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">API Settings</h4>
                    <div className="space-y-2">
                      <Label>API Endpoint</Label>
                      <Input
                        value={editingConfig.api_endpoint}
                        onChange={(e) => setEditingConfig({ ...editingConfig, api_endpoint: e.target.value })}
                        placeholder="https://erp.example.com/api/expenses"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Authentication Type</Label>
                      <Select
                        value={editingConfig.api_auth_type}
                        onValueChange={(v) => setEditingConfig({ ...editingConfig, api_auth_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="client_cert">Client Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Note: API credentials should be configured in system secrets.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!editingConfig.config_name || saveConfig.isPending}
              >
                {saveConfig.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
