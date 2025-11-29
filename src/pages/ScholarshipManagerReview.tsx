import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Eye, CheckCircle, XCircle, RotateCcw, Clock,
  GraduationCap, Building2, MapPin, DollarSign, FileText, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useManagerScholarshipQueue, 
  useScholarshipApplication,
  useScholarshipDocuments,
  useProcessScholarshipApproval,
  ScholarshipApplication
} from '@/hooks/useScholarship';

export default function ScholarshipManagerReview() {
  const navigate = useNavigate();
  const { data: applications, isLoading } = useManagerScholarshipQueue();
  const processApproval = useProcessScholarshipApproval();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    applicationId: string | null;
    decision: 'approve' | 'reject' | 'return';
  }>({ open: false, applicationId: null, decision: 'approve' });
  
  const [managerAssessment, setManagerAssessment] = useState({
    operational_impact: '',
    impact_description: '',
    replacement_plan: '',
    risk_assessment: '',
    risk_comments: '',
    manager_comments: '',
  });
  
  const { data: selectedApplication } = useScholarshipApplication(selectedAppId);
  const { data: documents } = useScholarshipDocuments(selectedAppId);
  
  const handleDecision = async () => {
    if (!decisionDialog.applicationId) return;
    
    await processApproval.mutateAsync({
      applicationId: decisionDialog.applicationId,
      decision: decisionDialog.decision,
      comments: managerAssessment.manager_comments,
      additionalData: decisionDialog.decision === 'approve' ? {
        operational_impact: managerAssessment.operational_impact,
        impact_description: managerAssessment.impact_description,
        replacement_plan: managerAssessment.replacement_plan,
        risk_assessment: managerAssessment.risk_assessment,
        risk_comments: managerAssessment.risk_comments,
        manager_comments: managerAssessment.manager_comments,
      } : undefined,
    });
    
    setDecisionDialog({ open: false, applicationId: null, decision: 'approve' });
    setSelectedAppId(null);
    setManagerAssessment({
      operational_impact: '',
      impact_description: '',
      replacement_plan: '',
      risk_assessment: '',
      risk_comments: '',
      manager_comments: '',
    });
  };
  
  const openDecisionDialog = (applicationId: string, decision: 'approve' | 'reject' | 'return') => {
    setDecisionDialog({ open: true, applicationId, decision });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Team Scholarship Applications
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and endorse scholarship applications from your team
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
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
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {app.country}
                        <span>•</span>
                        <span>{app.duration_months} months</span>
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
                        {selectedApplication.application_number} • Submitted {selectedApplication.submitted_at && format(new Date(selectedApplication.submitted_at), 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDecisionDialog(selectedApplication.id, 'return')}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Return
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDecisionDialog(selectedApplication.id, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openDecisionDialog(selectedApplication.id, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Endorse
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="details">
                    <TabsList>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="justification">Justification</TabsTrigger>
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                      <TabsTrigger value="assessment">Your Assessment</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Applicant</Label>
                          <p className="font-medium">
                            {selectedApplication.applicant?.first_name_en} {selectedApplication.applicant?.last_name_en}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedApplication.applicant?.job_title_en} • {selectedApplication.applicant?.employee_id}
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
                          <Label className="text-muted-foreground">Study Mode</Label>
                          <p className="font-medium capitalize">
                            {selectedApplication.study_mode?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Duration</Label>
                          <p className="font-medium">{selectedApplication.duration_months} months</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Total Estimated Cost</Label>
                          <p className="font-medium text-primary">
                            {selectedApplication.total_estimated_cost?.toLocaleString()} {selectedApplication.currency}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="justification" className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-muted-foreground">Justification</Label>
                          <p className="mt-1 text-sm whitespace-pre-wrap">
                            {selectedApplication.justification || 'No justification provided'}
                          </p>
                        </div>
                        <Separator />
                        <div>
                          <Label className="text-muted-foreground">Competency Gaps</Label>
                          <p className="mt-1 text-sm whitespace-pre-wrap">
                            {selectedApplication.competency_gaps || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Target Role</Label>
                          <p className="mt-1 text-sm">
                            {selectedApplication.target_role || 'Not specified'}
                          </p>
                        </div>
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
                        <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="assessment" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Operational Impact</Label>
                          <Select 
                            value={managerAssessment.operational_impact}
                            onValueChange={(v) => setManagerAssessment(prev => ({ ...prev, operational_impact: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select impact level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Risk Assessment</Label>
                          <Select 
                            value={managerAssessment.risk_assessment}
                            onValueChange={(v) => setManagerAssessment(prev => ({ ...prev, risk_assessment: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select risk level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Impact Description</Label>
                        <Textarea
                          value={managerAssessment.impact_description}
                          onChange={(e) => setManagerAssessment(prev => ({ ...prev, impact_description: e.target.value }))}
                          placeholder="Describe the impact on team operations..."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Replacement Plan</Label>
                        <Textarea
                          value={managerAssessment.replacement_plan}
                          onChange={(e) => setManagerAssessment(prev => ({ ...prev, replacement_plan: e.target.value }))}
                          placeholder="Describe the plan to cover this employee's responsibilities..."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Additional Comments</Label>
                        <Textarea
                          value={managerAssessment.manager_comments}
                          onChange={(e) => setManagerAssessment(prev => ({ ...prev, manager_comments: e.target.value }))}
                          placeholder="Any additional comments or recommendations..."
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
                {decisionDialog.decision === 'approve' && 'Endorse Application'}
                {decisionDialog.decision === 'reject' && 'Reject Application'}
                {decisionDialog.decision === 'return' && 'Return Application'}
              </DialogTitle>
              <DialogDescription>
                {decisionDialog.decision === 'approve' && 'This will forward the application to HRBP for further review.'}
                {decisionDialog.decision === 'reject' && 'This will reject the application and notify the employee.'}
                {decisionDialog.decision === 'return' && 'This will return the application to the employee for revision.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Comments {decisionDialog.decision !== 'approve' && '(Required)'}</Label>
                <Textarea
                  value={managerAssessment.manager_comments}
                  onChange={(e) => setManagerAssessment(prev => ({ ...prev, manager_comments: e.target.value }))}
                  placeholder={
                    decisionDialog.decision === 'approve' 
                      ? 'Optional comments...'
                      : 'Please provide a reason...'
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
                disabled={processApproval.isPending || (decisionDialog.decision !== 'approve' && !managerAssessment.manager_comments)}
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
