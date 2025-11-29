import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, CheckCircle, XCircle, Clock,
  GraduationCap, DollarSign, Users, FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useFinalApprovalQueue, 
  useScholarshipApplication,
  useProcessScholarshipApproval,
} from '@/hooks/useScholarship';

export default function ScholarshipFinalApproval() {
  const { data: applications, isLoading } = useFinalApprovalQueue();
  const processApproval = useProcessScholarshipApproval();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    applicationId: string | null;
    decision: 'approve' | 'reject';
  }>({ open: false, applicationId: null, decision: 'approve' });
  const [comments, setComments] = useState('');
  
  const { data: selectedApplication } = useScholarshipApplication(selectedAppId);
  
  const handleDecision = async () => {
    if (!decisionDialog.applicationId) return;
    
    await processApproval.mutateAsync({
      applicationId: decisionDialog.applicationId,
      decision: decisionDialog.decision,
      comments,
      additionalData: {
        final_decision: decisionDialog.decision === 'approve' ? 'approved' : 'rejected',
        final_comments: comments,
      },
    });
    
    setDecisionDialog({ open: false, applicationId: null, decision: 'approve' });
    setSelectedAppId(null);
    setComments('');
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Final Approval
          </h1>
          <p className="text-muted-foreground mt-1">
            Executive review and final approval for scholarship applications
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Pending Final Approval</CardTitle>
              <CardDescription>{applications?.length || 0} application(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : applications?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending applications</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {applications?.map((app) => (
                    <div
                      key={app.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAppId === app.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedAppId(app.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {app.applicant?.first_name_en} {app.applicant?.last_name_en}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {app.program_name_custom}
                          </p>
                        </div>
                        <Badge variant="default" className="text-xs">
                          <FileCheck className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {app.approved_amount?.toLocaleString() || app.total_estimated_cost?.toLocaleString()} {app.currency}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Application Summary */}
          <Card className="lg:col-span-2">
            {selectedApplication ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedApplication.program_name_custom}</CardTitle>
                      <CardDescription>
                        {selectedApplication.application_number}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDecisionDialog({ open: true, applicationId: selectedApplication.id, decision: 'reject' })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDecisionDialog({ open: true, applicationId: selectedApplication.id, decision: 'approve' })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Final Approve
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="summary">
                    <TabsList>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="approvals">Approval Chain</TabsTrigger>
                      <TabsTrigger value="costs">Costs</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="summary" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <Label className="text-muted-foreground">Candidate</Label>
                            </div>
                            <p className="font-medium">
                              {selectedApplication.applicant?.first_name_en} {selectedApplication.applicant?.last_name_en}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedApplication.applicant?.job_title_en}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Grade: {selectedApplication.applicant?.grade || 'N/A'}
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <Label className="text-muted-foreground">Program</Label>
                            </div>
                            <p className="font-medium">{selectedApplication.program_name_custom}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedApplication.institution_custom}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {selectedApplication.program_type?.replace(/_/g, ' ')}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold text-primary">
                            {selectedApplication.duration_months}
                          </p>
                          <p className="text-sm text-muted-foreground">Months</p>
                        </div>
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold text-primary">
                            {selectedApplication.committee_score_total?.toFixed(1) || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">Committee Score</p>
                        </div>
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold text-primary">
                            {selectedApplication.approved_amount?.toLocaleString() || selectedApplication.total_estimated_cost?.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">Approved ({selectedApplication.currency})</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-muted-foreground">Justification</Label>
                        <p className="mt-1 text-sm whitespace-pre-wrap">
                          {selectedApplication.justification}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="approvals" className="space-y-4 mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">Manager Endorsement</p>
                            <p className="text-sm text-muted-foreground">
                              Impact: {selectedApplication.operational_impact || 'N/A'} | 
                              Risk: {selectedApplication.risk_assessment || 'N/A'}
                            </p>
                          </div>
                          <Badge variant="default">Approved</Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">HRBP Pre-Screen</p>
                            <p className="text-sm text-muted-foreground">
                              Recommendation: {selectedApplication.hrbp_recommendation || 'N/A'}
                            </p>
                          </div>
                          <Badge variant="default">Approved</Badge>
                        </div>
                        
                        {selectedApplication.ld_recommendation && (
                          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div className="flex-1">
                              <p className="font-medium">L&D Review</p>
                              <p className="text-sm text-muted-foreground">
                                Recommendation: {selectedApplication.ld_recommendation}
                              </p>
                            </div>
                            <Badge variant="default">Approved</Badge>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">Committee Decision</p>
                            <p className="text-sm text-muted-foreground">
                              Score: {selectedApplication.committee_score_total?.toFixed(1) || 'N/A'}/5
                            </p>
                          </div>
                          <Badge variant="default">{selectedApplication.committee_decision || 'Approved'}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">Finance Review</p>
                            <p className="text-sm text-muted-foreground">
                              Budget: {selectedApplication.budget_status || 'Approved'} | 
                              Cost Centre: {selectedApplication.cost_centre || 'N/A'}
                            </p>
                          </div>
                          <Badge variant="default">Approved</Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border-2 border-amber-300">
                          <Clock className="h-5 w-5 text-amber-600" />
                          <div className="flex-1">
                            <p className="font-medium">Final Approval (CHRO)</p>
                            <p className="text-sm text-muted-foreground">
                              Awaiting your decision
                            </p>
                          </div>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="costs" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Total Estimated Cost</Label>
                          <p className="text-2xl font-bold">
                            {selectedApplication.total_estimated_cost?.toLocaleString()} {selectedApplication.currency}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Approved Amount</Label>
                          <p className="text-2xl font-bold text-primary">
                            {selectedApplication.approved_amount?.toLocaleString() || selectedApplication.total_estimated_cost?.toLocaleString()} {selectedApplication.currency}
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Tuition</span>
                          <span>{selectedApplication.tuition_total?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Living Allowance</span>
                          <span>{selectedApplication.living_allowance?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Travel</span>
                          <span>{selectedApplication.travel_cost?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Visa & Insurance</span>
                          <span>{selectedApplication.visa_insurance_cost?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Funding Source</Label>
                          <p className="font-medium capitalize">
                            {selectedApplication.funding_source?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Company Contribution</Label>
                          <p className="font-medium">{selectedApplication.company_percentage}%</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Cost Centre</Label>
                          <p className="font-medium">{selectedApplication.cost_centre || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {selectedApplication.finance_comments && (
                        <div>
                          <Label className="text-muted-foreground">Finance Comments</Label>
                          <p className="mt-1 text-sm">{selectedApplication.finance_comments}</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select an application to review</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
        
        {/* Decision Dialog */}
        <Dialog 
          open={decisionDialog.open} 
          onOpenChange={(open) => setDecisionDialog(prev => ({ ...prev, open }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {decisionDialog.decision === 'approve' ? 'Final Approval' : 'Reject Application'}
              </DialogTitle>
              <DialogDescription>
                {decisionDialog.decision === 'approve' 
                  ? 'This will grant final approval and notify the candidate to accept the scholarship offer.'
                  : 'This will reject the application at the final stage.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={decisionDialog.decision === 'approve' 
                    ? 'Optional comments or instructions...'
                    : 'Please provide a reason for rejection...'
                  }
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDecisionDialog(prev => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button 
                onClick={handleDecision}
                variant={decisionDialog.decision === 'reject' ? 'destructive' : 'default'}
                disabled={processApproval.isPending || (decisionDialog.decision === 'reject' && !comments)}
              >
                {decisionDialog.decision === 'approve' ? 'Grant Final Approval' : 'Reject Application'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
