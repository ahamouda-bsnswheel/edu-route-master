import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Users,
  Building,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ComplianceDashboard() {
  const { hasRole } = useAuth();
  const [entityFilter, setEntityFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  const canViewCompliance = hasRole('l_and_d') || hasRole('hrbp') || hasRole('admin') || hasRole('chro');

  // Fetch mandatory courses
  const { data: mandatoryCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['mandatory-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name_en, is_mandatory, validity_months')
        .eq('is_mandatory', true)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: canViewCompliance,
  });

  // Fetch entities for filter
  const { data: entities } = useQuery({
    queryKey: ['entities-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('id, name_en')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: canViewCompliance,
  });

  // Fetch compliance data
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['compliance-overview', entityFilter, courseFilter],
    queryFn: async () => {
      // Get all employees
      let profilesQuery = supabase.from('profiles').select('id, first_name_en, last_name_en, email, entity_id, manager_id');
      
      if (entityFilter !== 'all') {
        profilesQuery = profilesQuery.eq('entity_id', entityFilter);
      }
      
      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;

      // Get completions for mandatory courses
      let completionsQuery = supabase
        .from('session_enrollments')
        .select(`
          participant_id,
          completion_status,
          completion_date,
          session:sessions(
            course:courses(id, name_en, is_mandatory, validity_months)
          )
        `)
        .eq('completion_status', 'completed');

      const { data: completions, error: completionsError } = await completionsQuery;
      if (completionsError) throw completionsError;

      // Calculate compliance per course
      const courseCompliance: Record<string, {
        courseId: string;
        courseName: string;
        totalEmployees: number;
        compliant: number;
        dueSoon: number;
        overdue: number;
        pending: number;
      }> = {};

      mandatoryCourses?.forEach(course => {
        const courseCompletions = completions?.filter(
          (c: any) => c.session?.course?.id === course.id
        ) || [];

        const compliantEmployees = new Set(courseCompletions.map((c: any) => c.participant_id));

        courseCompliance[course.id] = {
          courseId: course.id,
          courseName: course.name_en,
          totalEmployees: profiles?.length || 0,
          compliant: compliantEmployees.size,
          dueSoon: 0, // Would calculate based on validity_months
          overdue: 0,
          pending: (profiles?.length || 0) - compliantEmployees.size,
        };
      });

      // Get non-compliant employees list
      const nonCompliantEmployees: any[] = [];
      profiles?.forEach(profile => {
        mandatoryCourses?.forEach(course => {
          const hasCompletion = completions?.some(
            (c: any) => c.participant_id === profile.id && c.session?.course?.id === course.id
          );
          if (!hasCompletion) {
            nonCompliantEmployees.push({
              employeeId: profile.id,
              employeeName: `${profile.first_name_en || ''} ${profile.last_name_en || ''}`.trim() || profile.email,
              employeeEmail: profile.email,
              courseId: course.id,
              courseName: course.name_en,
              status: 'overdue',
              managerId: profile.manager_id,
            });
          }
        });
      });

      return {
        courseCompliance: Object.values(courseCompliance),
        nonCompliantEmployees,
        totalEmployees: profiles?.length || 0,
      };
    },
    enabled: canViewCompliance && !!mandatoryCourses,
  });

  const overallCompliance = complianceData?.courseCompliance.length
    ? Math.round(
        (complianceData.courseCompliance.reduce((acc, c) => acc + c.compliant, 0) /
          complianceData.courseCompliance.reduce((acc, c) => acc + c.totalEmployees, 0)) *
          100
      )
    : 0;

  const handleExport = () => {
    if (!complianceData?.nonCompliantEmployees) return;

    const headers = ['Employee', 'Email', 'Course', 'Status'];
    const rows = complianceData.nonCompliantEmployees.map(e => [
      e.employeeName,
      e.employeeEmail,
      e.courseName,
      e.status,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!canViewCompliance) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view compliance data.
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
            <h1 className="text-3xl font-bold text-foreground">Compliance Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track mandatory training compliance across the organization
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Overall Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overall Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallCompliance}%</div>
              <Progress value={overallCompliance} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceData?.totalEmployees || 0}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Compliant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {complianceData?.courseCompliance.reduce((acc, c) => acc + c.compliant, 0) || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Non-Compliant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {complianceData?.nonCompliantEmployees.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Building className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entities?.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mandatory Courses</SelectItem>
                  {mandatoryCourses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Course Compliance */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Compliance by Course
            </CardTitle>
            <CardDescription>
              Mandatory training completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coursesLoading || complianceLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : complianceData?.courseCompliance && complianceData.courseCompliance.length > 0 ? (
              <div className="space-y-4">
                {complianceData.courseCompliance.map((course) => {
                  const complianceRate = course.totalEmployees
                    ? Math.round((course.compliant / course.totalEmployees) * 100)
                    : 0;

                  return (
                    <div key={course.courseId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{course.courseName}</h4>
                        <Badge
                          variant={complianceRate >= 90 ? 'default' : complianceRate >= 70 ? 'outline' : 'destructive'}
                        >
                          {complianceRate}% Compliant
                        </Badge>
                      </div>
                      <Progress value={complianceRate} className="h-2 mb-2" />
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          {course.compliant} Compliant
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-warning" />
                          {course.dueSoon} Due Soon
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-destructive" />
                          {course.pending} Pending
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No mandatory courses configured</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Non-Compliant Employees */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Non-Compliant Employees
            </CardTitle>
            <CardDescription>
              Employees missing mandatory training
            </CardDescription>
          </CardHeader>
          <CardContent>
            {complianceLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : complianceData?.nonCompliantEmployees && complianceData.nonCompliantEmployees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Missing Course</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceData.nonCompliantEmployees.slice(0, 20).map((item, idx) => (
                    <TableRow key={`${item.employeeId}-${item.courseId}-${idx}`}>
                      <TableCell className="font-medium">{item.employeeName}</TableCell>
                      <TableCell>{item.employeeEmail}</TableCell>
                      <TableCell>{item.courseName}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-medium">All Clear!</h3>
                <p className="text-muted-foreground mt-1">
                  All employees are compliant with mandatory training
                </p>
              </div>
            )}
            {complianceData?.nonCompliantEmployees && complianceData.nonCompliantEmployees.length > 20 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Full List ({complianceData.nonCompliantEmployees.length} records)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
