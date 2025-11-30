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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useExportBatches,
  useExportSummary,
  useReconciliation,
  useCreateBatch,
  usePullRecords,
  useValidateBatch,
  useExportBatchMutation,
  useReExportBatch,
  useMarkPosted,
  useDeleteBatch,
  batchStatusLabels,
  batchStatusColors,
  exportTypeLabels,
  ExportBatch,
  ExportType,
} from '@/hooks/useExpenseExport';
import { 
  FileSpreadsheet, 
  Plus, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Trash2,
  Eye,
  DollarSign,
  TrendingUp,
  FileCheck,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function ExpenseExportConsole() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Form state for new batch
  const [newBatch, setNewBatch] = useState({
    exportType: 'per_diem' as ExportType,
    periodStart: '',
    periodEnd: '',
  });

  // Queries
  const { data: batches, isLoading: loadingBatches } = useExportBatches({
    status: statusFilter || undefined,
    exportType: typeFilter || undefined,
  });
  const { data: summary, isLoading: loadingSummary } = useExportSummary();
  const { data: reconciliation, isLoading: loadingReconciliation } = useReconciliation();

  // Mutations
  const createBatch = useCreateBatch();
  const pullRecords = usePullRecords();
  const validateBatch = useValidateBatch();
  const exportBatch = useExportBatchMutation();
  const reExportBatch = useReExportBatch();
  const markPosted = useMarkPosted();
  const deleteBatch = useDeleteBatch();

  const handleCreateBatch = async () => {
    const batch = await createBatch.mutateAsync(newBatch);
    setCreateDialogOpen(false);
    setNewBatch({ exportType: 'per_diem', periodStart: '', periodEnd: '' });
    // Auto-pull records
    if (batch?.id) {
      await pullRecords.mutateAsync(batch.id);
    }
  };

  const handleBatchAction = async (batch: ExportBatch, action: string) => {
    switch (action) {
      case 'pull':
        await pullRecords.mutateAsync(batch.id);
        break;
      case 'validate':
        await validateBatch.mutateAsync(batch.id);
        break;
      case 'export':
        await exportBatch.mutateAsync(batch.id);
        break;
      case 're_export':
        await reExportBatch.mutateAsync(batch.id);
        break;
      case 'mark_posted':
        await markPosted.mutateAsync({ batchId: batch.id });
        break;
      case 'delete':
        await deleteBatch.mutateAsync(batch.id);
        break;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'LYD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout
      title="Training Expense Exports"
      description="Manage and export training-related expense data to Finance/ERP systems"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exported</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.totalExported || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.totalRecords || 0} records
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Export Batches</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summary?.totalBatches || 0}</div>
                  <p className="text-xs text-muted-foreground">Total batches</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posted in Finance</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingReconciliation ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(reconciliation?.postedAmount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reconciliation?.postedCount || 0} records posted
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Posting</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingReconciliation ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(reconciliation?.pendingAmount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reconciliation?.pendingCount || 0} awaiting posting
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reconciliation Alert */}
        {reconciliation && reconciliation.variance !== 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Reconciliation variance detected: {formatCurrency(Math.abs(reconciliation.variance))} difference between exported and posted amounts.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="batches" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="batches">Export Batches</TabsTrigger>
              <TabsTrigger value="summary">Spend Summary</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            </TabsList>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Batch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Export Batch</DialogTitle>
                  <DialogDescription>
                    Create a new expense export batch for a specific period
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Export Type</Label>
                    <Select
                      value={newBatch.exportType}
                      onValueChange={(v) => setNewBatch({ ...newBatch, exportType: v as ExportType })}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input
                        type="date"
                        value={newBatch.periodStart}
                        onChange={(e) => setNewBatch({ ...newBatch, periodStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input
                        type="date"
                        value={newBatch.periodEnd}
                        onChange={(e) => setNewBatch({ ...newBatch, periodEnd: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateBatch}
                    disabled={!newBatch.periodStart || !newBatch.periodEnd || createBatch.isPending}
                  >
                    {createBatch.isPending ? 'Creating...' : 'Create & Pull Records'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="batches" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="validated">Validated</SelectItem>
                        <SelectItem value="exported">Exported</SelectItem>
                        <SelectItem value="re_exported">Re-exported</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="per_diem">Per Diem</SelectItem>
                        <SelectItem value="tuition">Tuition</SelectItem>
                        <SelectItem value="travel_cost">Travel Cost</SelectItem>
                        <SelectItem value="combined">Combined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Batches Table */}
            <Card>
              <CardContent className="pt-6">
                {loadingBatches ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(batches || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No export batches found
                          </TableCell>
                        </TableRow>
                      ) : (
                        (batches || []).map((batch) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">{batch.batch_number}</TableCell>
                            <TableCell>{exportTypeLabels[batch.export_type]}</TableCell>
                            <TableCell>
                              {format(new Date(batch.period_start), 'MMM d')} - {format(new Date(batch.period_end), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{batch.total_records} total</span>
                                {batch.error_records > 0 && (
                                  <span className="text-xs text-destructive">{batch.error_records} errors</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(batch.total_amount, batch.currency)}</TableCell>
                            <TableCell>
                              <Badge className={batchStatusColors[batch.status]}>
                                {batchStatusLabels[batch.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(batch.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/expense-export/${batch.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {batch.status === 'draft' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleBatchAction(batch, 'pull')}
                                      disabled={pullRecords.isPending}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleBatchAction(batch, 'validate')}
                                      disabled={validateBatch.isPending}
                                    >
                                      <FileCheck className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleBatchAction(batch, 'delete')}
                                      disabled={deleteBatch.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {batch.status === 'validated' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleBatchAction(batch, 'export')}
                                    disabled={exportBatch.isPending}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                {(batch.status === 'exported' || batch.status === 're_exported') && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleBatchAction(batch, 're_export')}
                                      disabled={reExportBatch.isPending}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleBatchAction(batch, 'mark_posted')}
                                      disabled={markPosted.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* By Country */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">By Destination Country</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSummary ? (
                    <Skeleton className="h-48" />
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(summary?.byCountry || {}).map(([country, amount]) => (
                        <div key={country} className="flex items-center justify-between">
                          <span>{country}</span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {Object.keys(summary?.byCountry || {}).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">No data available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By Expense Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">By Expense Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSummary ? (
                    <Skeleton className="h-48" />
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(summary?.byExpenseType || {}).map(([type, amount]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span>{type}</span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {Object.keys(summary?.byExpenseType || {}).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">No data available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By Month */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">By Posting Period</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSummary ? (
                    <Skeleton className="h-48" />
                  ) : (
                    <div className="grid gap-2 md:grid-cols-4">
                      {Object.entries(summary?.byMonth || {})
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([month, amount]) => (
                          <div key={month} className="flex items-center justify-between p-2 border rounded">
                            <span>{month}</span>
                            <span className="font-medium">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                      {Object.keys(summary?.byMonth || {}).length === 0 && (
                        <p className="text-muted-foreground text-center py-4 col-span-4">No data available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Export vs Finance Reconciliation</CardTitle>
                <CardDescription>
                  Compare exported amounts with posted amounts in Finance/ERP
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReconciliation ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Exported from LMS</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatCurrency(reconciliation?.exportedAmount || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {reconciliation?.exportedCount || 0} records
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Posted in Finance</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatCurrency(reconciliation?.postedAmount || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {reconciliation?.postedCount || 0} records
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Variance</div>
                        <div className={`text-2xl font-bold mt-1 ${
                          (reconciliation?.variance || 0) !== 0 ? 'text-destructive' : 'text-green-600'
                        }`}>
                          {formatCurrency(reconciliation?.variance || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {reconciliation?.failedCount || 0} failed
                        </div>
                      </div>
                    </div>

                    {(reconciliation?.pendingCount || 0) > 0 && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          {reconciliation?.pendingCount} records ({formatCurrency(reconciliation?.pendingAmount || 0)}) are exported but not yet marked as posted in Finance.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}