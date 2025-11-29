import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calculator, CheckCircle, XCircle, Clock,
  GraduationCap, DollarSign, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useFinanceScholarshipQueue, 
  useScholarshipApplication,
  useProcessScholarshipApproval,
} from '@/hooks/useScholarship';

export default function ScholarshipFinanceReview() {
  const { data: applications, isLoading } = useFinanceScholarshipQueue();
  const processApproval = useProcessScholarshipApproval();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    applicationId: string | null;
    decision: 'approve' | 'reject';
  }>({ open: false, applicationId: null, decision: 'approve' });
  
  const [financeData, setFinanceData] = useState({
    budget_status: '',
    approved_amount: 0,
    cost_centre: '',
    finance_comments: '',
  });
  
  const { data: selectedApplication } = useScholarshipApplication(selectedAppId);
  
  const handleDecision = async () => {
    if (!decisionDialog.applicationId) return;
    
    await processApproval.mutateAsync({
      applicationId: decisionDialog.applicationId,
      decision: decisionDialog.decision,
      comments: financeData.finance_comments,
      additionalData: decisionDialog.decision === 'approve' ? {
        budget_status: financeData.budget_status,
        approved_amount: financeData.approved_amount,
        cost_centre: financeData.cost_centre,
        finance_comments: financeData.finance_comments,
      } : undefined,
    });
    
    setDecisionDialog({ open: false, applicationId: null, decision: 'approve' });
    setSelectedAppId(null);
    setFinanceData({
      budget_status: '',
      approved_amount: 0,
      cost_centre: '',
      finance_comments: '',
    });
  };
  
  // Calculate totals
  const totalEstimatedCost = applications?.reduce((sum, app) => sum + (app.total_estimated_cost || 0), 0) || 0;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Finance Review
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve budget allocations for scholarship applications
          </p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Applications</p>
                  <p className="text-2xl font-bold">{applications?.length || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                  <p className="text-2xl font-bold">{totalEstimatedCost.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Cost per Application</p>
                  <p className="text-2xl font-bold">
                    {applications?.length ? Math.round(totalEstimatedCost / applications.length).toLocaleString() : 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Pending Budget Review</CardTitle>
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
                      onClick={() => {
                        setSelectedAppId(app.id);
                        setFinanceData(prev => ({
                          ...prev,
                          approved_amount: app.total_estimated_cost || 0,
                        }));
                      }}
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
                          {app.committee_decision || 'Approved'}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-primary">
                          {app.total_estimated_cost?.toLocaleString()} {app.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Application Details & Budget Review */}
          <Card className="lg:col-span-2">
            {selectedApplication ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedApplication.program_name_custom}</CardTitle>
                      <CardDescription>
                        {selectedApplication.applicant?.first_name_en} {selectedApplication.applicant?.last_name_en} • 
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
                        Reject Budget
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDecisionDialog({ open: true, applicationId: selectedApplication.id, decision: 'approve' })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve Budget
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="costs">
                    <TabsList>
                      <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
                      <TabsTrigger value="committee">Committee Decision</TabsTrigger>
                      <TabsTrigger value="budget">Budget Allocation</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="costs" className="space-y-4 mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cost Item</TableHead>
                            <TableHead className="text-right">Amount ({selectedApplication.currency})</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Tuition (Total)</TableCell>
                            <TableCell className="text-right">
                              {selectedApplication.tuition_total?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Living Allowance</TableCell>
                            <TableCell className="text-right">
                              {selectedApplication.living_allowance?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Travel</TableCell>
                            <TableCell className="text-right">
                              {selectedApplication.travel_cost?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Visa & Insurance</TableCell>
                            <TableCell className="text-right">
                              {selectedApplication.visa_insurance_cost?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                          <TableRow className="font-bold">
                            <TableCell>Total Estimated</TableCell>
                            <TableCell className="text-right text-primary">
                              {selectedApplication.total_estimated_cost?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      
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
                          <Label className="text-muted-foreground">Duration</Label>
                          <p className="font-medium">{selectedApplication.duration_months} months</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Location</Label>
                          <p className="font-medium">{selectedApplication.city}, {selectedApplication.country}</p>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="committee" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Committee Decision</Label>
                          <Badge variant={
                            selectedApplication.committee_decision === 'approved' ? 'default' :
                            selectedApplication.committee_decision === 'rejected' ? 'destructive' : 'secondary'
                          } className="mt-1">
                            {selectedApplication.committee_decision || 'Approved'}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Committee Score</Label>
                          <p className="font-medium">{selectedApplication.committee_score_total?.toFixed(1) || 'N/A'}/5</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Committee Remarks</Label>
                        <p className="mt-1 text-sm">
                          {selectedApplication.committee_remarks || 'No remarks'}
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-muted-foreground">HRBP Recommendation</Label>
                        <Badge variant={
                          selectedApplication.hrbp_recommendation === 'proceed' ? 'default' : 'secondary'
                        } className="mt-1">
                          {selectedApplication.hrbp_recommendation || 'N/A'}
                        </Badge>
                        <p className="text-sm mt-2">{selectedApplication.hrbp_comments || 'No comments'}</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="budget" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Budget Status</Label>
                          <Select
                            value={financeData.budget_status}
                            onValueChange={(v) => setFinanceData(prev => ({ ...prev, budget_status: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approved_full">Approved (Full)</SelectItem>
                              <SelectItem value="approved_partial">Approved (Partial)</SelectItem>
                              <SelectItem value="not_approved">Not Approved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Approved Amount</Label>
                          <Input
                            type="number"
                            value={financeData.approved_amount}
                            onChange={(e) => setFinanceData(prev => ({ 
                              ...prev, 
                              approved_amount: parseFloat(e.target.value) || 0 
                            }))}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Cost Centre</Label>
                        <Input
                          value={financeData.cost_centre}
                          onChange={(e) => setFinanceData(prev => ({ ...prev, cost_centre: e.target.value }))}
                          placeholder="e.g., CC-HR-TRAINING-001"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Finance Comments</Label>
                        <Textarea
                          value={financeData.finance_comments}
                          onChange={(e) => setFinanceData(prev => ({ ...prev, finance_comments: e.target.value }))}
                          placeholder="Budget notes and comments..."
                        />
                      </div>
                      
                      {financeData.approved_amount !== selectedApplication.total_estimated_cost && (
                        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                          <CardContent className="pt-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                              <strong>Note:</strong> Approved amount differs from estimated cost by{' '}
                              {Math.abs((selectedApplication.total_estimated_cost || 0) - financeData.approved_amount).toLocaleString()} {selectedApplication.currency}
                            </p>
                          </CardContent>
                        </Card>
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
                {decisionDialog.decision === 'approve' ? 'Approve Budget' : 'Reject Budget'}
              </DialogTitle>
              <DialogDescription>
                {decisionDialog.decision === 'approve' 
                  ? 'Confirm budget allocation for this scholarship application.'
                  : 'This will reject the application due to budget constraints.'
                }
              </DialogDescription>
            </DialogHeader>
            
            {decisionDialog.decision === 'approve' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Approved Amount:</span>
                  <span className="font-bold">{financeData.approved_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost Centre:</span>
                  <span>{financeData.cost_centre || 'Not specified'}</span>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDecisionDialog(prev => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button 
                onClick={handleDecision}
                variant={decisionDialog.decision === 'reject' ? 'destructive' : 'default'}
                disabled={processApproval.isPending || (decisionDialog.decision === 'approve' && !financeData.budget_status)}
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
