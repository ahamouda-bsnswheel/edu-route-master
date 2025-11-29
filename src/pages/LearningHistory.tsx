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
  GraduationCap,
  Calendar,
  MapPin,
  Award,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { format, subYears } from 'date-fns';

const completionStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  completed: { label: 'Completed', color: 'bg-success text-success-foreground', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-destructive text-destructive-foreground', icon: XCircle },
  in_progress: { label: 'In Progress', color: 'bg-info text-info-foreground', icon: Clock },
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: Clock },
  not_completed: { label: 'Not Completed', color: 'bg-warning text-warning-foreground', icon: XCircle },
};

export default function LearningHistory() {
  const { user, profile } = useAuth();
  const [periodFilter, setPeriodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch learning history
  const { data: learningHistory, isLoading } = useQuery({
    queryKey: ['learning-history', user?.id, periodFilter],
    queryFn: async () => {
      let query = supabase
        .from('session_enrollments')
        .select(`
          *,
          session:sessions(
            id, session_code, start_date, end_date, location_en,
            course:courses(id, name_en, name_ar, delivery_mode, training_location, category_id)
          )
        `)
        .eq('participant_id', user?.id)
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
    enabled: !!user?.id,
  });

  // Fetch categories for filter
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

  // Filter by category
  const filteredHistory = learningHistory?.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.session?.course?.category_id === categoryFilter;
  });

  // Calculate stats
  const stats = {
    total: filteredHistory?.length || 0,
    completed: filteredHistory?.filter(h => h.completion_status === 'completed').length || 0,
    inProgress: filteredHistory?.filter(h => h.completion_status === 'in_progress' || h.completion_status === 'pending').length || 0,
    hours: filteredHistory?.reduce((acc, h) => {
      if (h.completion_status === 'completed' && h.session?.course) {
        return acc + (h.attendance_minutes || 0) / 60;
      }
      return acc;
    }, 0) || 0,
  };

  const handleDownloadCertificate = (enrollment: any) => {
    // In a real app, this would generate/download the certificate
    window.alert(`Certificate download for ${enrollment.session?.course?.name_en}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Learning History</h1>
          <p className="text-muted-foreground mt-1">
            Track your training progress, completions, and certificates
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Total Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
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
                Training Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.hours)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
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

        {/* Learning History Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Training History
            </CardTitle>
            <CardDescription>
              {filteredHistory?.length || 0} courses in your history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredHistory && filteredHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Pass/Fail</TableHead>
                    <TableHead>Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item: any) => {
                    const statusConfig = completionStatusConfig[item.completion_status || 'pending'];
                    const StatusIcon = statusConfig?.icon || Clock;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.session?.course?.name_en}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.session?.course?.delivery_mode?.replace('_', ' ')}
                              </Badge>
                              {item.session?.course?.training_location === 'abroad' && (
                                <Badge variant="secondary" className="text-xs">Abroad</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {item.session?.start_date
                                ? format(new Date(item.session.start_date), 'MMM dd, yyyy')
                                : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{item.session?.location_en || 'TBD'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.assessment_score !== null ? (
                            <span className="font-medium">{item.assessment_score}%</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
                        <TableCell>
                          {item.completion_status === 'completed' && item.passed ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadCertificate(item)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Certificate
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No training history yet</h3>
                <p className="text-muted-foreground mt-1">
                  Your completed courses will appear here
                </p>
                <Button className="mt-4" onClick={() => window.location.href = '/courses'}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
