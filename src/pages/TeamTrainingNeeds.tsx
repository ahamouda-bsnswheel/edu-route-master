import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Users, Search, AlertCircle, FileText, Eye, Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useActiveTNAPeriods,
  useTeamTNASubmissions,
  useCreateTNASubmission,
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

export default function TeamTrainingNeeds() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: periods = [], isLoading: periodsLoading } = useActiveTNAPeriods();
  const { data: teamData = [], isLoading: teamLoading, refetch } = useTeamTNASubmissions(selectedPeriodId);
  const createSubmission = useCreateTNASubmission();

  // Auto-select first period
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const filteredTeam = teamData.filter(member =>
    `${member.first_name_en} ${member.last_name_en}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: teamData.length,
    notStarted: teamData.filter(m => m.status === 'not_started').length,
    draft: teamData.filter(m => m.status === 'draft').length,
    submitted: teamData.filter(m => m.status === 'submitted').length,
    approved: teamData.filter(m => ['approved', 'locked'].includes(m.status)).length,
  };

  const completionRate = stats.total > 0 
    ? Math.round((stats.approved / stats.total) * 100)
    : 0;

  const handleStartTNA = async (employeeId: string) => {
    if (!selectedPeriodId) return;
    await createSubmission.mutateAsync({
      periodId: selectedPeriodId,
      employeeId,
    });
    refetch();
  };

  const handleViewEdit = (member: any) => {
    if (member.submission) {
      navigate(`/tna/form/${member.submission.id}`);
    }
  };

  return (
    <DashboardLayout title="Team Training Needs" description="Manage training needs for your team members">
      <div className="space-y-6">
        {/* Period Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team TNA Management
            </CardTitle>
            <CardDescription>
              Submit and track training needs analysis for your direct reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {periodsLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : periods.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active TNA periods available. Please check back later or contact L&D.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select planning period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {selectedPeriodId && !teamLoading && teamData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</div>
                <p className="text-sm text-muted-foreground">Not Started</p>
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
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress */}
        {selectedPeriodId && !teamLoading && teamData.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completion Progress</span>
                <span className="text-sm text-muted-foreground">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Team List */}
        {selectedPeriodId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {filteredTeam.length} team {filteredTeam.length === 1 ? 'member' : 'members'}
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : teamData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team members found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeam.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.first_name_en} {member.last_name_en}
                        </TableCell>
                        <TableCell>{member.employee_id || 'N/A'}</TableCell>
                        <TableCell>{member.job_title_en || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[member.status]}>
                            {statusLabels[member.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {member.status === 'not_started' ? (
                            <Button
                              size="sm"
                              onClick={() => handleStartTNA(member.id)}
                              disabled={createSubmission.isPending}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Start TNA
                            </Button>
                          ) : member.status === 'draft' || member.status === 'returned' ? (
                            <Button size="sm" onClick={() => handleViewEdit(member)}>
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleViewEdit(member)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          )}
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
