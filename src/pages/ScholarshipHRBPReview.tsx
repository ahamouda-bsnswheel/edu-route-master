import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck, Eye, CheckCircle, XCircle, Clock,
  GraduationCap, FileText, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useHRBPScholarshipQueue, 
  useScholarshipApplication,
  useScholarshipDocuments,
  useProcessScholarshipApproval,
} from '@/hooks/useScholarship';
import { useAuth } from '@/contexts/AuthContext';

export default function ScholarshipHRBPReview() {
  const { hasRole } = useAuth();
  const isLnD = hasRole('l_and_d');
  const { data: applications, isLoading } = useHRBPScholarshipQueue();
  const processApproval = useProcessScholarshipApproval();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    applicationId: string | null;
    decision: 'approve' | 'reject';
  }>({ open: false, applicationId: null, decision: 'approve' });
  
  const [preScreenData, setPreScreenData] = useState({
    eligibility_check: false,
    eligibility_notes: '',
    alignment_check: false,
    alignment_notes: '',
    policy_compliance: false,
    policy_notes: '',
    recommendation: '',
    comments: '',
    internal_notes: '',
  });
  
  const { data: selectedApplication } = useScholarshipApplication(selectedAppId);
  const { data: documents } = useScholarshipDocuments(selectedAppId);
  
  // Filter applications based on role
  const filteredApplications = applications?.filter(app => {
    if (isLnD) return app.status === 'ld_review';
    return app.status === 'hrbp_review';
  });
  
  const handleDecision = async () => {
    if (!decisionDialog.applicationId) return;
    
    const additionalData = decisionDialog.decision === 'approve' ? {
      ...(isLnD ? {
        ld_recommendation: preScreenData.recommendation,
        ld_comments: preScreenData.comments,
      } : {
        eligibility_check: preScreenData.eligibility_check,
        eligibility_notes: preScreenData.eligibility_notes,
        alignment_check: preScreenData.alignment_check,
        alignment_notes: preScreenData.alignment_notes,
        policy_compliance: preScreenData.policy_compliance,
        policy_notes: preScreenData.policy_notes,
        hrbp_recommendation: preScreenData.recommendation,
        hrbp_comments: preScreenData.comments,
      }),
      internal_notes: preScreenData.internal_notes,
    } : {};
    
    await processApproval.mutateAsync({
      applicationId: decisionDialog.applicationId,
      decision: decisionDialog.decision,
      comments: preScreenData.comments,
      additionalData,
    });
    
    setDecisionDialog({ open: false, applicationId: null, decision: 'approve' });
    setSelectedAppId(null);
    setPreScreenData({
      eligibility_check: false,
      eligibility_notes: '',
      alignment_check: false,
      alignment_notes: '',
      policy_compliance: false,
      policy_notes: '',
      recommendation: '',
      comments: '',
      internal_notes: '',
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCheck className="h-8 w-8" />
            {isLnD ? 'L&D Pre-Screen' : 'HRBP Pre-Screen'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Review applications for eligibility and alignment
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>{filteredApplications?.length || 0} application(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredApplications?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending applications</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredApplications?.map((app) => (
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
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Application Details */}
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
                        Not Recommended
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDecisionDialog({ open: true, applicationId: selectedApplication.id, decision: 'approve' })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Recommend
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="details">
                    <TabsList>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="manager">Manager Assessment</TabsTrigger>
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                      <TabsTrigger value="prescreen">Pre-Screen Checklist</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Applicant</Label>
                          <p className="font-medium">
                            {selectedApplication.applicant?.first_name_en} {selectedApplication.applicant?.last_name_en}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedApplication.applicant?.job_title_en}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Institution</Label>
                          <p className="font-medium">{selectedApplication.institution_custom}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedApplication.city}, {selectedApplication.country}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Program Type</Label>
                          <p className="font-medium capitalize">
                            {selectedApplication.program_type?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Total Cost</Label>
                          <p className="font-medium text-primary">
                            {selectedApplication.total_estimated_cost?.toLocaleString()} {selectedApplication.currency}
                          </p>
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
                    
                    <TabsContent value="manager" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Operational Impact</Label>
                          <Badge variant={
                            selectedApplication.operational_impact === 'high' ? 'destructive' :
                            selectedApplication.operational_impact === 'medium' ? 'default' : 'secondary'
                          }>
                            {selectedApplication.operational_impact || 'Not assessed'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Risk Assessment</Label>
                          <Badge variant={
                            selectedApplication.risk_assessment === 'high' ? 'destructive' :
                            selectedApplication.risk_assessment === 'medium' ? 'default' : 'secondary'
                          }>
                            {selectedApplication.risk_assessment || 'Not assessed'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Impact Description</Label>
                        <p className="mt-1 text-sm">
                          {selectedApplication.impact_description || 'No description provided'}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Replacement Plan</Label>
                        <p className="mt-1 text-sm">
                          {selectedApplication.replacement_plan || 'No plan provided'}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Manager Comments</Label>
                        <p className="mt-1 text-sm">
                          {selectedApplication.manager_comments || 'No comments'}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="documents" className="mt-4">
                      {documents && documents.length > 0 ? (
                        <div className="space-y-2">
                          {documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>{doc.file_name}</span>
                                <Badge variant="outline">{doc.document_type}</Badge>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">No documents</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="prescreen" className="space-y-4 mt-4">
                      {!isLnD && (
                        <>
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="eligibility"
                              checked={preScreenData.eligibility_check}
                              onCheckedChange={(checked) => 
                                setPreScreenData(prev => ({ ...prev, eligibility_check: !!checked }))
                              }
                            />
                            <div className="space-y-1">
                              <Label htmlFor="eligibility" className="font-medium">
                                Eligibility Check Passed
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Minimum years of service, performance rating, etc.
                              </p>
                            </div>
                          </div>
                          <Textarea
                            placeholder="Eligibility notes..."
                            value={preScreenData.eligibility_notes}
                            onChange={(e) => setPreScreenData(prev => ({ ...prev, eligibility_notes: e.target.value }))}
                          />
                          
                          <Separator />
                          
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="alignment"
                              checked={preScreenData.alignment_check}
                              onCheckedChange={(checked) => 
                                setPreScreenData(prev => ({ ...prev, alignment_check: !!checked }))
                              }
                            />
                            <div className="space-y-1">
                              <Label htmlFor="alignment" className="font-medium">
                                Aligned with Talent/Succession Plans
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Candidate identified as high-potential, critical role pipeline
                              </p>
                            </div>
                          </div>
                          <Textarea
                            placeholder="Alignment notes..."
                            value={preScreenData.alignment_notes}
                            onChange={(e) => setPreScreenData(prev => ({ ...prev, alignment_notes: e.target.value }))}
                          />
                          
                          <Separator />
                          
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="policy"
                              checked={preScreenData.policy_compliance}
                              onCheckedChange={(checked) => 
                                setPreScreenData(prev => ({ ...prev, policy_compliance: !!checked }))
                              }
                            />
                            <div className="space-y-1">
                              <Label htmlFor="policy" className="font-medium">
                                Policy Compliance
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                No outstanding bond obligations, previous scholarships
                              </p>
                            </div>
                          </div>
                          <Textarea
                            placeholder="Policy compliance notes..."
                            value={preScreenData.policy_notes}
                            onChange={(e) => setPreScreenData(prev => ({ ...prev, policy_notes: e.target.value }))}
                          />
                          
                          <Separator />
                        </>
                      )}
                      
                      <div className="space-y-2">
                        <Label>Recommendation</Label>
                        <Select
                          value={preScreenData.recommendation}
                          onValueChange={(v) => setPreScreenData(prev => ({ ...prev, recommendation: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select recommendation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proceed">Proceed</SelectItem>
                            <SelectItem value="proceed_with_conditions">Proceed with Conditions</SelectItem>
                            <SelectItem value="not_recommended">Not Recommended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Comments</Label>
                        <Textarea
                          value={preScreenData.comments}
                          onChange={(e) => setPreScreenData(prev => ({ ...prev, comments: e.target.value }))}
                          placeholder="Your recommendation comments..."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Internal Notes (not visible to applicant)</Label>
                        <Textarea
                          value={preScreenData.internal_notes}
                          onChange={(e) => setPreScreenData(prev => ({ ...prev, internal_notes: e.target.value }))}
                          placeholder="Internal notes for committee..."
                        />
                      </div>
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
                {decisionDialog.decision === 'approve' ? 'Recommend Application' : 'Not Recommended'}
              </DialogTitle>
              <DialogDescription>
                {decisionDialog.decision === 'approve' 
                  ? 'This will forward the application to the next review stage.'
                  : 'This will mark the application as not recommended.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDecisionDialog(prev => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button 
                onClick={handleDecision}
                variant={decisionDialog.decision === 'reject' ? 'destructive' : 'default'}
                disabled={processApproval.isPending}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
