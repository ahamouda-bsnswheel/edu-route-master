import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Clock, 
  User, 
  BookOpen, 
  Calendar, 
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  pending_approval: { label: "Pending Approval", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [comments, setComments] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  // Fetch request details
  const { data: request, isLoading } = useQuery({
    queryKey: ['training-request', id],
    queryFn: async () => {
      // First fetch the request with course
      const { data: requestData, error: requestError } = await supabase
        .from('training_requests')
        .select(`
          *,
          course:courses(
            id,
            name_en,
            name_ar,
            description_en,
            delivery_mode,
            duration_days,
            duration_hours,
            training_location,
            cost_level
          )
        `)
        .eq('id', id)
        .single();

      if (requestError) throw requestError;

      // Fetch requester profile separately
      let requester = null;
      if (requestData.requester_id) {
        const { data: requesterData } = await supabase
          .from('profiles')
          .select('id, first_name_en, last_name_en, email, employee_id, job_title_en, department:departments(name_en)')
          .eq('id', requestData.requester_id)
          .single();
        requester = requesterData;
      }

      return { ...requestData, requester };
    },
    enabled: !!id,
  });

  // Fetch approval record for current user
  const { data: pendingApproval } = useQuery({
    queryKey: ['pending-approval', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .eq('request_id', id)
        .eq('approver_id', user?.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  // Process approval mutation
  const processMutation = useMutation({
    mutationFn: async ({ action, comments }: { action: 'approve' | 'reject'; comments: string }) => {
      if (!pendingApproval) throw new Error('No pending approval found');

      // Update approval record
      const { error: approvalError } = await supabase
        .from('approvals')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          comments,
          decision_date: new Date().toISOString(),
        })
        .eq('id', pendingApproval.id);

      if (approvalError) throw approvalError;

      // Update training request status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { error: requestError } = await supabase
        .from('training_requests')
        .update({
          status: newStatus,
          current_approver_id: null,
        })
        .eq('id', id);

      if (requestError) throw requestError;

      // Create notification for requester
      await supabase.rpc('create_notification', {
        p_user_id: request?.requester_id,
        p_title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
        p_message: action === 'approve' 
          ? `Your training request for "${request?.course?.name_en}" has been approved.`
          : `Your training request for "${request?.course?.name_en}" has been rejected. ${comments ? `Reason: ${comments}` : ''}`,
        p_type: action === 'approve' ? 'success' : 'warning',
        p_reference_type: 'training_request',
        p_reference_id: id,
      });
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
        description: `The training request has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['training-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      navigate('/approvals');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAction = (action: 'approve' | 'reject') => {
    if (action === 'reject' && !comments.trim()) {
      toast({
        title: 'Comments Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }
    setActionType(action);
    setDialogOpen(true);
  };

  const confirmAction = () => {
    if (actionType) {
      processMutation.mutate({ action: actionType, comments });
    }
    setDialogOpen(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Request Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested training request could not be found.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig[request.status || 'pending'] || statusConfig.pending;
  const canApprove = pendingApproval && request.current_approver_id === user?.id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Training Request</h1>
              <p className="text-muted-foreground">#{request.request_number}</p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Course Name</p>
                <p className="font-medium">{request.course?.name_en}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Mode</p>
                  <p className="font-medium capitalize">{request.course?.delivery_mode?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {request.course?.duration_days ? `${request.course.duration_days} days` : 
                     request.course?.duration_hours ? `${request.course.duration_hours} hours` : 'N/A'}
                  </p>
                </div>
              </div>
              {request.course?.training_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{request.course.training_location}</span>
                </div>
              )}
              {request.course?.cost_level && (
                <div>
                  <p className="text-sm text-muted-foreground">Cost Level</p>
                  <Badge variant="outline" className="capitalize">{request.course.cost_level}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requester Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Requester Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {request.requester?.first_name_en} {request.requester?.last_name_en}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="font-medium">{request.requester?.employee_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Job Title</p>
                <p className="font-medium">{request.requester?.job_title_en || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{request.requester?.department?.name_en || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Submitted: {request.submitted_at ? format(new Date(request.submitted_at), 'PPP') : 'N/A'}
              </div>
            </CardContent>
          </Card>

          {/* Justification */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <Badge variant="outline" className="capitalize">{request.priority || 'normal'}</Badge>
                </div>
                {request.abroad_reason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Abroad Training Reason</p>
                    <p className="font-medium">{request.abroad_reason}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Justification</p>
                <p className="mt-1 p-3 bg-muted rounded-md">
                  {request.justification || 'No justification provided.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approval Actions */}
          {canApprove && (
            <Card className="md:col-span-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Your Approval
                </CardTitle>
                <CardDescription>
                  Review the request details and provide your decision
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Comments {actionType === 'reject' && <span className="text-destructive">*</span>}</label>
                  <Textarea
                    placeholder="Add your comments (required for rejection)..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleAction('approve')}
                    disabled={processMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleAction('reject')}
                    disabled={processMutation.isPending}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === 'approve' 
                  ? 'Are you sure you want to approve this training request?'
                  : 'Are you sure you want to reject this training request? This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAction}
                className={actionType === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
