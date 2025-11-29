import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import {
  Users,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Search,
  Download,
  GraduationCap,
} from 'lucide-react';
import { format, subYears } from 'date-fns';

const completionStatusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'bg-success text-success-foreground' },
  failed: { label: 'Failed', color: 'bg-destructive text-destructive-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-info text-info-foreground' },
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  not_completed: { label: 'Not Completed', color: 'bg-warning text-warning-foreground' },
};

export default function TeamLearningHistory() {
  const { user, hasRole } = useAuth();
  const [periodFilter, setPeriodFilter] = useState('1year');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isManager = hasRole('manager') || hasRole('hrbp') || hasRole('l_and_d') || hasRole('admin');

  // Fetch team members (direct reports)
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, email, employee_id, job_title_en, department_id');

      // If manager, only get direct reports
      if (hasRole('manager') && !hasRole('l_and_d') && !hasRole('admin') && !hasRole('hrbp')) {
        query = query.eq('manager_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isManager,
  });

  // Fetch team learning history
  const { data: teamHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['team-learning-history', teamMembers?.map(t => t.id), periodFilter],
    queryFn: async () => {
      if (!teamMembers || teamMembers.length === 0) return [];

      const teamIds = teamMembers.map(t => t.id);
      
      let query = supabase
        .from('session_enrollments')
        .select(`
          *,
          session:sessions(
            id, session_code, start_date, end_date, location_en,
            course:courses(id, name_en, name_ar, delivery_mode, category_id)
          )
        `)
        .in('participant_id', teamIds)
        .order('enrolled_at', { ascending: false });

      // Apply period filter
      if (periodFilter === '1year') {
        query = query.gte('enrolled_at', subYears(new Date(), 1).toISOString());
      } else if (periodFilter === '3years') {
        query = query.gte('enrolled_at', subYears(new Date(), 3).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!teamMembers && teamMembers.length > 0,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['course-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_categories')
        .select('id, name_en')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Filter and enrich data
  const enrichedHistory = teamHistory?.map(item => {
    const member = teamMembers?.find(m => m.id === item.participant_id);
    return { ...item, member };
  }).filter(item => {
    // Category filter
    if (categoryFilter !== 'all' && item.session?.course?.category_id !== categoryFilter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const memberName = `${item.member?.first_name_en || ''} ${item.member?.last_name_en || ''}`.toLowerCase();
      const courseName = (item.session?.course?.name_en || '').toLowerCase();
      return memberName.includes(search) || courseName.includes(search);
    }
    return true;
  });

  // Calculate team stats
  const stats = {
    totalMembers: teamMembers?.length || 0,
    totalEnrollments: enrichedHistory?.length || 0,
    completed: enrichedHistory?.filter(h => h.completion_status === 'completed').length || 0,
    inProgress: enrichedHistory?.filter(h => h.completion_status === 'in_progress' || h.completion_status === 'pending').length || 0,
    passRate: (() => {
      const withResults = enrichedHistory?.filter(h => h.passed !== null) || [];
      if (withResults.length === 0) return 0;
      const passed = withResults.filter(h => h.passed === true).length;
      return Math.round((passed / withResults.length) * 100);
    })(),
  };

  const exportToCSV = () => {
    if (!enrichedHistory) return;

    const headers = ['Employee Name', 'Employee ID', 'Course', 'Session Date', 'Status', 'Pass/Fail', 'Score'];
    const rows = enrichedHistory.map(item => [
      `${item.member?.first_name_en || ''} ${item.member?.last_name_en || ''}`,
      item.member?.employee_id || '',
      item.session?.course?.name_en || '',
      item.session?.start_date ? format(new Date(item.session.start_date), 'yyyy-MM-dd') : '',
      completionStatusConfig[item.completion_status || 'pending']?.label || '',
      item.passed === true ? 'Pass' : item.passed === false ? 'Fail' : '-',
      item.assessment_score ?? '-',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-learning-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view team learning history.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Learning History</h1>
            <p className="text-muted-foreground mt-1">
              Track your team's training progress and completion status
            </p>
          </div>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Pass Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                  <SelectItem value="3years">Last 3 Years</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Training Records
            </CardTitle>
            <CardDescription>
              {enrichedHistory?.length || 0} records found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamLoading || historyLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : enrichedHistory && enrichedHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pass/Fail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedHistory.map((item: any) => {
                    const statusConfig = completionStatusConfig[item.completion_status || 'pending'];
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.member?.first_name_en} {item.member?.last_name_en}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.member?.job_title_en || item.member?.employee_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.session?.course?.name_en}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.session?.course?.delivery_mode?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.session?.start_date
                            ? format(new Date(item.session.start_date), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig?.color}>
                            {statusConfig?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.passed === true ? (
                            <Badge className="bg-success text-success-foreground">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pass
                            </Badge>
                          ) : item.passed === false ? (
                            <Badge className="bg-destructive text-destructive-foreground">
                              <XCircle className="h-3 w-3 mr-1" />
                              Fail
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No training records found</h3>
                <p className="text-muted-foreground mt-1">
                  Your team's training history will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
