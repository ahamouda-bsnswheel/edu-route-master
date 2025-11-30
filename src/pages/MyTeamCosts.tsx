import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DollarSign,
  Users,
  BookOpen,
  Plane,
  Download,
} from 'lucide-react';
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
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)'];

export default function MyTeamCosts() {
  const { user } = useAuth();
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, employee_id, job_title_en')
        .eq('manager_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch team training costs (aggregated - no individual salary/per diem breakdown per policy)
  const { data: teamCosts, isLoading } = useQuery({
    queryKey: ['team-training-costs', user?.id, fiscalYear, teamMembers],
    queryFn: async () => {
      const teamIds = teamMembers?.map(m => m.id) || [];
      if (teamIds.length === 0) {
        return {
          totalCost: 0,
          tuitionCost: 0,
          travelPerDiemCost: 0,
          sessionCount: 0,
          participantCount: 0,
          byCategory: {} as Record<string, number>,
          byMonth: {} as Record<string, number>,
          memberStats: [] as any[],
        };
      }

      // Get enrollments for team using participant_id
      const { data: enrollments } = await supabase
        .from('session_enrollments')
        .select(`
          participant_id,
          session:sessions(
            id,
            start_date,
            tuition_cost_per_participant,
            course:courses(name_en, training_category)
          )
        `)
        .in('participant_id', teamIds)
        .eq('status', 'completed');

      // Get per diem calculations for team using employee_id and estimated_amount
      const { data: perDiems } = await supabase
        .from('per_diem_calculations')
        .select('employee_id, estimated_amount, final_amount, created_at')
        .in('employee_id', teamIds);

      // Aggregate costs
      let totalTuition = 0;
      let totalTravelPerDiem = 0;
      const byCategory: Record<string, number> = {};
      const byMonth: Record<string, number> = {};
      const memberCosts: Record<string, { tuition: number; travelPerDiem: number; sessions: number }> = {};

      // Initialize member costs
      teamIds.forEach(id => {
        memberCosts[id] = { tuition: 0, travelPerDiem: 0, sessions: 0 };
      });

      // Process enrollments
      for (const enrollment of enrollments || []) {
        const session = enrollment.session as any;
        const tuition = Number(session?.tuition_cost_per_participant) || 0;
        totalTuition += tuition;

        if (memberCosts[enrollment.participant_id]) {
          memberCosts[enrollment.participant_id].tuition += tuition;
          memberCosts[enrollment.participant_id].sessions += 1;
        }

        // By category
        const category = session?.course?.training_category || 'Other';
        byCategory[category] = (byCategory[category] || 0) + tuition;

        // By month
        if (session?.start_date) {
          const date = new Date(session.start_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          byMonth[monthKey] = (byMonth[monthKey] || 0) + tuition;
        }
      }

      // Process per diems (aggregated only)
      for (const pd of perDiems || []) {
        const amount = Number(pd.final_amount || pd.estimated_amount) || 0;
        totalTravelPerDiem += amount;
        if (memberCosts[pd.employee_id]) {
          memberCosts[pd.employee_id].travelPerDiem += amount;
        }
      }

      // Build member stats (aggregated - no individual breakdown visible)
      const memberStats = teamMembers?.map(member => ({
        id: member.id,
        name: `${member.first_name_en} ${member.last_name_en}`,
        employeeId: member.employee_id,
        jobTitle: member.job_title_en,
        totalCost: memberCosts[member.id]?.tuition + memberCosts[member.id]?.travelPerDiem || 0,
        sessionCount: memberCosts[member.id]?.sessions || 0,
      })) || [];

      return {
        totalCost: totalTuition + totalTravelPerDiem,
        tuitionCost: totalTuition,
        travelPerDiemCost: totalTravelPerDiem,
        sessionCount: enrollments?.length || 0,
        participantCount: teamIds.length,
        byCategory,
        byMonth,
        memberStats: memberStats.sort((a, b) => b.totalCost - a.totalCost),
      };
    },
    enabled: !!teamMembers && teamMembers.length > 0,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LYD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const categoryData = Object.entries(teamCosts?.byCategory || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const monthlyData = Object.entries(teamCosts?.byMonth || {})
    .map(([month, amount]) => ({ name: month, amount: amount as number }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <DashboardLayout
      title="My Team Training Costs"
      description="Aggregated training costs for your team"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Team Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(teamCosts?.totalCost || 0)}</div>
                  <p className="text-xs text-muted-foreground">Tuition + Travel/Per Diem</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tuition Cost</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(teamCosts?.tuitionCost || 0)}</div>
                  <p className="text-xs text-muted-foreground">{teamCosts?.sessionCount || 0} sessions</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Travel & Per Diem</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(teamCosts?.travelPerDiemCost || 0)}</div>
                  <p className="text-xs text-muted-foreground">Aggregated total</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Direct reports</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Cost by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Category</CardTitle>
              <CardDescription>Training spend distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name }) => name}
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
              <CardDescription>Training costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Member Costs (Aggregated - per policy, no individual breakdown) */}
        <Card>
          <CardHeader>
            <CardTitle>Team Training Summary</CardTitle>
            <CardDescription>
              Aggregated training cost per team member (details not shown per policy)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (teamCosts?.memberStats || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No team members found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead className="text-right">Sessions Attended</TableHead>
                    <TableHead className="text-right">Total Training Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(teamCosts?.memberStats || []).map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{member.jobTitle || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{member.sessionCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(member.totalCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
