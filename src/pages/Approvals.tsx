import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  requiresExtendedWorkflow,
  processApprovalDecision,
} from '@/hooks/useApprovalWorkflow';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Calendar,
  Building,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Approvals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');

  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['pending-approvals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          request:training_requests(
            *,
            course:courses(name_en, name_ar, delivery_mode, duration_days, training_location, cost_level)
          )
        `)
        .eq('approver_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch requester profiles separately
      if (data && data.length > 0) {
        const requesterIds = [...new Set(data.map(a => a.request?.requester_id).filter(Boolean))];
        if (requesterIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name_en, last_name_en, employee_id, job_title_en')
            .in('id', requesterIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          return data.map(approval => ({
            ...approval,
            request: approval.request ? {
              ...approval.request,
              requester: profileMap.get(approval.request.requester_id) || null
            } : null
          }));
        }
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  const processMutation = useMutation({
    mutationFn: async ({
      approvalId,
      status,
      comments,
    }: {
      approvalId: string;
      status: 'approved' | 'rejected';
      comments: string;
    }) => {
      const request = selectedApproval?.request;
      const course = request?.course;
      const currentLevel = selectedApproval?.approval_level || 1;
      const isExtendedWorkflow = requiresExtendedWorkflow(course || {});

      // Use the shared workflow utility to process the approval decision
      await processApprovalDecision({
        approvalId,
        requestId: request.id,
        employeeId: request.requester_id,
        courseName: course?.name_en || 'training',
        currentLevel,
        status,
        comments,
        isExtendedWorkflow,
      });
    },
    onSuccess: () => {
      toast({
        title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
        description: action === 'approve' 
          ? 'The request has been processed and routed appropriately.'
          : 'The request has been rejected.',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      setSelectedApproval(null);
      setAction(null);
      setComments('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to process approval',
      });
    },
  });

  const handleAction = (approval: any, actionType: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setAction(actionType);
    setComments('');
  };

  const confirmAction = () => {
    if (!selectedApproval || !action) return;

    processMutation.mutate({
      approvalId: selectedApproval.id,
      status: action === 'approve' ? 'approved' : 'rejected',
      comments,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and process training requests awaiting your approval
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {pendingApprovals?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approvals Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Requests Awaiting Approval
            </CardTitle>
            <CardDescription>
              Click approve or reject to process each request
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : pendingApprovals && pendingApprovals.length > 0 ? (
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {approval.request?.request_number || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {(approval.request as any)?.requester?.first_name_en} {(approval.request as any)?.requester?.last_name_en}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(approval.request as any)?.requester?.job_title_en || (approval.request as any)?.requester?.employee_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {approval.request?.course?.name_en}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {approval.request?.course?.delivery_mode?.replace('_', ' ')}
                            </Badge>
                            {approval.request?.course?.training_location === 'abroad' && (
                              <Badge variant="secondary" className="text-xs">
                                Abroad
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {approval.request?.submitted_at
                          ? format(new Date(approval.request.submitted_at), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleAction(approval, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleAction(approval, 'reject')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground mt-1">
                  No pending approvals at the moment
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Dialog */}
        <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </DialogTitle>
              <DialogDescription>
                {action === 'approve'
                  ? 'This will approve the training request and move it to the next approval level if applicable.'
                  : 'This will reject the training request. Please provide a reason.'}
              </DialogDescription>
            </DialogHeader>

            {selectedApproval && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm">
                    <strong>Course:</strong> {selectedApproval.request?.course?.name_en}
                  </p>
                  <p className="text-sm">
                    <strong>Requester:</strong>{' '}
                    {selectedApproval.request?.requester?.first_name_en}{' '}
                    {selectedApproval.request?.requester?.last_name_en}
                  </p>
                  {selectedApproval.request?.justification && (
                    <p className="text-sm">
                      <strong>Justification:</strong>{' '}
                      {selectedApproval.request.justification}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Comments {action === 'reject' && <span className="text-destructive">*</span>}
                  </label>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={
                      action === 'reject'
                        ? 'Please provide a reason for rejection...'
                        : 'Optional comments...'
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                disabled={action === 'reject' && !comments.trim()}
                variant={action === 'approve' ? 'default' : 'destructive'}
              >
                {action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
