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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { createNotification } from '@/hooks/useNotifications';
import { SessionTravelVisaTab } from '@/components/travel/SessionTravelVisaTab';
import { SessionItineraryTab } from '@/components/itinerary/SessionItineraryTab';
import { SessionIncidentsTab } from '@/components/incidents/SessionIncidentsTab';
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Clock,
  User,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Plane,
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

export default function SessionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const canManage = hasRole('l_and_d') || hasRole('admin');

  // Fetch session details
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          course:courses(id, name_en, name_ar, delivery_mode, training_location, duration_days, description_en)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch enrollments
  const { data: enrollments } = useQuery({
    queryKey: ['session-enrollments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_enrollments')
        .select(`
          *,
          participant:profiles!session_enrollments_participant_id_fkey(id, first_name_en, last_name_en, email, department_id)
        `)
        .eq('session_id', id)
        .order('enrolled_at');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch approved requests for this course (not yet enrolled)
  const { data: approvedRequests } = useQuery({
    queryKey: ['approved-requests', session?.course_id],
    queryFn: async () => {
      if (!session?.course_id) return [];

      const enrolledParticipantIds = enrollments?.map(e => e.participant_id) || [];

      const { data, error } = await supabase
        .from('training_requests')
        .select(`
          *,
          requester:profiles!training_requests_requester_id_fkey(id, first_name_en, last_name_en, email)
        `)
        .eq('course_id', session.course_id)
        .eq('status', 'approved')
        .not('requester_id', 'in', `(${enrolledParticipantIds.join(',') || 'null'})`);

      if (error) throw error;
      return data;
    },
    enabled: !!session?.course_id && canManage,
  });

  // Add participants mutation
  const addParticipantsMutation = useMutation({
    mutationFn: async () => {
      const enrollmentsToCreate = selectedRequests.map(requestId => {
        const request = approvedRequests?.find(r => r.id === requestId);
        return {
          session_id: id,
          participant_id: request?.requester_id,
          request_id: requestId,
          enrolled_by: user?.id,
          status: (session?.enrolled_count || 0) < (session?.capacity || 0) ? 'confirmed' : 'waitlisted',
          waitlist_position: (session?.enrolled_count || 0) >= (session?.capacity || 0) 
            ? (session?.waitlist_count || 0) + 1 
            : null,
        };
      });

      const { error } = await supabase
        .from('session_enrollments')
        .insert(enrollmentsToCreate);

      if (error) throw error;

      // Update enrolled/waitlist counts
      const confirmedCount = enrollmentsToCreate.filter(e => e.status === 'confirmed').length;
      const waitlistCount = enrollmentsToCreate.filter(e => e.status === 'waitlisted').length;

      await supabase
        .from('sessions')
        .update({
          enrolled_count: (session?.enrolled_count || 0) + confirmedCount,
          waitlist_count: (session?.waitlist_count || 0) + waitlistCount,
        })
        .eq('id', id);

        // Update request statuses
        for (const enrollment of enrollmentsToCreate) {
          await supabase
            .from('training_requests')
            .update({ 
              status: enrollment.status === 'confirmed' ? 'completed' : 'approved',
              session_id: id,
            })
            .eq('id', enrollment.request_id);

        // Send notification
        if (enrollment.participant_id) {
          await createNotification({
            user_id: enrollment.participant_id,
            title: enrollment.status === 'confirmed' ? 'Enrollment Confirmed' : 'Added to Waitlist',
            message: `You have been ${enrollment.status === 'confirmed' ? 'enrolled in' : 'added to the waitlist for'} a training session.`,
            type: 'enrollment_confirmed',
            reference_type: 'session',
            reference_id: id,
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Participants Added', description: 'Participants have been enrolled in the session.' });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['session-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['approved-requests'] });
      setShowAddParticipants(false);
      setSelectedRequests([]);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const enrollment = enrollments?.find(e => e.id === enrollmentId);
      
      const { error } = await supabase
        .from('session_enrollments')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', enrollmentId);

      if (error) throw error;

      // Update counts
      if (enrollment?.status === 'confirmed') {
        await supabase
          .from('sessions')
          .update({ enrolled_count: Math.max(0, (session?.enrolled_count || 1) - 1) })
          .eq('id', id);

        // Promote from waitlist if available
        const nextWaitlisted = enrollments?.find(e => e.status === 'waitlisted');
        if (nextWaitlisted) {
          await supabase
            .from('session_enrollments')
            .update({ status: 'confirmed', waitlist_position: null })
            .eq('id', nextWaitlisted.id);

          await supabase
            .from('sessions')
            .update({ waitlist_count: Math.max(0, (session?.waitlist_count || 1) - 1) })
            .eq('id', id);

          if (nextWaitlisted.participant_id) {
            await createNotification({
              user_id: nextWaitlisted.participant_id,
              title: 'Enrollment Confirmed',
              message: 'A spot opened up! You have been moved from the waitlist to confirmed.',
              type: 'enrollment_confirmed',
              reference_type: 'session',
              reference_id: id,
            });
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Participant Removed', description: 'The participant has been removed from the session.' });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['session-enrollments'] });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Cancel session mutation
  const cancelSessionMutation = useMutation({
    mutationFn: async () => {
      // Log the change
      await supabase.from('session_changes').insert({
        session_id: id,
        change_type: 'cancelled',
        old_values: { status: session?.status },
        new_values: { status: 'cancelled' },
        reason: cancelReason,
        changed_by: user?.id,
      });

      // Update session status
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      // Cancel all enrollments and notify participants
      const confirmedEnrollments = enrollments?.filter(e => e.status === 'confirmed' || e.status === 'waitlisted') || [];
      
      for (const enrollment of confirmedEnrollments) {
        await supabase
          .from('session_enrollments')
          .update({ status: 'cancelled', cancellation_reason: 'Session cancelled' })
          .eq('id', enrollment.id);

        if (enrollment.participant_id) {
          await createNotification({
            user_id: enrollment.participant_id,
            title: 'Session Cancelled',
            message: `The training session has been cancelled. ${cancelReason ? `Reason: ${cancelReason}` : ''}`,
            type: 'session_cancelled',
            reference_type: 'session',
            reference_id: id,
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Session Cancelled', description: 'The session has been cancelled and participants notified.' });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['session-enrollments'] });
      setShowCancelDialog(false);
      setCancelReason('');
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const confirmedEnrollments = enrollments?.filter(e => e.status === 'confirmed') || [];
  const waitlistedEnrollments = enrollments?.filter(e => e.status === 'waitlisted') || [];
  const capacityPercentage = session?.capacity ? ((session.enrolled_count || 0) / session.capacity) * 100 : 0;

  if (isLoading) {
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{session.course?.name_en}</h1>
              <Badge className={statusConfig[session.status || 'scheduled']?.color}>
                {statusConfig[session.status || 'scheduled']?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {session.session_code || 'Session'} • {session.course?.delivery_mode?.replace('_', ' ')}
            </p>
          </div>
          {canManage && session.status !== 'cancelled' && session.status !== 'completed' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/sessions/${id}/attendance`)}>
                <Users className="h-4 w-4 mr-2" />
                Attendance
              </Button>
              <Button variant="outline" onClick={() => navigate(`/sessions/${id}/completion`)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Completion
              </Button>
              <Button variant="outline" onClick={() => navigate(`/sessions/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Session Info */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{format(new Date(session.start_date), 'MMMM dd, yyyy')}</p>
              <p className="text-sm text-muted-foreground">
                to {format(new Date(session.end_date), 'MMMM dd, yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{session.location_en || 'TBD'}</p>
              {session.venue_details && (
                <p className="text-sm text-muted-foreground">{session.venue_details}</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold">{session.enrolled_count || 0}</span>
                <span className="text-muted-foreground">/ {session.capacity || 0}</span>
              </div>
              <Progress value={capacityPercentage} className="h-2" />
              {(session.waitlist_count || 0) > 0 && (
                <p className="text-xs text-warning mt-2">
                  +{session.waitlist_count} on waitlist
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Participants */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Participants</CardTitle>
                <CardDescription>
                  Manage enrolled participants and waitlist
                </CardDescription>
              </div>
              {canManage && session.status !== 'cancelled' && session.status !== 'completed' && (
                <Button onClick={() => setShowAddParticipants(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participants
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="confirmed">
              <TabsList>
                <TabsTrigger value="confirmed">
                  Confirmed ({confirmedEnrollments.length})
                </TabsTrigger>
                <TabsTrigger value="waitlist">
                  Waitlist ({waitlistedEnrollments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="confirmed" className="mt-4">
                {confirmedEnrollments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Enrolled</TableHead>
                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {confirmedEnrollments.map((enrollment: any) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {enrollment.participant?.first_name_en} {enrollment.participant?.last_name_en}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{enrollment.participant?.email}</TableCell>
                          <TableCell>
                            {format(new Date(enrollment.enrolled_at), 'MMM dd, yyyy')}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => removeParticipantMutation.mutate(enrollment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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
                    <p>No confirmed participants yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="waitlist" className="mt-4">
                {waitlistedEnrollments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Added</TableHead>
                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitlistedEnrollments.map((enrollment: any, index: number) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <Badge variant="outline">{index + 1}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {enrollment.participant?.first_name_en} {enrollment.participant?.last_name_en}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{enrollment.participant?.email}</TableCell>
                          <TableCell>
                            {format(new Date(enrollment.enrolled_at), 'MMM dd, yyyy')}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => removeParticipantMutation.mutate(enrollment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No participants on waitlist</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Travel & Visa Tab for Abroad Sessions */}
        {session.course?.training_location === 'abroad' && (
          <>
            <SessionTravelVisaTab sessionId={id!} />
            <SessionItineraryTab 
              sessionId={id!} 
              participants={(enrollments || [])
                .filter(e => e.status === 'confirmed')
                .map(e => ({
                  id: e.id,
                  employee_id: e.participant_id,
                  employee_name: (e.participant as any)
                    ? `${(e.participant as any).first_name_en || ''} ${(e.participant as any).last_name_en || ''}`.trim()
                    : undefined,
                }))}
            />
            <SessionIncidentsTab 
              sessionId={id!} 
              participants={(enrollments || [])
                .filter(e => e.status === 'confirmed')
                .map(e => ({
                  id: e.id,
                  employee_id: e.participant_id,
                  employee_name: (e.participant as any)
                    ? `${(e.participant as any).first_name_en || ''} ${(e.participant as any).last_name_en || ''}`.trim()
                    : undefined,
                }))}
            />
          </>
        )}

        {/* Add Participants Dialog */}
        <Dialog open={showAddParticipants} onOpenChange={setShowAddParticipants}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Participants</DialogTitle>
              <DialogDescription>
                Select from approved training requests for this course
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-96 overflow-y-auto">
              {approvedRequests && approvedRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead>Request #</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRequests.includes(request.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRequests([...selectedRequests, request.id]);
                              } else {
                                setSelectedRequests(selectedRequests.filter(id => id !== request.id));
                              }
                            }}
                            className="rounded border-input"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {request.requester?.first_name_en} {request.requester?.last_name_en}
                          </span>
                        </TableCell>
                        <TableCell>{request.request_number}</TableCell>
                        <TableCell>
                          <Badge variant={request.priority === 'high' ? 'destructive' : 'outline'}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No approved requests available for this course</p>
                </div>
              )}
            </div>

            {selectedRequests.length > 0 && (session?.enrolled_count || 0) + selectedRequests.length > (session?.capacity || 0) && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>
                  Some participants will be added to the waitlist (capacity: {session?.capacity})
                </span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddParticipants(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addParticipantsMutation.mutate()}
                disabled={selectedRequests.length === 0}
              >
                Add {selectedRequests.length} Participant{selectedRequests.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Session Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Session</DialogTitle>
              <DialogDescription>
                This will cancel the session and notify all enrolled participants.
              </DialogDescription>
            </DialogHeader>

            <div>
              <label className="text-sm font-medium">Reason for cancellation</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Provide a reason for cancelling this session..."
                className="mt-2"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Session
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelSessionMutation.mutate()}
              >
                Cancel Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
