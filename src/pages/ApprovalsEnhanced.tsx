import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useApprovalActions } from '@/hooks/useWorkflow';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Calendar,
  Building,
  Search,
  Filter,
  Eye,
  Forward,
  CheckCheck,
  AlertTriangle,
  DollarSign,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'High', color: 'bg-destructive text-destructive-foreground' },
  normal: { label: 'Normal', color: 'bg-muted text-muted-foreground' },
  low: { label: 'Low', color: 'bg-secondary text-secondary-foreground' },
};

export default function ApprovalsEnhanced() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { processApproval, delegateApproval } = useApprovalActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showDelegateDialog, setShowDelegateDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [delegateUserId, setDelegateUserId] = useState('');

  const canViewCost = hasRole('l_and_d') || hasRole('hrbp') || hasRole('admin') || hasRole('chro');

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['pending-approvals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          request:training_requests(
            *,
            course:courses(id, name_en, name_ar, delivery_mode, duration_days, training_location, cost_amount, cost_level)
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

  // Fetch approval history
  const { data: approvalHistory } = useQuery({
    queryKey: ['approval-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          request:training_requests(
            request_number,
            course:courses(name_en)
          )
        `)
        .eq('approver_id', user?.id)
        .neq('status', 'pending')
        .order('decision_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch managers for delegation
  const { data: managers } = useQuery({
    queryKey: ['managers-for-delegation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, email')
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Filter approvals
  const filteredApprovals = pendingApprovals?.filter(approval => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        approval.request?.request_number?.toLowerCase().includes(query) ||
        approval.request?.course?.name_en?.toLowerCase().includes(query) ||
        approval.request?.request_number?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (priorityFilter !== 'all' && approval.request?.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const handleAction = (approval: any, actionType: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setAction(actionType);
    setComments('');
    setShowActionDialog(true);
  };

  const handleViewDetails = (approval: any) => {
    setSelectedApproval(approval);
    setShowDetailsSheet(true);
  };

  const handleDelegate = (approval: any) => {
    setSelectedApproval(approval);
    setDelegateUserId('');
    setComments('');
    setShowDelegateDialog(true);
  };

  const confirmAction = () => {
    if (!selectedApproval || !action) return;

    processApproval.mutate({
      approvalId: selectedApproval.id,
      requestId: selectedApproval.request?.id,
      status: action === 'approve' ? 'approved' : 'rejected',
      comments,
      requesterId: selectedApproval.request?.requester_id,
    }, {
      onSuccess: () => {
        toast({
          title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
          description: 'The approval decision has been recorded.',
        });
        setShowActionDialog(false);
        setSelectedApproval(null);
        setAction(null);
        setComments('');
      },
      onError: (error: any) => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      },
    });
  };

  const confirmDelegate = () => {
    if (!selectedApproval || !delegateUserId) return;

    delegateApproval.mutate({
      approvalId: selectedApproval.id,
      delegateToUserId: delegateUserId,
      comments,
    }, {
      onSuccess: () => {
        toast({
          title: 'Approval Delegated',
          description: 'The approval has been delegated successfully.',
        });
        setShowDelegateDialog(false);
        setSelectedApproval(null);
        setDelegateUserId('');
        setComments('');
      },
      onError: (error: any) => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      },
    });
  };

  const handleBulkApprove = () => {
    selectedApprovals.forEach(approvalId => {
      const approval = pendingApprovals?.find(a => a.id === approvalId);
      if (approval) {
        processApproval.mutate({
          approvalId: approval.id,
          requestId: approval.request?.id,
          status: 'approved',
          comments: 'Bulk approved',
          requesterId: approval.request?.requester_id,
        });
      }
    });
    setSelectedApprovals([]);
    toast({
      title: 'Bulk Approval',
      description: `${selectedApprovals.length} requests approved.`,
    });
  };

  const toggleSelectAll = () => {
    if (selectedApprovals.length === filteredApprovals?.length) {
      setSelectedApprovals([]);
    } else {
      setSelectedApprovals(filteredApprovals?.map(a => a.id) || []);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Approval Worklist</h1>
            <p className="text-muted-foreground mt-1">
              Review and process training requests awaiting your approval
            </p>
          </div>
          {selectedApprovals.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedApprovals.length} selected</Badge>
              <Button onClick={handleBulkApprove}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Approve Selected
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
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
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {pendingApprovals?.filter(a => a.request?.priority === 'high').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {approvalHistory?.filter(a => 
                  a.status === 'approved' && 
                  a.decision_date && 
                  new Date(a.decision_date).toDateString() === new Date().toDateString()
                ).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {approvalHistory?.filter(a => 
                  a.status === 'rejected' && 
                  a.decision_date && 
                  new Date(a.decision_date).toDateString() === new Date().toDateString()
                ).length || 0}
              </div>
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
                  placeholder="Search by request #, course, or requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({filteredApprovals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({approvalHistory?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  Requests Awaiting Approval
                </CardTitle>
                <CardDescription>
                  Click a row to view details, or use the action buttons
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredApprovals && filteredApprovals.length > 0 ? (
                  <div className="space-y-3">
                    {filteredApprovals.map((approval) => (
                      <div
                        key={approval.id}
                        className="border rounded-lg p-3 space-y-2 bg-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedApprovals.includes(approval.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedApprovals([...selectedApprovals, approval.id]);
                                } else {
                                  setSelectedApprovals(selectedApprovals.filter(id => id !== approval.id));
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{approval.request?.course?.name_en}</p>
                              <p className="text-xs text-muted-foreground">#{approval.request?.request_number || '-'}</p>
                            </div>
                          </div>
                          <Badge className={`${priorityConfig[approval.request?.priority || 'normal']?.color} shrink-0 text-xs`}>
                            {priorityConfig[approval.request?.priority || 'normal']?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{(approval.request as any)?.requester?.first_name_en} {(approval.request as any)?.requester?.last_name_en}</span>
                          <span>•</span>
                          <span>
                            {approval.request?.submitted_at
                              ? format(new Date(approval.request.submitted_at), 'MMM dd')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {approval.request?.course?.delivery_mode?.replace('_', ' ')}
                          </Badge>
                          {approval.request?.course?.training_location === 'abroad' && (
                            <Badge variant="secondary" className="text-xs">Abroad</Badge>
                          )}
                        </div>
                        <div className="flex gap-1 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleViewDetails(approval)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                            onClick={() => handleAction(approval, 'approve')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleAction(approval, 'reject')}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
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
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Recent Decisions</CardTitle>
                <CardDescription>Your approval history</CardDescription>
              </CardHeader>
              <CardContent>
                {approvalHistory && approvalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {approvalHistory.map((approval) => (
                      <div key={approval.id} className="border rounded-lg p-3 space-y-2 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{approval.request?.course?.name_en}</p>
                            <p className="text-xs text-muted-foreground">#{approval.request?.request_number || '-'}</p>
                          </div>
                          <Badge variant={approval.status === 'approved' ? 'default' : 'destructive'} className="shrink-0 text-xs">
                            {approval.status === 'approved' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {approval.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {approval.decision_date
                              ? format(new Date(approval.decision_date), 'MMM dd, yyyy')
                              : '-'}
                          </span>
                          {approval.comments && (
                            <span className="truncate max-w-[200px]">{approval.comments}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No approval history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Details Sheet */}
        <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Request Details</SheetTitle>
              <SheetDescription>
                Review the complete request information
              </SheetDescription>
            </SheetHeader>

            {selectedApproval && (
              <div className="mt-6 space-y-6">
                {/* Request Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Request Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Request #</p>
                      <p className="font-medium">{selectedApproval.request?.request_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Priority</p>
                      <Badge className={priorityConfig[selectedApproval.request?.priority || 'normal']?.color}>
                        {priorityConfig[selectedApproval.request?.priority || 'normal']?.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {selectedApproval.request?.submitted_at
                          ? format(new Date(selectedApproval.request.submitted_at), 'MMM dd, yyyy')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Approval Level</p>
                      <p className="font-medium">{selectedApproval.approval_level}</p>
                    </div>
                  </div>
                </div>

                {/* Requester Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Requester</h3>
                  </div>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="font-medium">
                      {(selectedApproval.request as any)?.requester?.first_name_en} {(selectedApproval.request as any)?.requester?.last_name_en}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedApproval.request as any)?.requester?.job_title_en}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedApproval.request as any)?.requester?.employee_id}
                    </p>
                  </div>
                </div>

                {/* Course Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Course</h3>
                  </div>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="font-medium">{selectedApproval.request?.course?.name_en}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {selectedApproval.request?.course?.delivery_mode?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {selectedApproval.request?.course?.duration_days} days
                      </Badge>
                      {selectedApproval.request?.course?.training_location === 'abroad' && (
                        <Badge variant="secondary">Abroad</Badge>
                      )}
                    </div>
                    {canViewCost && selectedApproval.request?.course?.cost_amount && (
                      <div className="mt-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedApproval.request.course.cost_amount.toLocaleString()} LYD
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Justification */}
                {selectedApproval.request?.justification && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Justification</h3>
                    </div>
                    <p className="text-sm p-4 bg-muted rounded-lg">
                      {selectedApproval.request.justification}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowDetailsSheet(false);
                      handleAction(selectedApproval, 'approve');
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setShowDetailsSheet(false);
                      handleAction(selectedApproval, 'reject');
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Action Dialog */}
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </DialogTitle>
              <DialogDescription>
                {action === 'approve'
                  ? 'This will approve the training request.'
                  : 'This will reject the training request. Please provide a reason.'}
              </DialogDescription>
            </DialogHeader>

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

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowActionDialog(false)}>
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

        {/* Delegate Dialog */}
        <Dialog open={showDelegateDialog} onOpenChange={setShowDelegateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delegate Approval</DialogTitle>
              <DialogDescription>
                Forward this approval to another person
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Delegate To</label>
                <Select value={delegateUserId} onValueChange={setDelegateUserId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers?.filter(m => m.id !== user?.id).map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.first_name_en} {manager.last_name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Reason for Delegation</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Why are you delegating this approval?"
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelegateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmDelegate} disabled={!delegateUserId}>
                <Forward className="h-4 w-4 mr-2" />
                Delegate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
