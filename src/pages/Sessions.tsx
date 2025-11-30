import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Calendar,
  Users,
  MapPin,
  Search,
  Filter,
  GraduationCap,
  Clock,
  Edit,
  Eye,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-info text-info-foreground' },
  open: { label: 'Open', color: 'bg-success text-success-foreground' },
  confirmed: { label: 'Confirmed', color: 'bg-primary text-primary-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-warning text-warning-foreground' },
  completed: { label: 'Completed', color: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', color: 'bg-destructive text-destructive-foreground' },
};

export default function Sessions() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [formData, setFormData] = useState({
    session_code: '',
    start_date: '',
    end_date: '',
    location_en: '',
    capacity: 25,
    instructor_name: '',
    venue_details: '',
  });

  const canManage = hasRole('l_and_d') || hasRole('admin');

  // Fetch sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          course:courses(id, name_en, name_ar, delivery_mode, training_location, duration_days)
        `)
        .order('start_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name_en, name_ar, delivery_mode')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sessions').insert({
        course_id: selectedCourse,
        session_code: formData.session_code,
        start_date: formData.start_date,
        end_date: formData.end_date,
        location_en: formData.location_en,
        capacity: formData.capacity,
        instructor_name: formData.instructor_name,
        venue_details: formData.venue_details,
        status: 'scheduled',
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Session Created', description: 'The training session has been created.' });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const resetForm = () => {
    setSelectedCourse('');
    setFormData({
      session_code: '',
      start_date: '',
      end_date: '',
      location_en: '',
      capacity: 25,
      instructor_name: '',
      venue_details: '',
    });
  };

  // Filter sessions by search
  const filteredSessions = sessions?.filter(session => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.course?.name_en?.toLowerCase().includes(query) ||
      session.session_code?.toLowerCase().includes(query) ||
      session.location_en?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: sessions?.length || 0,
    upcoming: sessions?.filter(s => s.status === 'scheduled' || s.status === 'open').length || 0,
    inProgress: sessions?.filter(s => s.status === 'confirmed' || s.status === 'in_progress').length || 0,
    completed: sessions?.filter(s => s.status === 'completed').length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Training Sessions</h1>
            <p className="text-muted-foreground mt-1">
              Manage training sessions, enrollments, and capacity
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.upcoming}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
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
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="open">Open for Enrollment</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Sessions
            </CardTitle>
            <CardDescription>
              {filteredSessions?.length || 0} sessions found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSessions && filteredSessions.length > 0 ? (
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course / Session</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{session.course?.name_en}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.session_code || 'No code'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">
                              {format(new Date(session.start_date), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              to {format(new Date(session.end_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{session.location_en || 'TBD'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {session.enrolled_count || 0}/{session.capacity || 0}
                          </span>
                          {(session.waitlist_count || 0) > 0 && (
                            <Badge variant="outline" className="text-xs">
                              +{session.waitlist_count} waitlist
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[session.status || 'scheduled']?.color}>
                          {statusConfig[session.status || 'scheduled']?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/sessions/${session.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/sessions/${session.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No sessions found</h3>
                <p className="text-muted-foreground mt-1">
                  {canManage ? 'Create a new session to get started.' : 'No sessions match your search.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Session Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Training Session</DialogTitle>
              <DialogDescription>
                Schedule a new training session for a course
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Course *</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Session Code</Label>
                <Input
                  value={formData.session_code}
                  onChange={(e) => setFormData({ ...formData, session_code: e.target.value })}
                  placeholder="e.g., HSE-2024-001"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label>Location</Label>
                <Input
                  value={formData.location_en}
                  onChange={(e) => setFormData({ ...formData, location_en: e.target.value })}
                  placeholder="Training Center, Building A"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Capacity *</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    min={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Instructor</Label>
                  <Input
                    value={formData.instructor_name}
                    onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                    placeholder="Instructor name"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label>Venue Details</Label>
                <Textarea
                  value={formData.venue_details}
                  onChange={(e) => setFormData({ ...formData, venue_details: e.target.value })}
                  placeholder="Additional details about the venue, room number, etc."
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createSessionMutation.mutate()}
                disabled={!selectedCourse || !formData.start_date || !formData.end_date}
              >
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
