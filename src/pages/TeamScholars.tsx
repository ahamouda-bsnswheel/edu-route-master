import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  GraduationCap, Eye, TrendingUp, Clock, AlertTriangle, Users, Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { useTeamScholars } from '@/hooks/useAcademicProgress';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_enrolled: { label: 'Not Enrolled', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  on_leave: { label: 'On Leave', variant: 'outline' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'default' },
  withdrawn: { label: 'Withdrawn', variant: 'destructive' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  on_track: { label: 'On Track', color: 'text-green-700', bgColor: 'bg-green-100' },
  watch: { label: 'Watch', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  at_risk: { label: 'At Risk', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// Simplified risk display for managers (per feature spec - limited academic detail)
const MANAGER_RISK_LABELS: Record<string, string> = {
  on_track: 'Meeting Requirements',
  watch: 'Needs Attention',
  at_risk: 'Below Required Average',
  critical: 'On Probation',
};

export default function TeamScholars() {
  const navigate = useNavigate();
  const { data: scholars, isLoading } = useTeamScholars();

  const activeScholars = scholars?.filter(s => s.status === 'active') || [];
  const atRiskCount = scholars?.filter(s => ['at_risk', 'critical'].includes(s.risk_level)).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7" />
            Team Scholars
          </h1>
          <p className="text-muted-foreground">
            Monitor long-term program progress for your team members
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{scholars?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total Scholars</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{activeScholars.length}</div>
                  <p className="text-xs text-muted-foreground">Currently Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{atRiskCount}</div>
                  <p className="text-xs text-muted-foreground">Needs Attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">
                    {new Set(scholars?.map(s => s.country)).size || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Countries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Scholars Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members on Long-Term Programs</CardTitle>
            <CardDescription>
              High-level view of academic progress for operational planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : scholars && scholars.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Current Term</TableHead>
                    <TableHead>Academic Standing</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scholars.map(scholar => {
                    const statusInfo = STATUS_CONFIG[scholar.status] || STATUS_CONFIG.active;
                    const riskInfo = RISK_CONFIG[scholar.risk_level] || RISK_CONFIG.on_track;
                    const managerRiskLabel = MANAGER_RISK_LABELS[scholar.risk_level] || 'Unknown';
                    
                    return (
                      <TableRow key={scholar.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {scholar.employee?.first_name_en} {scholar.employee?.last_name_en}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {scholar.employee?.job_title_en}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{scholar.program_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {scholar.degree_level.replace('_', ' ')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span>{scholar.country}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {scholar.current_term_number} / {scholar.total_terms || '?'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskInfo.bgColor} ${riskInfo.color}`}>
                            {managerRiskLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          {scholar.expected_end_date 
                            ? format(new Date(scholar.expected_end_date), 'MMM yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/scholars/${scholar.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Team Scholars</h3>
                <p className="text-muted-foreground">
                  None of your direct reports are currently on long-term programs
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
