import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  GraduationCap, Plus, Search, Eye, Edit, Clock, 
  CheckCircle, XCircle, AlertCircle, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { useMyScholarshipApplications, useRespondToOffer } from '@/hooks/useScholarship';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Edit },
  submitted_to_manager: { label: 'Pending Manager', variant: 'default', icon: Clock },
  manager_review: { label: 'Manager Review', variant: 'default', icon: Clock },
  returned_to_employee: { label: 'Returned', variant: 'outline', icon: AlertCircle },
  rejected_by_manager: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  hrbp_review: { label: 'HRBP Review', variant: 'default', icon: Clock },
  ld_review: { label: 'L&D Review', variant: 'default', icon: Clock },
  committee_review: { label: 'Committee Review', variant: 'default', icon: Clock },
  finance_review: { label: 'Finance Review', variant: 'default', icon: Clock },
  final_approval: { label: 'Final Approval', variant: 'default', icon: Clock },
  approved_pending_acceptance: { label: 'Awaiting Your Response', variant: 'default', icon: CheckCircle },
  accepted: { label: 'Accepted', variant: 'default', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  declined_by_candidate: { label: 'Declined', variant: 'secondary', icon: XCircle },
  withdrawn: { label: 'Withdrawn', variant: 'secondary', icon: XCircle },
};

export default function MyScholarshipApplications() {
  const navigate = useNavigate();
  const { data: applications, isLoading } = useMyScholarshipApplications();
  const respondMutation = useRespondToOffer();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [respondDialog, setRespondDialog] = useState<{ open: boolean; applicationId: string | null; accept: boolean }>({
    open: false,
    applicationId: null,
    accept: true,
  });
  const [declineReason, setDeclineReason] = useState('');
  
  const filteredApplications = applications?.filter(app => {
    const matchesSearch = 
      app.program_name_custom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.institution_custom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.application_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const handleRespond = async () => {
    if (!respondDialog.applicationId) return;
    
    await respondMutation.mutateAsync({
      applicationId: respondDialog.applicationId,
      accept: respondDialog.accept,
      declineReason: !respondDialog.accept ? declineReason : undefined,
    });
    
    setRespondDialog({ open: false, applicationId: null, accept: true });
    setDeclineReason('');
  };
  
  const getStatusInfo = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, variant: 'secondary' as const, icon: Clock };
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              My Scholarship Applications
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your long-term program applications
            </p>
          </div>
          <Button onClick={() => navigate('/scholarship/apply')}>
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by program, institution, or application number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted_to_manager">Pending Manager</SelectItem>
                  <SelectItem value="approved_pending_acceptance">Awaiting Response</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              {filteredApplications?.length || 0} application(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredApplications?.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Applications Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : "You haven't submitted any scholarship applications yet"}
                </p>
                <Button onClick={() => navigate('/scholarship/apply')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Application
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications?.map((app) => {
                    const statusInfo = getStatusInfo(app.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-mono text-sm">
                          {app.application_number || 'Draft'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {app.program_name_custom || app.program?.name_en || 'N/A'}
                        </TableCell>
                        <TableCell>{app.institution_custom || app.program?.institution_en || 'N/A'}</TableCell>
                        <TableCell>{app.country}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {app.submitted_at 
                            ? format(new Date(app.submitted_at), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {app.status === 'approved_pending_acceptance' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setRespondDialog({ open: true, applicationId: app.id, accept: true })}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRespondDialog({ open: true, applicationId: app.id, accept: false })}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}
                            {['draft', 'returned_to_employee'].includes(app.status) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/scholarship/apply/${app.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/scholarship/apply/${app.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Response Dialog */}
        <Dialog open={respondDialog.open} onOpenChange={(open) => setRespondDialog(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {respondDialog.accept ? 'Accept Scholarship Offer' : 'Decline Scholarship Offer'}
              </DialogTitle>
              <DialogDescription>
                {respondDialog.accept 
                  ? 'By accepting, you agree to the service commitment terms.'
                  : 'Please provide a reason for declining this offer.'
                }
              </DialogDescription>
            </DialogHeader>
            
            {!respondDialog.accept && (
              <div className="space-y-2">
                <Label>Reason for Declining</Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please explain why you are declining this offer..."
                />
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setRespondDialog({ open: false, applicationId: null, accept: true })}>
                Cancel
              </Button>
              <Button 
                onClick={handleRespond}
                variant={respondDialog.accept ? 'default' : 'destructive'}
                disabled={respondMutation.isPending || (!respondDialog.accept && !declineReason)}
              >
                {respondDialog.accept ? 'Confirm Acceptance' : 'Confirm Decline'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
