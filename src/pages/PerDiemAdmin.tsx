import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  usePerDiemDestinationBands, 
  useCreateDestinationBand, 
  useUpdateDestinationBand,
  usePerDiemGradeBands,
  useCreateGradeBand,
  useUpdateGradeBand,
  usePerDiemPolicyConfig,
  useUpdatePolicyConfig,
  usePerDiemAuditLog,
} from '@/hooks/usePerDiem';
import { Plus, Edit, Globe, Users, Settings, History, DollarSign, Percent } from 'lucide-react';
import { format } from 'date-fns';

export default function PerDiemAdmin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('destinations');
  const [showDestinationDialog, setShowDestinationDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [editingGrade, setEditingGrade] = useState<any>(null);

  // Data hooks
  const { data: destinationBands, isLoading: loadingDestinations } = usePerDiemDestinationBands();
  const { data: gradeBands, isLoading: loadingGrades } = usePerDiemGradeBands();
  const { data: policyConfigs, isLoading: loadingPolicies } = usePerDiemPolicyConfig();
  const { data: auditLogs, isLoading: loadingAudit } = usePerDiemAuditLog();

  // Mutations
  const createDestination = useCreateDestinationBand();
  const updateDestination = useUpdateDestinationBand();
  const createGrade = useCreateGradeBand();
  const updateGrade = useUpdateGradeBand();
  const updatePolicy = useUpdatePolicyConfig();

  // Form state for destination bands
  const [destForm, setDestForm] = useState({
    country: '',
    city: '',
    band: 'B',
    currency: 'USD',
    training_daily_rate: 0,
    business_daily_rate: 0,
    is_domestic: false,
    valid_from: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  // Form state for grade bands
  const [gradeForm, setGradeForm] = useState({
    band_name: '',
    grade_from: 1,
    grade_to: 5,
    multiplier: 1.0,
    fixed_rate_override: null as number | null,
    currency: '',
    valid_from: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  const handleSaveDestination = async () => {
    try {
      if (editingDestination) {
        await updateDestination.mutateAsync({
          id: editingDestination.id,
          ...destForm,
        });
        toast({ title: 'Destination band updated' });
      } else {
        await createDestination.mutateAsync(destForm as any);
        toast({ title: 'Destination band created' });
      }
      setShowDestinationDialog(false);
      setEditingDestination(null);
      resetDestForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveGrade = async () => {
    try {
      if (editingGrade) {
        await updateGrade.mutateAsync({
          id: editingGrade.id,
          ...gradeForm,
        });
        toast({ title: 'Grade band updated' });
      } else {
        await createGrade.mutateAsync(gradeForm as any);
        toast({ title: 'Grade band created' });
      }
      setShowGradeDialog(false);
      setEditingGrade(null);
      resetGradeForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdatePolicy = async (id: string, config_value: Record<string, any>) => {
    try {
      await updatePolicy.mutateAsync({ id, config_value });
      toast({ title: 'Policy updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetDestForm = () => {
    setDestForm({
      country: '',
      city: '',
      band: 'B',
      currency: 'USD',
      training_daily_rate: 0,
      business_daily_rate: 0,
      is_domestic: false,
      valid_from: new Date().toISOString().split('T')[0],
      is_active: true,
    });
  };

  const resetGradeForm = () => {
    setGradeForm({
      band_name: '',
      grade_from: 1,
      grade_to: 5,
      multiplier: 1.0,
      fixed_rate_override: null,
      currency: '',
      valid_from: new Date().toISOString().split('T')[0],
      is_active: true,
    });
  };

  const openEditDestination = (dest: any) => {
    setEditingDestination(dest);
    setDestForm({
      country: dest.country,
      city: dest.city || '',
      band: dest.band,
      currency: dest.currency,
      training_daily_rate: dest.training_daily_rate,
      business_daily_rate: dest.business_daily_rate || 0,
      is_domestic: dest.is_domestic,
      valid_from: dest.valid_from,
      is_active: dest.is_active,
    });
    setShowDestinationDialog(true);
  };

  const openEditGrade = (grade: any) => {
    setEditingGrade(grade);
    setGradeForm({
      band_name: grade.band_name,
      grade_from: grade.grade_from,
      grade_to: grade.grade_to,
      multiplier: grade.multiplier,
      fixed_rate_override: grade.fixed_rate_override,
      currency: grade.currency || '',
      valid_from: grade.valid_from,
      is_active: grade.is_active,
    });
    setShowGradeDialog(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Per Diem Policy Configuration</h1>
            <p className="text-muted-foreground">
              Configure destination bands, grade bands, and calculation rules
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="destinations" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Destination Bands
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Grade Bands
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Policy Rules
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Destination Bands Tab */}
          <TabsContent value="destinations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Destination Per Diem Rates</CardTitle>
                  <CardDescription>
                    Configure per diem rates by country/city and band
                  </CardDescription>
                </div>
                <Dialog open={showDestinationDialog} onOpenChange={setShowDestinationDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingDestination(null); resetDestForm(); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Destination
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingDestination ? 'Edit' : 'Add'} Destination Band</DialogTitle>
                      <DialogDescription>
                        Configure per diem rate for a destination
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Country *</Label>
                          <Input
                            value={destForm.country}
                            onChange={(e) => setDestForm({ ...destForm, country: e.target.value })}
                            placeholder="e.g., United Kingdom"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>City (optional)</Label>
                          <Input
                            value={destForm.city}
                            onChange={(e) => setDestForm({ ...destForm, city: e.target.value })}
                            placeholder="e.g., London"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Band</Label>
                          <Select value={destForm.band} onValueChange={(v) => setDestForm({ ...destForm, band: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">Band A (High)</SelectItem>
                              <SelectItem value="B">Band B (Medium)</SelectItem>
                              <SelectItem value="C">Band C (Low)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select value={destForm.currency} onValueChange={(v) => setDestForm({ ...destForm, currency: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="LYD">LYD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Training Rate/Day *</Label>
                          <Input
                            type="number"
                            value={destForm.training_daily_rate}
                            onChange={(e) => setDestForm({ ...destForm, training_daily_rate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Business Rate/Day</Label>
                          <Input
                            type="number"
                            value={destForm.business_daily_rate}
                            onChange={(e) => setDestForm({ ...destForm, business_daily_rate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Valid From</Label>
                        <Input
                          type="date"
                          value={destForm.valid_from}
                          onChange={(e) => setDestForm({ ...destForm, valid_from: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={destForm.is_domestic}
                            onCheckedChange={(v) => setDestForm({ ...destForm, is_domestic: v })}
                          />
                          <Label>Domestic Destination</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={destForm.is_active}
                            onCheckedChange={(v) => setDestForm({ ...destForm, is_active: v })}
                          />
                          <Label>Active</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDestinationDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveDestination} disabled={createDestination.isPending || updateDestination.isPending}>
                        {editingDestination ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingDestinations ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Band</TableHead>
                        <TableHead>Training Rate</TableHead>
                        <TableHead>Business Rate</TableHead>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {destinationBands?.map((dest) => (
                        <TableRow key={dest.id}>
                          <TableCell className="font-medium">{dest.country}</TableCell>
                          <TableCell>{dest.city || '(All)'}</TableCell>
                          <TableCell>
                            <Badge variant={dest.band === 'A' ? 'default' : dest.band === 'B' ? 'secondary' : 'outline'}>
                              Band {dest.band}
                            </Badge>
                          </TableCell>
                          <TableCell>{dest.currency} {dest.training_daily_rate}</TableCell>
                          <TableCell>{dest.business_daily_rate ? `${dest.currency} ${dest.business_daily_rate}` : '-'}</TableCell>
                          <TableCell>{format(new Date(dest.valid_from), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={dest.is_active ? 'default' : 'secondary'}>
                              {dest.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEditDestination(dest)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!destinationBands || destinationBands.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No destination bands configured. Add your first destination.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grade Bands Tab */}
          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Grade-Based Per Diem Adjustments</CardTitle>
                  <CardDescription>
                    Configure multipliers or fixed rates based on employee grade
                  </CardDescription>
                </div>
                <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingGrade(null); resetGradeForm(); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Grade Band
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingGrade ? 'Edit' : 'Add'} Grade Band</DialogTitle>
                      <DialogDescription>
                        Configure per diem adjustments for a grade range
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Band Name *</Label>
                        <Input
                          value={gradeForm.band_name}
                          onChange={(e) => setGradeForm({ ...gradeForm, band_name: e.target.value })}
                          placeholder="e.g., Junior Staff"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Grade From *</Label>
                          <Input
                            type="number"
                            value={gradeForm.grade_from}
                            onChange={(e) => setGradeForm({ ...gradeForm, grade_from: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Grade To *</Label>
                          <Input
                            type="number"
                            value={gradeForm.grade_to}
                            onChange={(e) => setGradeForm({ ...gradeForm, grade_to: parseInt(e.target.value) || 5 })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Multiplier</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={gradeForm.multiplier}
                            onChange={(e) => setGradeForm({ ...gradeForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                          />
                          <p className="text-xs text-muted-foreground">e.g., 1.2 = 120% of base rate</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Fixed Rate Override</Label>
                          <Input
                            type="number"
                            value={gradeForm.fixed_rate_override || ''}
                            onChange={(e) => setGradeForm({ ...gradeForm, fixed_rate_override: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="Leave empty to use multiplier"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Valid From</Label>
                        <Input
                          type="date"
                          value={gradeForm.valid_from}
                          onChange={(e) => setGradeForm({ ...gradeForm, valid_from: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={gradeForm.is_active}
                          onCheckedChange={(v) => setGradeForm({ ...gradeForm, is_active: v })}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowGradeDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveGrade} disabled={createGrade.isPending || updateGrade.isPending}>
                        {editingGrade ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingGrades ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Band Name</TableHead>
                        <TableHead>Grade Range</TableHead>
                        <TableHead>Multiplier</TableHead>
                        <TableHead>Fixed Override</TableHead>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeBands?.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.band_name}</TableCell>
                          <TableCell>{grade.grade_from} - {grade.grade_to}</TableCell>
                          <TableCell>{(grade.multiplier * 100).toFixed(0)}%</TableCell>
                          <TableCell>{grade.fixed_rate_override ? `${grade.currency || ''} ${grade.fixed_rate_override}` : '-'}</TableCell>
                          <TableCell>{format(new Date(grade.valid_from), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={grade.is_active ? 'default' : 'secondary'}>
                              {grade.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEditGrade(grade)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!gradeBands || gradeBands.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No grade bands configured. Add your first grade band.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policy Rules Tab */}
          <TabsContent value="policies" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {policyConfigs?.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {policy.config_key === 'travel_day_rate' && <Percent className="h-4 w-4" />}
                      {policy.config_key === 'override_approval_threshold' && <DollarSign className="h-4 w-4" />}
                      {policy.config_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                    <CardDescription className="text-sm">{policy.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PolicyConfigEditor
                      policy={policy}
                      onUpdate={(value) => handleUpdatePolicy(policy.id, value)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>History of all per diem configuration changes</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Field Changed</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.entity_type}</Badge>
                          </TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.field_changed || '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{log.old_value || '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{log.new_value || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {(!auditLogs || auditLogs.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No audit logs yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Helper component for policy config editing
function PolicyConfigEditor({ 
  policy, 
  onUpdate 
}: { 
  policy: any; 
  onUpdate: (value: Record<string, any>) => void;
}) {
  const [value, setValue] = useState(policy.config_value);

  const handleChange = (key: string, newValue: any) => {
    const updated = { ...value, [key]: newValue };
    setValue(updated);
  };

  const handleSave = () => {
    onUpdate(value);
  };

  // Render different inputs based on config type
  if (policy.config_key.includes('threshold') || policy.config_key.includes('rate')) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label>Percentage</Label>
          <Input
            type="number"
            value={value.percentage || 0}
            onChange={(e) => handleChange('percentage', parseInt(e.target.value) || 0)}
          />
        </div>
        <Button onClick={handleSave} size="sm" className="mt-6">Save</Button>
      </div>
    );
  }

  if (policy.config_key.includes('days')) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label>Days</Label>
          <Input
            type="number"
            value={value.days || 0}
            onChange={(e) => handleChange('days', parseInt(e.target.value) || 0)}
          />
        </div>
        <Button onClick={handleSave} size="sm" className="mt-6">Save</Button>
      </div>
    );
  }

  if (policy.config_key.includes('time')) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>Hour (24h)</Label>
            <Input
              type="number"
              min="0"
              max="23"
              value={value.hour || 0}
              onChange={(e) => handleChange('hour', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={value.half_day_before || value.half_day_after || false}
            onCheckedChange={(v) => handleChange(value.half_day_before !== undefined ? 'half_day_before' : 'half_day_after', v)}
          />
          <Label>Apply half-day rule</Label>
        </div>
        <Button onClick={handleSave} size="sm">Save</Button>
      </div>
    );
  }

  if (policy.config_key.includes('included') || policy.config_key.includes('enabled')) {
    const boolKey = Object.keys(value).find(k => typeof value[k] === 'boolean') || 'enabled';
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={value[boolKey] ?? value.training ?? false}
            onCheckedChange={(v) => {
              if (value.training !== undefined) {
                handleChange('training', v);
                handleChange('business', v);
              } else {
                handleChange(boolKey, v);
              }
            }}
          />
          <Label>Enabled</Label>
        </div>
        <Button onClick={handleSave} size="sm">Save</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(value, null, 2)}</pre>
      <Button onClick={handleSave} size="sm">Save</Button>
    </div>
  );
}
