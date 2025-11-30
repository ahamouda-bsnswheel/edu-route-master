import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useExportBatch,
  useExportRecords,
  usePullRecords,
  useValidateBatch,
  useExportBatchMutation,
  useReExportBatch,
  useMarkPosted,
  useDeferRecords,
  batchStatusLabels,
  batchStatusColors,
  recordStatusLabels,
  recordStatusColors,
  exportTypeLabels,
  ExportRecord,
  ExportRecordStatus,
} from '@/hooks/useExpenseExport';
import { 
  ArrowLeft,
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  FileCheck,
  Clock,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function ExpenseExportDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // Queries
  const { data: batch, isLoading: loadingBatch } = useExportBatch(batchId);
  const { data: records, isLoading: loadingRecords } = useExportRecords(batchId, {
    status: statusFilter || undefined,
  });

  // Mutations
  const pullRecords = usePullRecords();
  const validateBatch = useValidateBatch();
  const exportBatch = useExportBatchMutation();
  const reExportBatch = useReExportBatch();
  const markPosted = useMarkPosted();
  const deferRecords = useDeferRecords();

  const formatCurrency = (amount: number, currency: string = 'LYD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const toggleRecord = (recordId: string) => {
    const newSet = new Set(selectedRecords);
    if (newSet.has(recordId)) {
      newSet.delete(recordId);
    } else {
      newSet.add(recordId);
    }
    setSelectedRecords(newSet);
  };

  const toggleAll = () => {
    if (selectedRecords.size === (records || []).length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set((records || []).map(r => r.id)));
    }
  };

  const handleDeferSelected = async () => {
    if (selectedRecords.size === 0 || !batchId) return;
    await deferRecords.mutateAsync({
      batchId,
      recordIds: Array.from(selectedRecords),
    });
    setSelectedRecords(new Set());
  };

  const handleMarkSelectedPosted = async () => {
    if (selectedRecords.size === 0 || !batchId) return;
    await markPosted.mutateAsync({
      batchId,
      recordIds: Array.from(selectedRecords),
    });
    setSelectedRecords(new Set());
  };

  if (loadingBatch) {
    return (
      <DashboardLayout title="Export Batch Details" description="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!batch) {
    return (
      <DashboardLayout title="Export Batch Details" description="">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Batch not found</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Export Batch ${batch.batch_number}`}
      description={`${exportTypeLabels[batch.export_type]} export for ${format(new Date(batch.period_start), 'MMM d')} - ${format(new Date(batch.period_end), 'MMM d, yyyy')}`}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate('/expense-exports')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exports
        </Button>

        {/* Batch Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Batch Summary</CardTitle>
                <CardDescription>
                  Created on {format(new Date(batch.created_at), 'PPP')}
                </CardDescription>
              </div>
              <Badge className={batchStatusColors[batch.status]}>
                {batchStatusLabels[batch.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Records</div>
                <div className="text-2xl font-bold">{batch.total_records}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold">{formatCurrency(batch.total_amount, batch.currency)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Valid / Errors</div>
                <div className="text-2xl font-bold">
                  <span className="text-green-600">{batch.valid_records}</span>
                  {' / '}
                  <span className={batch.error_records > 0 ? 'text-destructive' : ''}>
                    {batch.error_records}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Deferred</div>
                <div className="text-2xl font-bold">{batch.deferred_records}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              {batch.status === 'draft' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => pullRecords.mutateAsync(batch.id)}
                    disabled={pullRecords.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Records
                  </Button>
                  <Button
                    onClick={() => validateBatch.mutateAsync(batch.id)}
                    disabled={validateBatch.isPending || batch.total_records === 0}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Validate Batch
                  </Button>
                </>
              )}
              {batch.status === 'validated' && (
                <Button
                  onClick={() => exportBatch.mutateAsync(batch.id)}
                  disabled={exportBatch.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export & Download
                </Button>
              )}
              {(batch.status === 'exported' || batch.status === 're_exported') && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => reExportBatch.mutateAsync(batch.id)}
                    disabled={reExportBatch.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-export
                  </Button>
                  <Button
                    onClick={() => markPosted.mutateAsync({ batchId: batch.id })}
                    disabled={markPosted.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark All Posted
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validation Errors */}
        {batch.validation_errors && batch.validation_errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Validation Errors Found:</div>
              <ul className="list-disc list-inside space-y-1">
                {batch.validation_errors.slice(0, 5).map((err: any, idx: number) => (
                  <li key={idx}>
                    {err.employeeName}: {err.errors.join(', ')}
                  </li>
                ))}
                {batch.validation_errors.length > 5 && (
                  <li>...and {batch.validation_errors.length - 5} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Records Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Export Records</CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="included">Included</SelectItem>
                    <SelectItem value="exported">Exported</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bulk Actions */}
            {selectedRecords.size > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded">
                <span className="text-sm">{selectedRecords.size} selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeferSelected}
                  disabled={deferRecords.isPending}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Defer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkSelectedPosted}
                  disabled={markPosted.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Posted
                </Button>
              </div>
            )}

            {loadingRecords ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedRecords.size === (records || []).length && (records || []).length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Expense Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Cost Centre</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(records || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    (records || []).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRecords.has(record.id)}
                            onCheckedChange={() => toggleRecord(record.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{record.employee_name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">
                              {record.employee_payroll_id || 'No Payroll ID'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{record.expense_type}</TableCell>
                        <TableCell>{formatCurrency(record.amount, record.currency)}</TableCell>
                        <TableCell>{record.cost_centre || '-'}</TableCell>
                        <TableCell>
                          {record.destination_country || '-'}
                          {record.destination_city && `, ${record.destination_city}`}
                        </TableCell>
                        <TableCell>{record.posting_period || '-'}</TableCell>
                        <TableCell>
                          <Badge className={recordStatusColors[record.status]}>
                            {recordStatusLabels[record.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.validation_errors && record.validation_errors.length > 0 ? (
                            <div className="flex items-center text-destructive">
                              <XCircle className="h-4 w-4 mr-1" />
                              <span className="text-xs">{record.validation_errors.length}</span>
                            </div>
                          ) : record.has_incident_adjustment ? (
                            <div className="flex items-center text-amber-600">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              <span className="text-xs">Incident</span>
                            </div>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}