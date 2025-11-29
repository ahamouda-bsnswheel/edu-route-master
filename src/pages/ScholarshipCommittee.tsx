import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Users2, CheckCircle, XCircle, Clock,
  GraduationCap, FileText, Star, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useCommitteeScholarshipQueue, 
  useScholarshipApplication,
  useScholarshipDocuments,
  useCommitteeScores,
  useSubmitCommitteeScore,
  useProcessScholarshipApproval,
} from '@/hooks/useScholarship';
import { useAuth } from '@/contexts/AuthContext';

export default function ScholarshipCommittee() {
  const { user } = useAuth();
  const { data: applications, isLoading } = useCommitteeScholarshipQueue();
  const submitScore = useSubmitCommitteeScore();
  const processApproval = useProcessScholarshipApproval();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    applicationId: string | null;
    decision: string;
  }>({ open: false, applicationId: null, decision: 'approved' });
  
  const [scoring, setScoring] = useState({
    candidate_quality_score: 3,
    business_relevance_score: 3,
    urgency_score: 3,
    cost_benefit_score: 3,
    comments: '',
    has_conflict_of_interest: false,
    abstained: false,
  });
  
  const { data: selectedApplication } = useScholarshipApplication(selectedAppId);
  const { data: documents } = useScholarshipDocuments(selectedAppId);
  const { data: scores } = useCommitteeScores(selectedAppId);
  
  const myScore = scores?.find(s => s.committee_member_id === user?.id);
  const avgScore = scores?.filter(s => !s.abstained).reduce((acc, s) => acc + (s.total_score || 0), 0) / (scores?.filter(s => !s.abstained).length || 1);
  
  const handleSubmitScore = async () => {
    if (!selectedAppId) return;
    
    await submitScore.mutateAsync({
      application_id: selectedAppId,
      ...scoring,
    });
  };
  
  const handleCommitteeDecision = async () => {
    if (!decisionDialog.applicationId) return;
    
    await processApproval.mutateAsync({
      applicationId: decisionDialog.applicationId,
      decision: decisionDialog.decision === 'rejected' ? 'reject' : 'approve',
      comments: `Committee decision: ${decisionDialog.decision}`,
      additionalData: {
        committee_decision: decisionDialog.decision,
        committee_score_total: avgScore,
      },
    });
    
    setDecisionDialog({ open: false, applicationId: null, decision: 'approved' });
    setSelectedAppId(null);
  };
  
  const ScoreSlider = ({ 
    label, 
    value, 
    onChange,
    disabled 
  }: { 
    label: string; 
    value: number; 
    onChange: (v: number) => void;
    disabled: boolean;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium">{value}/5</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={5}
        step={1}
        disabled={disabled}
      />
    </div>
  );
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users2 className="h-8 w-8" />
            Scholarship Committee
          </h1>
          <p className="text-muted-foreground mt-1">
            Evaluate and score scholarship applications
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Applications for Review</CardTitle>
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
                  <p className="text-muted-foreground">No applications pending</p>
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
                        <Badge 
                          variant={app.hrbp_recommendation === 'proceed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {app.hrbp_recommendation || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{app.total_estimated_cost?.toLocaleString()} {app.currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Application Details & Scoring */}
          <Card className="lg:col-span-2">
            {selectedApplication ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedApplication.program_name_custom}</CardTitle>
                      <CardDescription>
                        {selectedApplication.applicant?.first_name_en} {selectedApplication.applicant?.last_name_en} • 
                        {selectedApplication.institution_custom}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setDecisionDialog({ open: true, applicationId: selectedApplication.id, decision: 'approved' })}
                    >
                      Make Decision
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="reviews">Previous Reviews</TabsTrigger>
                      <TabsTrigger value="scoring">My Score</TabsTrigger>
                      <TabsTrigger value="aggregate">Aggregate Scores</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Program</Label>
                          <p className="font-medium">{selectedApplication.program_name_custom}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {selectedApplication.program_type?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Location</Label>
                          <p className="font-medium">
                            {selectedApplication.city}, {selectedApplication.country}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Duration</Label>
                          <p className="font-medium">{selectedApplication.duration_months} months</p>
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
                      
                      <div>
                        <Label className="text-muted-foreground">Competency Gaps</Label>
                        <p className="mt-1 text-sm">
                          {selectedApplication.competency_gaps || 'Not specified'}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="reviews" className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <Card className="bg-muted/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Manager Assessment</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex gap-2">
                              <Badge variant={
                                selectedApplication.operational_impact === 'high' ? 'destructive' : 'secondary'
                              }>
                                Impact: {selectedApplication.operational_impact || 'N/A'}
                              </Badge>
                              <Badge variant={
                                selectedApplication.risk_assessment === 'high' ? 'destructive' : 'secondary'
                              }>
                                Risk: {selectedApplication.risk_assessment || 'N/A'}
                              </Badge>
                            </div>
                            <p className="text-sm">{selectedApplication.manager_comments || 'No comments'}</p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-muted/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">HRBP Pre-Screen</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex gap-2">
                              {selectedApplication.eligibility_check && (
                                <Badge variant="default">Eligible</Badge>
                              )}
                              {selectedApplication.alignment_check && (
                                <Badge variant="default">Aligned</Badge>
                              )}
                              {selectedApplication.policy_compliance && (
                                <Badge variant="default">Compliant</Badge>
                              )}
                            </div>
                            <Badge variant={
                              selectedApplication.hrbp_recommendation === 'proceed' ? 'default' :
                              selectedApplication.hrbp_recommendation === 'not_recommended' ? 'destructive' : 'secondary'
                            }>
                              {selectedApplication.hrbp_recommendation || 'Pending'}
                            </Badge>
                            <p className="text-sm">{selectedApplication.hrbp_comments || 'No comments'}</p>
                          </CardContent>
                        </Card>
                        
                        {selectedApplication.ld_recommendation && (
                          <Card className="bg-muted/30">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">L&D Review</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Badge variant={
                                selectedApplication.ld_recommendation === 'proceed' ? 'default' :
                                selectedApplication.ld_recommendation === 'not_recommended' ? 'destructive' : 'secondary'
                              }>
                                {selectedApplication.ld_recommendation}
                              </Badge>
                              <p className="text-sm mt-2">{selectedApplication.ld_comments || 'No comments'}</p>
                            </CardContent>
                          </Card>
                        )}
                        
                        {selectedApplication.internal_notes && (
                          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                Internal Notes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">{selectedApplication.internal_notes}</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="scoring" className="space-y-4 mt-4">
                      {myScore && !scoring.abstained ? (
                        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                          <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            You have already submitted your score
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Your total score: {myScore.total_score?.toFixed(1)}/5
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start space-x-3 mb-4">
                            <Checkbox
                              id="conflict"
                              checked={scoring.has_conflict_of_interest}
                              onCheckedChange={(checked) => 
                                setScoring(prev => ({ 
                                  ...prev, 
                                  has_conflict_of_interest: !!checked,
                                  abstained: !!checked ? true : prev.abstained
                                }))
                              }
                            />
                            <div>
                              <Label htmlFor="conflict" className="font-medium">
                                I have a conflict of interest
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Check this if you're related to the applicant or have other conflicts
                              </p>
                            </div>
                          </div>
                          
                          {scoring.has_conflict_of_interest ? (
                            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                              <p className="text-amber-800 dark:text-amber-200">
                                You have declared a conflict of interest. Your score will be marked as abstained.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <ScoreSlider
                                label="Candidate Quality (performance, potential)"
                                value={scoring.candidate_quality_score}
                                onChange={(v) => setScoring(prev => ({ ...prev, candidate_quality_score: v }))}
                                disabled={scoring.abstained}
                              />
                              <ScoreSlider
                                label="Business Relevance of Program"
                                value={scoring.business_relevance_score}
                                onChange={(v) => setScoring(prev => ({ ...prev, business_relevance_score: v }))}
                                disabled={scoring.abstained}
                              />
                              <ScoreSlider
                                label="Urgency of Need (succession gap, strategic)"
                                value={scoring.urgency_score}
                                onChange={(v) => setScoring(prev => ({ ...prev, urgency_score: v }))}
                                disabled={scoring.abstained}
                              />
                              <ScoreSlider
                                label="Cost-Benefit"
                                value={scoring.cost_benefit_score}
                                onChange={(v) => setScoring(prev => ({ ...prev, cost_benefit_score: v }))}
                                disabled={scoring.abstained}
                              />
                              
                              <div className="bg-muted p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Total Score:</span>
                                  <span className="text-2xl font-bold text-primary">
                                    {((scoring.candidate_quality_score + scoring.business_relevance_score + 
                                       scoring.urgency_score + scoring.cost_benefit_score) / 4).toFixed(1)}/5
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label>Comments</Label>
                            <Textarea
                              value={scoring.comments}
                              onChange={(e) => setScoring(prev => ({ ...prev, comments: e.target.value }))}
                              placeholder="Your evaluation comments..."
                            />
                          </div>
                          
                          <Button 
                            onClick={handleSubmitScore} 
                            disabled={submitScore.isPending}
                            className="w-full"
                          >
                            {scoring.has_conflict_of_interest ? 'Submit Abstention' : 'Submit Score'}
                          </Button>
                        </>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="aggregate" className="space-y-4 mt-4">
                      {scores && scores.length > 0 ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-muted/30">
                              <CardContent className="pt-4">
                                <div className="text-center">
                                  <p className="text-3xl font-bold text-primary">{avgScore.toFixed(1)}</p>
                                  <p className="text-sm text-muted-foreground">Average Score</p>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-muted/30">
                              <CardContent className="pt-4">
                                <div className="text-center">
                                  <p className="text-3xl font-bold">{scores.filter(s => !s.abstained).length}</p>
                                  <p className="text-sm text-muted-foreground">Scores Submitted</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                          
                          <div className="space-y-2">
                            {scores.map((score, idx) => (
                              <div key={score.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                <span className="text-sm">Committee Member {idx + 1}</span>
                                {score.abstained ? (
                                  <Badge variant="secondary">Abstained</Badge>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-amber-500" />
                                    <span className="font-medium">{score.total_score?.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">No scores submitted yet</p>
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
        
        {/* Committee Decision Dialog */}
        <Dialog 
          open={decisionDialog.open} 
          onOpenChange={(open) => setDecisionDialog(prev => ({ ...prev, open }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Committee Decision</DialogTitle>
              <DialogDescription>
                Make a final committee decision for this application.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                {['approved', 'reserve', 'rejected'].map(decision => (
                  <Button
                    key={decision}
                    variant={decisionDialog.decision === decision ? 'default' : 'outline'}
                    onClick={() => setDecisionDialog(prev => ({ ...prev, decision }))}
                    className="justify-start"
                  >
                    {decision === 'approved' && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
                    {decision === 'reserve' && <Clock className="h-4 w-4 mr-2 text-amber-500" />}
                    {decision === 'rejected' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                    {decision.charAt(0).toUpperCase() + decision.slice(1)}
                  </Button>
                ))}
              </div>
              
              {avgScore > 0 && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Average Score:</span>{' '}
                    <span className="font-medium">{avgScore.toFixed(1)}/5</span>
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDecisionDialog(prev => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button 
                onClick={handleCommitteeDecision}
                disabled={processApproval.isPending}
              >
                Confirm Decision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
