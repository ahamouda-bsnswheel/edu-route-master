import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  Lock,
  Download,
  Upload,
  Check,
} from 'lucide-react';
import { CSVImportDialog } from '@/components/attendance/CSVImportDialog';
import { format } from 'date-fns';

const attendanceOptions = [
  { value: 'confirmed', label: 'Present', color: 'bg-success text-success-foreground' },
  { value: 'absent', label: 'Absent', color: 'bg-destructive text-destructive-foreground' },
  { value: 'partial', label: 'Partial', color: 'bg-warning text-warning-foreground' },
];

export default function SessionAttendance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string; comments: string }>>({});
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const canEdit = hasRole('l_and_d') || hasRole('admin');

  // Fetch session details
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session-attendance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          course:courses(id, name_en, delivery_mode, duration_days, duration_hours)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch enrollments
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['session-enrollments-attendance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_enrollments')
        .select('*')
        .eq('session_id', id)
        .in('status', ['confirmed', 'completed'])
        .order('enrolled_at');

      if (error) throw error;

      // Initialize attendance data
      const initialData: Record<string, { status: string; comments: string }> = {};
      data.forEach((enrollment: any) => {
        initialData[enrollment.id] = {
          status: enrollment.status || 'confirmed',
          comments: enrollment.attendance_comments || '',
        };
      });
      setAttendanceData(initialData);

      return data;
    },
    enabled: !!id,
  });

  // Check if trainer has access
  const isTrainer = session?.trainer_id === user?.id || session?.created_by === user?.id;
  const canMarkAttendance = isTrainer || canEdit;
  const isFinalized = enrollments?.some((e: any) => e.is_attendance_final);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      for (const [enrollmentId, data] of Object.entries(attendanceData)) {
        const enrollment = enrollments?.find((e: any) => e.id === enrollmentId);
        const oldStatus = enrollment?.status;

        const updateData: any = {
          status: data.status,
          attendance_comments: data.comments,
        };

        if (finalize) {
          updateData.is_attendance_final = true;
          updateData.attendance_finalized_at = new Date().toISOString();
          updateData.attendance_finalized_by = user?.id;
        }

        const { error } = await supabase
          .from('session_enrollments')
          .update(updateData)
          .eq('id', enrollmentId);

        if (error) throw error;

        // Log change if status changed
        if (oldStatus !== data.status) {
          await supabase.from('attendance_audit_log').insert({
            enrollment_id: enrollmentId,
            field_changed: 'attendance_status',
            old_value: oldStatus,
            new_value: data.status,
            reason: finalize ? 'Attendance finalized' : 'Attendance updated',
            changed_by: user?.id,
          });
        }
      }
    },
    onSuccess: (_, finalize) => {
      toast({
        title: finalize ? 'Attendance Finalized' : 'Attendance Saved',
        description: finalize
          ? 'Attendance has been locked and cannot be modified.'
          : 'Attendance has been saved as draft.',
      });
      queryClient.invalidateQueries({ queryKey: ['session-enrollments-attendance'] });
      setHasChanges(false);
      if (finalize) setShowFinalizeDialog(false);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const updateAttendance = (enrollmentId: string, field: 'status' | 'comments', value: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], [field]: value },
    }));
    setHasChanges(true);
  };

  const markAllPresent = () => {
    const newData: Record<string, { status: string; comments: string }> = {};
    enrollments?.forEach((enrollment: any) => {
      newData[enrollment.id] = {
        status: 'confirmed',
        comments: attendanceData[enrollment.id]?.comments || '',
      };
    });
    setAttendanceData(newData);
    setHasChanges(true);
  };

  const exportTemplate = () => {
    if (!enrollments) return;
    
    const headers = ['Employee ID', 'Name', 'Email', 'Status', 'Comments'];
    const rows = enrollments.map((e: any) => [
      e.participant_id,
      'Participant',
      '',
      attendanceData[e.id]?.status || 'confirmed',
      attendanceData[e.id]?.comments || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${session?.session_code || id}.csv`;
    a.click();
  };

  const presentCount = Object.values(attendanceData).filter(d => d.status === 'confirmed').length;
  const absentCount = Object.values(attendanceData).filter(d => d.status === 'absent').length;
  const partialCount = Object.values(attendanceData).filter(d => d.status === 'partial').length;

  if (sessionLoading || enrollmentsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Session not found</h2>
          <Button className="mt-4" onClick={() => navigate('/sessions')}>
            Back to Sessions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/sessions/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Session Attendance</h1>
            <p className="text-muted-foreground mt-1">
              {session.course?.name_en} • {session.session_code}
            </p>
          </div>
          {isFinalized && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Attendance Finalized
            </Badge>
          )}
        </div>

        {/* Session Info */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Date
              </div>
              <p className="font-medium">{format(new Date(session.start_date), 'MMM dd, yyyy')}</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                Location
              </div>
              <p className="font-medium">{session.location_en || 'TBD'}</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Participants
              </div>
              <p className="font-medium">{enrollments?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                Duration
              </div>
              <p className="font-medium">
                {session.course?.duration_days} day(s) / {session.course?.duration_hours || '-'} hrs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Summary */}
        <div className="flex flex-wrap gap-4">
          <Badge variant="outline" className="text-success border-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Present: {presentCount}
          </Badge>
          <Badge variant="outline" className="text-destructive border-destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Absent: {absentCount}
          </Badge>
          <Badge variant="outline" className="text-warning border-warning">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial: {partialCount}
          </Badge>
        </div>

        {/* Actions */}
        {canMarkAttendance && !isFinalized && (
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={markAllPresent}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Present
                </Button>
                <Button variant="outline" onClick={exportTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Template
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => saveAttendanceMutation.mutate(false)}
                  disabled={!hasChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={() => setShowFinalizeDialog(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Submit Final
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Participant Attendance</CardTitle>
            <CardDescription>
              Mark attendance status for each participant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments && enrollments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Participant #{enrollment.participant_id?.slice(0, 8)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {enrollment.status === 'waitlisted' ? 'Waitlisted' : 'Registered'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canMarkAttendance && !isFinalized ? (
                          <Select
                            value={attendanceData[enrollment.id]?.status || 'confirmed'}
                            onValueChange={(value) => updateAttendance(enrollment.id, 'status', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {attendanceOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            className={
                              attendanceOptions.find(o => o.value === attendanceData[enrollment.id]?.status)?.color
                            }
                          >
                            {attendanceOptions.find(o => o.value === attendanceData[enrollment.id]?.status)?.label || 'Present'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canMarkAttendance && !isFinalized ? (
                          <Input
                            value={attendanceData[enrollment.id]?.comments || ''}
                            onChange={(e) => updateAttendance(enrollment.id, 'comments', e.target.value)}
                            placeholder="Add comments..."
                            className="w-48"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {attendanceData[enrollment.id]?.comments || '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No participants enrolled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finalize Dialog */}
        <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalize Attendance</DialogTitle>
              <DialogDescription>
                Once finalized, attendance cannot be modified without L&D approval.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Present:</strong> {presentCount} participants
                </p>
                <p className="text-sm">
                  <strong>Absent:</strong> {absentCount} participants
                </p>
                <p className="text-sm">
                  <strong>Partial:</strong> {partialCount} participants
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveAttendanceMutation.mutate(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Finalize Attendance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <CSVImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          sessionId={id || ''}
          enrollments={enrollments || []}
        />
      </div>
    </DashboardLayout>
  );
}
