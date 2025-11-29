import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  GraduationCap, Building, Calendar, TrendingUp, Clock, AlertTriangle,
  BookOpen, CheckCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_enrolled: { label: 'Not Yet Enrolled', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  on_leave: { label: 'On Leave', variant: 'outline' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'default' },
  withdrawn: { label: 'Withdrawn', variant: 'destructive' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const RISK_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  on_track: { label: 'On Track', color: 'text-green-600', icon: TrendingUp },
  watch: { label: 'Watch', color: 'text-amber-600', icon: Clock },
  at_risk: { label: 'At Risk', color: 'text-orange-600', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-600', icon: AlertTriangle },
};

const TERM_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  planned: { label: 'Planned', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  repeated: { label: 'Repeated', variant: 'secondary' },
};

export default function MyScholarProgress() {
  const { user } = useAuth();

  // Fetch employee's own scholar record
  const { data: record, isLoading } = useQuery({
    queryKey: ['my-scholar-record', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholar_records')
        .select('*')
        .eq('employee_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch terms for the scholar
  const { data: terms } = useQuery({
    queryKey: ['my-scholar-terms', record?.id],
    queryFn: async () => {
      if (!record?.id) return [];
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('scholar_record_id', record.id)
        .order('term_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!record?.id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!record) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">No Academic Record Found</h2>
          <p className="text-muted-foreground mt-2">
            You don't have an active scholarship or long-term program enrollment.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = STATUS_CONFIG[record.status] || STATUS_CONFIG.active;
  const riskInfo = RISK_CONFIG[record.risk_level] || RISK_CONFIG.on_track;
  const RiskIcon = riskInfo.icon;
  
  const creditsProgress = record.total_credits_required 
    ? (record.credits_completed / record.total_credits_required) * 100 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7" />
            My Academic Progress
          </h1>
          <p className="text-muted-foreground">
            Track your scholarship/program journey
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="terms">Academic Terms</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Program Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building className="h-4 w-4" />
                    Program Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Program</Label>
                    <p className="font-medium">{record.program_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Institution</Label>
                    <p>{record.institution}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Country</Label>
                    <p>{record.country}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Degree Level</Label>
                    <p className="capitalize">{record.degree_level.replace('_', ' ')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Status & Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Status & Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Academic Standing</span>
                    <div className={`flex items-center gap-1 ${riskInfo.color}`}>
                      <RiskIcon className="h-4 w-4" />
                      <span className="font-medium">{riskInfo.label}</span>
                    </div>
                  </div>
                  {record.cumulative_gpa && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cumulative GPA</span>
                      <span className="font-medium">{record.cumulative_gpa} / {record.gpa_scale}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Credits Progress</span>
                      <span className="font-medium">{record.credits_completed} / {record.total_credits_required || '?'}</span>
                    </div>
                    <Progress value={creditsProgress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current Term</span>
                    <span className="font-medium">{record.current_term_number} / {record.total_terms || '?'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Start Date</Label>
                    <p className="font-medium">
                      {record.actual_start_date 
                        ? format(new Date(record.actual_start_date), 'MMM d, yyyy')
                        : 'Not started'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Expected Completion</Label>
                    <p className="font-medium">
                      {record.expected_end_date 
                        ? format(new Date(record.expected_end_date), 'MMM d, yyyy')
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Term Structure</Label>
                    <p className="font-medium capitalize">{record.term_structure}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Terms Tab */}
          <TabsContent value="terms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Academic Terms
                </CardTitle>
                <CardDescription>
                  Your term-by-term academic progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {terms && terms.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Term</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>GPA</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {terms.map(term => {
                        const termStatus = TERM_STATUS_CONFIG[term.status] || TERM_STATUS_CONFIG.planned;
                        return (
                          <TableRow key={term.id}>
                            <TableCell className="font-medium">{term.term_name}</TableCell>
                            <TableCell>
                              {term.start_date && term.end_date ? (
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(term.start_date), 'MMM yyyy')} - {format(new Date(term.end_date), 'MMM yyyy')}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {term.credits_earned} / {term.credits_attempted}
                                {term.credits_earned === term.credits_attempted && term.credits_earned > 0 && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {term.term_gpa ? term.term_gpa.toFixed(2) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={termStatus.variant}>{termStatus.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No terms recorded yet</p>
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
