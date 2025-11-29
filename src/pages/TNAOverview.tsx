import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { BarChart3, Search, AlertCircle, Download, Eye, CheckCircle, RotateCcw, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useTNAPeriods,
  useAllTNASubmissions,
  useApproveTNA,
  type TNASubmission,
} from '@/hooks/useTNA';
import { Skeleton } from '@/components/ui/skeleton';

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  draft: 'Draft',
  submitted: 'Submitted',
  returned: 'Returned',
  approved: 'Approved',
  locked: 'Locked',
};

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  locked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function TNAOverview() {
  const navigate = useNavigate();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: periods = [], isLoading: periodsLoading } = useTNAPeriods();
  const { data: submissions = [], isLoading: submissionsLoading } = useAllTNASubmissions(
    selectedPeriodId,
    { status: statusFilter }
  );
  const approveTNA = useApproveTNA();

  // Auto-select first period
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const activePeriod = periods.find(p => p.status === 'active');
      setSelectedPeriodId(activePeriod?.id || periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const filteredSubmissions = submissions.filter(sub => {
    const employeeName = sub.employee 
      ? `${sub.employee.first_name_en} ${sub.employee.last_name_en}`.toLowerCase()
      : '';
    const employeeId = sub.employee?.employee_id?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return employeeName.includes(search) || employeeId.includes(search);
  });

  // Calculate statistics
  const stats = {
    total: submissions.length,
    draft: submissions.filter(s => s.status === 'draft').length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    returned: submissions.filter(s => s.status === 'returned').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    locked: submissions.filter(s => s.status === 'locked').length,
  };

  const completionRate = stats.total > 0
    ? Math.round(((stats.approved + stats.locked) / stats.total) * 100)
    : 0;

  const handleExport = () => {
    const csvData = filteredSubmissions.map(sub => ({
      'Employee Name': sub.employee ? `${sub.employee.first_name_en} ${sub.employee.last_name_en}` : 'N/A',
      'Employee ID': sub.employee?.employee_id || 'N/A',
      'Position': sub.employee?.job_title_en || 'N/A',
      'Status': statusLabels[sub.status],
      'Items Count': sub.items_count || 0,
      'Submitted At': sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A',
      'Approved At': sub.approved_at ? new Date(sub.approved_at).toLocaleDateString() : 'N/A',
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TNA_Overview_${selectedPeriod?.name || 'export'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleApprove = async (submissionId: string) => {
    await approveTNA.mutateAsync({ submissionId, action: 'approve' });
  };

  const handleReturn = async (submissionId: string) => {
    const comments = window.prompt('Enter comments for return:');
    if (comments !== null) {
      await approveTNA.mutateAsync({ submissionId, action: 'return', comments });
    }
  };

  const handleLock = async (submissionId: string) => {
    await approveTNA.mutateAsync({ submissionId, action: 'lock' });
  };

  return (
    <DashboardLayout title="TNA Overview" description="Monitor training needs analysis completion across the organization">
      <div className="space-y-6">
        {/* Period Selection and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              TNA Overview Dashboard
            </CardTitle>
            <CardDescription>
              Monitor and manage TNA submissions across the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {periodsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : periods.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No TNA periods configured. Create a period in TNA Admin.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select planning period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name} ({period.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport} disabled={filteredSubmissions.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {selectedPeriodId && !submissionsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
                <p className="text-sm text-muted-foreground">Draft</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{stats.returned}</div>
                <p className="text-sm text-muted-foreground">Returned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">{stats.locked}</div>
                <p className="text-sm text-muted-foreground">Locked</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress */}
        {selectedPeriodId && !submissionsLoading && stats.total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion Rate</span>
                <span className="text-sm text-muted-foreground">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Submissions Table */}
        {selectedPeriodId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>TNA Submissions</CardTitle>
                  <CardDescription>
                    {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'submission' : 'submissions'}
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No submissions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.employee ? `${sub.employee.first_name_en} ${sub.employee.last_name_en}` : 'N/A'}
                        </TableCell>
                        <TableCell>{sub.employee?.employee_id || 'N/A'}</TableCell>
                        <TableCell>{sub.employee?.job_title_en || 'N/A'}</TableCell>
                        <TableCell>{sub.items_count || 0}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[sub.status]}>
                            {statusLabels[sub.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.submitted_at 
                            ? new Date(sub.submitted_at).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/tna/form/${sub.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {sub.status === 'submitted' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600"
                                  onClick={() => handleApprove(sub.id)}
                                  disabled={approveTNA.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-orange-600"
                                  onClick={() => handleReturn(sub.id)}
                                  disabled={approveTNA.isPending}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {sub.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-purple-600"
                                onClick={() => handleLock(sub.id)}
                                disabled={approveTNA.isPending}
                              >
                                <Lock className="h-4 w-4" />
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
        )}
      </div>
    </DashboardLayout>
  );
}
