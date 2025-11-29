import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Clock,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['hsl(215, 90%, 32%)', 'hsl(45, 93%, 47%)', 'hsl(172, 66%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(142, 76%, 36%)'];

const statusColors: Record<string, string> = {
  draft: 'hsl(215, 16%, 47%)',
  pending: 'hsl(38, 92%, 50%)',
  approved: 'hsl(142, 76%, 36%)',
  rejected: 'hsl(0, 84%, 60%)',
  scheduled: 'hsl(199, 89%, 48%)',
  completed: 'hsl(215, 90%, 32%)',
  cancelled: 'hsl(0, 62%, 30%)',
};

export default function Reports() {
  const { hasRole } = useAuth();
  const [dateRange, setDateRange] = useState('6months');
  const [entityFilter, setEntityFilter] = useState('all');

  const canViewReports = hasRole('l_and_d') || hasRole('hrbp') || hasRole('admin') || hasRole('chro');

  // Fetch pipeline data
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ['reports-pipeline', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_requests')
        .select('status, created_at')
        .gte('created_at', subMonths(new Date(), dateRange === '6months' ? 6 : dateRange === '3months' ? 3 : 12).toISOString());

      if (error) throw error;

      const statusCounts = data.reduce((acc: Record<string, number>, req) => {
        acc[req.status || 'draft'] = (acc[req.status || 'draft'] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(statusCounts).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        value: count,
        fill: statusColors[status] || COLORS[0],
      }));
    },
    enabled: canViewReports,
  });

  // Fetch monthly trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['reports-trends', dateRange],
    queryFn: async () => {
      const months = dateRange === '6months' ? 6 : dateRange === '3months' ? 3 : 12;
      const monthlyData = [];

      for (let i = months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));

        const { data: requestsData } = await supabase
          .from('training_requests')
          .select('id, status')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        monthlyData.push({
          month: format(monthStart, 'MMM yyyy'),
          requests: requestsData?.length || 0,
          approved: requestsData?.filter(r => r.status === 'approved' || r.status === 'scheduled' || r.status === 'completed').length || 0,
          sessions: sessionsData?.length || 0,
        });
      }

      return monthlyData;
    },
    enabled: canViewReports,
  });

  // Fetch session utilization
  const { data: utilizationData, isLoading: utilizationLoading } = useQuery({
    queryKey: ['reports-utilization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, capacity, enrolled_count, status, course:courses(name_en)')
        .in('status', ['confirmed', 'completed', 'in_progress']);

      if (error) throw error;

      return data.map((session: any) => ({
        name: session.course?.name_en?.substring(0, 20) + '...' || 'Unknown',
        utilization: session.capacity ? Math.round((session.enrolled_count / session.capacity) * 100) : 0,
        enrolled: session.enrolled_count || 0,
        capacity: session.capacity || 0,
      })).slice(0, 10);
    },
    enabled: canViewReports,
  });

  // Fetch approval lead times
  const { data: leadTimeData, isLoading: leadTimeLoading } = useQuery({
    queryKey: ['reports-lead-time'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('approver_role, created_at, decision_date, status')
        .not('decision_date', 'is', null);

      if (error) throw error;

      const roleLeadTimes: Record<string, number[]> = {};
      
      data.forEach((approval) => {
        if (approval.decision_date && approval.created_at) {
          const leadTime = (new Date(approval.decision_date).getTime() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (!roleLeadTimes[approval.approver_role]) {
            roleLeadTimes[approval.approver_role] = [];
          }
          roleLeadTimes[approval.approver_role].push(leadTime);
        }
      });

      return Object.entries(roleLeadTimes).map(([role, times]) => ({
        role: role.replace('_', ' ').toUpperCase(),
        avgDays: times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 0,
        count: times.length,
      }));
    },
    enabled: canViewReports,
  });

  // Fetch summary stats
  const { data: summaryStats } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: async () => {
      const { data: requests } = await supabase
        .from('training_requests')
        .select('id, status');

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, enrolled_count, capacity');

      const { data: pendingApprovals } = await supabase
        .from('approvals')
        .select('id')
        .eq('status', 'pending');

      const totalRequests = requests?.length || 0;
      const approvedRequests = requests?.filter(r => r.status === 'approved' || r.status === 'completed').length || 0;
      const totalEnrolled = sessions?.reduce((acc, s) => acc + (s.enrolled_count || 0), 0) || 0;
      const totalCapacity = sessions?.reduce((acc, s) => acc + (s.capacity || 0), 0) || 0;

      return {
        totalRequests,
        approvedRequests,
        approvalRate: totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0,
        pendingApprovals: pendingApprovals?.length || 0,
        totalSessions: sessions?.length || 0,
        avgUtilization: totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0,
      };
    },
    enabled: canViewReports,
  });

  const handleExport = () => {
    // Create CSV data
    const csvData = pipelineData?.map(item => `${item.name},${item.value}`).join('\n') || '';
    const csv = `Status,Count\n${csvData}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!canViewReports) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view reports.
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
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Training pipeline, approvals, and scheduling insights
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="12months">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats?.totalRequests || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats?.approvalRate || 0}% approval rate
              </p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{summaryStats?.pendingApprovals || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting decision</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{summaryStats?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Scheduled sessions</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Avg. Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{summaryStats?.avgUtilization || 0}%</div>
              <p className="text-xs text-muted-foreground">Session fill rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pipeline Status */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                Request Pipeline
              </CardTitle>
              <CardDescription>Distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              {pipelineLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pipelineData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Monthly Trends
              </CardTitle>
              <CardDescription>Requests and sessions over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="hsl(215, 90%, 32%)" name="Requests" />
                    <Line type="monotone" dataKey="approved" stroke="hsl(142, 76%, 36%)" name="Approved" />
                    <Line type="monotone" dataKey="sessions" stroke="hsl(45, 93%, 47%)" name="Sessions" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Utilization & Lead Times */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Session Utilization */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Session Utilization
              </CardTitle>
              <CardDescription>Enrollment vs capacity by course</CardDescription>
            </CardHeader>
            <CardContent>
              {utilizationLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={utilizationData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="utilization" fill="hsl(215, 90%, 32%)" name="Utilization" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Approval Lead Times */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Approval Lead Times
              </CardTitle>
              <CardDescription>Average days per approval step</CardDescription>
            </CardHeader>
            <CardContent>
              {leadTimeLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : leadTimeData && leadTimeData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Approval Step</TableHead>
                      <TableHead className="text-right">Avg. Days</TableHead>
                      <TableHead className="text-right">Decisions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadTimeData.map((item) => (
                      <TableRow key={item.role}>
                        <TableCell className="font-medium">{item.role}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(item.avgDays) > 3 ? 'destructive' : 'outline'}>
                            {item.avgDays} days
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No approval data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
