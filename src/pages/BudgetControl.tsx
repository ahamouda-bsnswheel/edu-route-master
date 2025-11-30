import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  useBudgets,
  useSaveBudget,
  useActivateBudget,
  useImportBudgets,
  useThresholds,
  useSaveThreshold,
  useBudgetAudit,
  budgetStatusLabels,
  budgetStatusColors,
  TrainingBudget,
  BudgetStatus,
  BudgetPeriodType,
  BudgetThreshold,
} from '@/hooks/useCostDashboard';
import { Plus, Pencil, CheckCircle, Upload, AlertTriangle, History, Settings } from 'lucide-react';
import { format } from 'date-fns';

const TRAINING_CATEGORIES = ['HSE', 'Technical', 'Leadership', 'Compliance', 'Soft Skills', 'IT', 'Other'];

export default function BudgetControl() {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Partial<TrainingBudget> | null>(null);
  const [editingThreshold, setEditingThreshold] = useState<Partial<BudgetThreshold> | null>(null);

  const { data: budgets, isLoading: loadingBudgets } = useBudgets({ fiscalYear });
  const { data: thresholds, isLoading: loadingThresholds } = useThresholds();
  const { data: auditLog } = useBudgetAudit();

  const saveBudget = useSaveBudget();
  const activateBudget = useActivateBudget();
  const importBudgets = useImportBudgets();
  const saveThreshold = useSaveThreshold();

  const formatCurrency = (amount: number, currency: string = 'LYD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreateBudget = () => {
    setEditingBudget({
      fiscal_year: fiscalYear,
      period_type: 'annual',
      period_number: 1,
      entity: '',
      cost_centre: '',
      training_category: '',
      budget_type: 'combined',
      budget_amount: 0,
      currency: 'LYD',
      version: 1,
      version_name: 'Initial',
      status: 'draft',
      notes: '',
    });
    setEditDialogOpen(true);
  };

  const handleEditBudget = (budget: TrainingBudget) => {
    setEditingBudget({ ...budget });
    setEditDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!editingBudget) return;
    await saveBudget.mutateAsync({
      budget: editingBudget,
      budgetId: (editingBudget as TrainingBudget).id,
    });
    setEditDialogOpen(false);
    setEditingBudget(null);
  };

  const handleCreateThreshold = () => {
    setEditingThreshold({
      threshold_name: '',
      threshold_type: 'warning',
      threshold_percentage: 90,
      applies_to: 'all',
      is_active: true,
    });
    setThresholdDialogOpen(true);
  };

  const handleSaveThreshold = async () => {
    if (!editingThreshold) return;
    await saveThreshold.mutateAsync({
      threshold: editingThreshold,
      thresholdId: (editingThreshold as BudgetThreshold).id,
    });
    setThresholdDialogOpen(false);
    setEditingThreshold(null);
  };

  // Calculate totals
  const activeBudgets = (budgets || []).filter(b => b.status === 'active');
  const totalBudget = activeBudgets.reduce((sum, b) => sum + Number(b.budget_amount), 0);

  return (
    <DashboardLayout
      title="Budget Control"
      description="Define and manage training budgets by entity, category, and period"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Active Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
              <p className="text-xs text-muted-foreground">
                {activeBudgets.length} active budget lines
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Draft Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(budgets || []).filter(b => b.status === 'draft').length}
              </div>
              <p className="text-xs text-muted-foreground">Pending activation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Alert Thresholds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(thresholds || []).filter(t => t.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">Active thresholds</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="budgets" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="budgets" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreateBudget}>
                <Plus className="h-4 w-4 mr-2" />
                Add Budget
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Budget Definitions - {fiscalYear}</CardTitle>
                <CardDescription>
                  Define training budgets by entity, cost centre, and category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBudgets ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (budgets || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No budgets defined for {fiscalYear}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Cost Centre</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(budgets || []).map((budget) => (
                        <TableRow key={budget.id}>
                          <TableCell className="font-medium">{budget.entity || 'All'}</TableCell>
                          <TableCell>{budget.cost_centre || 'All'}</TableCell>
                          <TableCell>{budget.training_category || 'All'}</TableCell>
                          <TableCell className="capitalize">{budget.budget_type.replace('_', ' ')}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(budget.budget_amount, budget.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">v{budget.version}</Badge>
                            <span className="ml-2 text-xs text-muted-foreground">{budget.version_name}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={budgetStatusColors[budget.status]}>
                              {budgetStatusLabels[budget.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBudget(budget)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {budget.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => activateBudget.mutate(budget.id)}
                                  disabled={activateBudget.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreateThreshold}>
                <Plus className="h-4 w-4 mr-2" />
                Add Threshold
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Budget Alert Thresholds</CardTitle>
                <CardDescription>
                  Configure warnings and hard stops for budget control during approvals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingThresholds ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (thresholds || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No thresholds configured
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Threshold Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Applies To</TableHead>
                        <TableHead>Additional Approval</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(thresholds || []).map((threshold) => (
                        <TableRow key={threshold.id}>
                          <TableCell className="font-medium">{threshold.threshold_name}</TableCell>
                          <TableCell>
                            <Badge variant={threshold.threshold_type === 'hard_stop' ? 'destructive' : 'secondary'}>
                              {threshold.threshold_type === 'hard_stop' ? 'Hard Stop' : 'Warning'}
                            </Badge>
                          </TableCell>
                          <TableCell>{threshold.threshold_percentage}%</TableCell>
                          <TableCell className="capitalize">{threshold.applies_to}</TableCell>
                          <TableCell>{threshold.requires_approval_role || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={threshold.is_active ? 'default' : 'outline'}>
                              {threshold.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Audit Log</CardTitle>
                <CardDescription>
                  History of budget changes and activations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(auditLog || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit records
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditLog || []).map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                          <TableCell className="capitalize">{log.action.replace('_', ' ')}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {log.justification || JSON.stringify(log.new_values)?.substring(0, 100)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Budget Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBudget?.id ? 'Edit Budget' : 'New Budget'}
              </DialogTitle>
              <DialogDescription>
                Define budget allocation for training expenses
              </DialogDescription>
            </DialogHeader>
            {editingBudget && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fiscal Year</Label>
                    <Input
                      type="number"
                      value={editingBudget.fiscal_year || fiscalYear}
                      onChange={(e) => setEditingBudget({ ...editingBudget, fiscal_year: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period Type</Label>
                    <Select
                      value={editingBudget.period_type || 'annual'}
                      onValueChange={(v) => setEditingBudget({ ...editingBudget, period_type: v as BudgetPeriodType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity (leave blank for all)</Label>
                    <Input
                      value={editingBudget.entity || ''}
                      onChange={(e) => setEditingBudget({ ...editingBudget, entity: e.target.value })}
                      placeholder="e.g., Operations"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Centre (leave blank for all)</Label>
                    <Input
                      value={editingBudget.cost_centre || ''}
                      onChange={(e) => setEditingBudget({ ...editingBudget, cost_centre: e.target.value })}
                      placeholder="e.g., CC-1001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Training Category</Label>
                    <Select
                      value={editingBudget.training_category || ''}
                      onValueChange={(v) => setEditingBudget({ ...editingBudget, training_category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {TRAINING_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Budget Type</Label>
                    <Select
                      value={editingBudget.budget_type || 'combined'}
                      onValueChange={(v) => setEditingBudget({ ...editingBudget, budget_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="combined">Combined (All Costs)</SelectItem>
                        <SelectItem value="tuition">Tuition Only</SelectItem>
                        <SelectItem value="travel_per_diem">Travel & Per Diem Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget Amount</Label>
                    <Input
                      type="number"
                      value={editingBudget.budget_amount || 0}
                      onChange={(e) => setEditingBudget({ ...editingBudget, budget_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={editingBudget.currency || 'LYD'}
                      onValueChange={(v) => setEditingBudget({ ...editingBudget, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LYD">LYD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Version Name</Label>
                    <Input
                      value={editingBudget.version_name || 'Initial'}
                      onChange={(e) => setEditingBudget({ ...editingBudget, version_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editingBudget.notes || ''}
                    onChange={(e) => setEditingBudget({ ...editingBudget, notes: e.target.value })}
                    placeholder="Additional notes or justification..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBudget} disabled={saveBudget.isPending}>
                {saveBudget.isPending ? 'Saving...' : 'Save Budget'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Threshold Edit Dialog */}
        <Dialog open={thresholdDialogOpen} onOpenChange={setThresholdDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingThreshold?.id ? 'Edit Threshold' : 'New Threshold'}
              </DialogTitle>
              <DialogDescription>
                Configure budget alert thresholds for approval workflows
              </DialogDescription>
            </DialogHeader>
            {editingThreshold && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Threshold Name</Label>
                  <Input
                    value={editingThreshold.threshold_name || ''}
                    onChange={(e) => setEditingThreshold({ ...editingThreshold, threshold_name: e.target.value })}
                    placeholder="e.g., Budget Warning at 90%"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={editingThreshold.threshold_type || 'warning'}
                      onValueChange={(v) => setEditingThreshold({ ...editingThreshold, threshold_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="hard_stop">Hard Stop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Percentage</Label>
                    <Input
                      type="number"
                      value={editingThreshold.threshold_percentage || 90}
                      onChange={(e) => setEditingThreshold({ ...editingThreshold, threshold_percentage: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <Select
                    value={editingThreshold.applies_to || 'all'}
                    onValueChange={(v) => setEditingThreshold({ ...editingThreshold, applies_to: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Budgets</SelectItem>
                      <SelectItem value="entity">By Entity</SelectItem>
                      <SelectItem value="category">By Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Requires Additional Approval Role (optional)</Label>
                  <Select
                    value={editingThreshold.requires_approval_role || ''}
                    onValueChange={(v) => setEditingThreshold({ ...editingThreshold, requires_approval_role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="chro">CHRO</SelectItem>
                      <SelectItem value="l_and_d">L&D Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingThreshold.is_active ?? true}
                    onCheckedChange={(v) => setEditingThreshold({ ...editingThreshold, is_active: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setThresholdDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveThreshold} disabled={saveThreshold.isPending}>
                {saveThreshold.isPending ? 'Saving...' : 'Save Threshold'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
