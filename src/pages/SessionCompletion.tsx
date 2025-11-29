import { useState, useEffect } from 'react';
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
import { createNotification } from '@/hooks/useNotifications';
import {
  ArrowLeft,
  GraduationCap,
  Users,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  Lock,
  Calculator,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';

const completionStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-muted text-muted-foreground' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-info text-info-foreground' },
  { value: 'completed', label: 'Completed', color: 'bg-success text-success-foreground' },
  { value: 'not_completed', label: 'Not Completed', color: 'bg-warning text-warning-foreground' },
  { value: 'failed', label: 'Failed', color: 'bg-destructive text-destructive-foreground' },
];

export default function SessionCompletion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [completionData, setCompletionData] = useState<Record<string, {
    status: string;
    score: string;
    passed: boolean | null;
    reason?: string;
  }>>({});
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideEnrollmentId, setOverrideEnrollmentId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const canEdit = hasRole('l_and_d') || hasRole('admin');

  // Fetch session details with course completion rules
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session-completion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          course:courses(
            id, name_en, delivery_mode, duration_days, duration_hours,
            min_attendance_percent, pass_score, has_assessment, require_both_attendance_and_assessment
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch enrollments with attendance
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['session-enrollments-completion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_enrollments')
        .select('*')
        .eq('session_id', id)
        .in('status', ['confirmed', 'completed', 'absent', 'partial'])
        .order('enrolled_at');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Initialize completion data when enrollments load
  useEffect(() => {
    if (enrollments) {
      const initialData: Record<string, any> = {};
      enrollments.forEach((enrollment: any) => {
        initialData[enrollment.id] = {
          status: enrollment.completion_status || 'pending',
          score: enrollment.assessment_score?.toString() || '',
          passed: enrollment.passed,
        };
      });
      setCompletionData(initialData);
    }
  }, [enrollments]);

  const isTrainer = session?.trainer_id === user?.id || session?.created_by === user?.id;
  const canMarkCompletion = isTrainer || canEdit;
  const isFinalized = enrollments?.some((e: any) => e.is_completion_final);

  // Calculate completion based on rules
  const calculateCompletion = (enrollment: any, score: number | null) => {
    const course = session?.course;
    if (!course) return { status: 'pending', passed: null };

    const attendanceStatus = enrollment.status;
    const isPresent = attendanceStatus === 'confirmed' || attendanceStatus === 'completed';
    const isPartial = attendanceStatus === 'partial';
    
    // Check attendance requirement
    const meetsAttendance = isPresent || (isPartial && (enrollment.attendance_minutes || 0) >= 
      ((session?.course?.duration_hours || 8) * 60 * (course.min_attendance_percent || 80) / 100));

    // Check assessment requirement
    const hasAssessment = course.has_assessment && course.pass_score;
    const meetsAssessment = !hasAssessment || (score !== null && score >= (course.pass_score || 0));

    // Determine status
    let status = 'pending';
    let passed = null;

    if (attendanceStatus === 'absent') {
      status = 'not_completed';
      passed = false;
    } else if (course.require_both_attendance_and_assessment) {
      if (meetsAttendance && meetsAssessment) {
        status = 'completed';
        passed = true;
      } else if (!meetsAttendance) {
        status = 'not_completed';
        passed = false;
      } else if (hasAssessment && score !== null && !meetsAssessment) {
        status = 'failed';
        passed = false;
      }
    } else {
      // Either attendance OR assessment
      if (meetsAttendance || meetsAssessment) {
        status = 'completed';
        passed = true;
      } else if (hasAssessment && score !== null && !meetsAssessment) {
        status = 'failed';
        passed = false;
      }
    }

    return { status, passed };
  };

  // Apply completion rules to all
  const applyRules = () => {
    if (!enrollments) return;

    const newData: Record<string, any> = {};
    enrollments.forEach((enrollment: any) => {
      const currentData = completionData[enrollment.id];
      const score = currentData?.score ? parseFloat(currentData.score) : null;
      const { status, passed } = calculateCompletion(enrollment, score);
      
      newData[enrollment.id] = {
        ...currentData,
        status,
        passed,
      };
    });
    setCompletionData(newData);
    setHasChanges(true);
    toast({ title: 'Rules Applied', description: 'Completion status calculated based on course rules.' });
  };

  // Save completion mutation
  const saveCompletionMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      for (const [enrollmentId, data] of Object.entries(completionData)) {
        const enrollment = enrollments?.find((e: any) => e.id === enrollmentId);
        
        const updateData: any = {
          completion_status: data.status,
          assessment_score: data.score ? parseFloat(data.score) : null,
          passed: data.passed,
        };

        if (data.status === 'completed') {
          updateData.completion_date = new Date().toISOString();
        }

        if (finalize) {
          updateData.is_completion_final = true;
          updateData.completion_finalized_at = new Date().toISOString();
          updateData.completion_finalized_by = user?.id;
        }

        const { error } = await supabase
          .from('session_enrollments')
          .update(updateData)
          .eq('id', enrollmentId);

        if (error) throw error;

        // Log changes
        if (enrollment?.completion_status !== data.status) {
          await supabase.from('attendance_audit_log').insert({
            enrollment_id: enrollmentId,
            field_changed: 'completion_status',
            old_value: enrollment?.completion_status,
            new_value: data.status,
            reason: data.reason || (finalize ? 'Completion finalized' : 'Completion updated'),
            changed_by: user?.id,
          });
        }

        // Notify participant on completion
        if (finalize && data.status === 'completed' && enrollment?.participant_id) {
          await createNotification({
            user_id: enrollment.participant_id,
            title: 'Training Completed',
            message: `You have successfully completed ${session?.course?.name_en}. ${data.passed ? 'Congratulations!' : ''}`,
            type: 'session_scheduled',
            reference_type: 'session',
            reference_id: id,
          });
        }
      }
    },
    onSuccess: (_, finalize) => {
      toast({
        title: finalize ? 'Completion Finalized' : 'Completion Saved',
        description: finalize
          ? 'Completion records have been finalized.'
          : 'Completion data has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['session-enrollments-completion'] });
      setHasChanges(false);
      if (finalize) setShowFinalizeDialog(false);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const updateCompletion = (enrollmentId: string, field: string, value: any) => {
    setCompletionData(prev => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], [field]: value },
    }));
    setHasChanges(true);
  };

  const handleOverride = (enrollmentId: string) => {
    setOverrideEnrollmentId(enrollmentId);
    setOverrideReason('');
    setShowOverrideDialog(true);
  };

  const confirmOverride = () => {
    if (overrideEnrollmentId && overrideReason) {
      setCompletionData(prev => ({
        ...prev,
        [overrideEnrollmentId]: { ...prev[overrideEnrollmentId], reason: overrideReason },
      }));
      setShowOverrideDialog(false);
      toast({ title: 'Override Recorded', description: 'The override reason has been saved.' });
    }
  };

  const completedCount = Object.values(completionData).filter(d => d.status === 'completed').length;
  const failedCount = Object.values(completionData).filter(d => d.status === 'failed').length;
  const passedCount = Object.values(completionData).filter(d => d.passed === true).length;

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
            <h1 className="text-3xl font-bold text-foreground">Completion & Results</h1>
            <p className="text-muted-foreground mt-1">
              {session.course?.name_en} • {session.session_code}
            </p>
          </div>
          {isFinalized && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Completion Finalized
            </Badge>
          )}
        </div>

        {/* Course Rules */}
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completion Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <Badge variant="outline">
                Min Attendance: {session.course?.min_attendance_percent || 80}%
              </Badge>
              {session.course?.has_assessment && (
                <Badge variant="outline">
                  Pass Score: {session.course?.pass_score || 'N/A'}%
                </Badge>
              )}
              <Badge variant="outline">
                {session.course?.require_both_attendance_and_assessment
                  ? 'Requires Both Attendance & Assessment'
                  : 'Attendance OR Assessment'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="flex flex-wrap gap-4">
          <Badge variant="outline" className="text-success border-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed: {completedCount}
          </Badge>
          <Badge variant="outline" className="text-destructive border-destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed: {failedCount}
          </Badge>
          <Badge variant="outline" className="text-primary border-primary">
            <Award className="h-3 w-3 mr-1" />
            Passed: {passedCount}
          </Badge>
        </div>

        {/* Actions */}
        {canMarkCompletion && !isFinalized && (
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={applyRules}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Apply Rules
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => saveCompletionMutation.mutate(false)}
                  disabled={!hasChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={() => setShowFinalizeDialog(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Finalize Completion
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Participant Results</CardTitle>
            <CardDescription>
              Mark completion status and scores for each participant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments && enrollments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Pass/Fail</TableHead>
                    {canEdit && !isFinalized && <TableHead>Override</TableHead>}
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
                        <Badge
                          variant={enrollment.status === 'confirmed' ? 'default' : 'destructive'}
                        >
                          {enrollment.status === 'confirmed' ? 'Present' : 
                           enrollment.status === 'partial' ? 'Partial' : 'Absent'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {session.course?.has_assessment ? (
                          canMarkCompletion && !isFinalized ? (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={completionData[enrollment.id]?.score || ''}
                              onChange={(e) => updateCompletion(enrollment.id, 'score', e.target.value)}
                              className="w-20"
                              placeholder="0-100"
                            />
                          ) : (
                            <span>{completionData[enrollment.id]?.score || '-'}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canMarkCompletion && !isFinalized ? (
                          <Select
                            value={completionData[enrollment.id]?.status || 'pending'}
                            onValueChange={(value) => updateCompletion(enrollment.id, 'status', value)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {completionStatusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            className={
                              completionStatusOptions.find(o => o.value === completionData[enrollment.id]?.status)?.color
                            }
                          >
                            {completionStatusOptions.find(o => o.value === completionData[enrollment.id]?.status)?.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {completionData[enrollment.id]?.passed === true ? (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Pass
                          </Badge>
                        ) : completionData[enrollment.id]?.passed === false ? (
                          <Badge className="bg-destructive text-destructive-foreground">
                            <XCircle className="h-3 w-3 mr-1" />
                            Fail
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {canEdit && !isFinalized && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOverride(enrollment.id)}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No participants to grade</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finalize Dialog */}
        <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalize Completion</DialogTitle>
              <DialogDescription>
                This will lock all completion records and generate certificates where applicable.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm"><strong>Completed:</strong> {completedCount}</p>
                <p className="text-sm"><strong>Failed:</strong> {failedCount}</p>
                <p className="text-sm"><strong>Passed:</strong> {passedCount}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveCompletionMutation.mutate(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Finalize & Generate Certificates
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Override Dialog */}
        <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Override</DialogTitle>
              <DialogDescription>
                Provide a reason for manually adjusting this completion status.
              </DialogDescription>
            </DialogHeader>

            <div>
              <label className="text-sm font-medium">Reason *</label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Special case approved by HSE Manager"
                className="mt-2"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmOverride} disabled={!overrideReason.trim()}>
                Confirm Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
