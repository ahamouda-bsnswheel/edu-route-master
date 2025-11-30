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
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-4">
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger className="w-full sm:w-64">
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
                  <SelectTrigger className="w-full sm:w-48">
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
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredSubmissions.length === 0}>
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {selectedPeriodId && !submissionsLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.draft}</div>
                <p className="text-xs text-muted-foreground">Draft</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.submitted}</div>
                <p className="text-xs text-muted-foreground">Submitted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.returned}</div>
                <p className="text-xs text-muted-foreground">Returned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.approved}</div>
                <p className="text-xs text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.locked}</div>
                <p className="text-xs text-muted-foreground">Locked</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>TNA Submissions</CardTitle>
                  <CardDescription>
                    {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'submission' : 'submissions'}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
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
                <div className="space-y-3">
                  {filteredSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="border rounded-lg p-3 space-y-2 bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">
                            {sub.employee ? `${sub.employee.first_name_en} ${sub.employee.last_name_en}` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">{sub.employee?.job_title_en || 'N/A'}</p>
                        </div>
                        <Badge className={`${statusColors[sub.status]} shrink-0 text-xs`}>
                          {statusLabels[sub.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{sub.items_count || 0} items</span>
                        <span>
                          {sub.submitted_at 
                            ? new Date(sub.submitted_at).toLocaleDateString()
                            : '-'
                          }
                        </span>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/tna/form/${sub.id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {sub.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600"
                              onClick={() => handleApprove(sub.id)}
                              disabled={approveTNA.isPending}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-600"
                              onClick={() => handleReturn(sub.id)}
                              disabled={approveTNA.isPending}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {sub.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-purple-600 border-purple-600"
                            onClick={() => handleLock(sub.id)}
                            disabled={approveTNA.isPending}
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
