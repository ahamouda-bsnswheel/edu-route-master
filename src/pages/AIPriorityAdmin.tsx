import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Play, 
  Settings,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { AIPriorityConfigPanel } from '@/components/priority/AIPriorityConfigPanel';
import { AIPriorityDashboard } from '@/components/priority/AIPriorityDashboard';
import { useStartBatchScoring, useAIScoringJobs } from '@/hooks/useAIPriority';
import { useTNAPeriods } from '@/hooks/useTNA';
import { useTrainingPlans } from '@/hooks/useTrainingPlan';
import { toast } from 'sonner';

export default function AIPriorityAdmin() {
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [scoringTarget, setScoringTarget] = useState<'tna' | 'plan'>('tna');
  
  const { data: tnaPeriods = [] } = useTNAPeriods();
  const { data: plans = [] } = useTrainingPlans();
  const { data: jobs = [] } = useAIScoringJobs();
  const startBatchScoring = useStartBatchScoring();
  
  const runningJob = jobs.find(j => j.status === 'running');
  
  const handleStartScoring = async () => {
    if (scoringTarget === 'tna' && !selectedPeriodId) {
      toast.error('Please select a TNA period');
      return;
    }
    if (scoringTarget === 'plan' && !selectedPlanId) {
      toast.error('Please select a training plan');
      return;
    }
    
    await startBatchScoring.mutateAsync({
      tnaPeriodId: scoringTarget === 'tna' ? selectedPeriodId : undefined,
      planId: scoringTarget === 'plan' ? selectedPlanId : undefined,
    });
  };

  return (
    <DashboardLayout 
      title="AI Training Prioritisation" 
      description="Configure and run AI-powered training need prioritisation"
    >
      <div className="space-y-6">
        {/* Running Job Alert */}
        {runningJob && (
          <Alert>
            <Brain className="h-4 w-4 animate-pulse" />
            <AlertDescription>
              Scoring job in progress: {runningJob.processed_items}/{runningJob.total_items} items processed
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Run Scoring
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <AIPriorityDashboard />
          </TabsContent>

          <TabsContent value="scoring" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Run AI Prioritisation
                </CardTitle>
                <CardDescription>
                  Score training needs using AI to determine priority based on configured factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant={scoringTarget === 'tna' ? 'default' : 'outline'}
                      onClick={() => setScoringTarget('tna')}
                    >
                      TNA Items
                    </Button>
                    <Button
                      variant={scoringTarget === 'plan' ? 'default' : 'outline'}
                      onClick={() => setScoringTarget('plan')}
                    >
                      Training Plan Items
                    </Button>
                  </div>

                  {scoringTarget === 'tna' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select TNA Period</label>
                      <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue placeholder="Select TNA period to score" />
                        </SelectTrigger>
                        <SelectContent>
                          {tnaPeriods.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                              {period.name} ({period.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Training Plan</label>
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue placeholder="Select training plan to score" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - {plan.fiscal_year} ({plan.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    About AI Prioritisation
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>AI scores are based on configured factor weights and thresholds</li>
                    <li>Factors include HSE criticality, competency gaps, manager priority, and more</li>
                    <li>Scores can be manually overridden by L&D/HRBP with justification</li>
                    <li>AI does not make final decisions - humans approve/reject based on scores</li>
                    <li>Batch scoring of 200,000 items completes within 2 hours</li>
                  </ul>
                </div>

                {/* Start Button */}
                <Button
                  size="lg"
                  onClick={handleStartScoring}
                  disabled={
                    startBatchScoring.isPending || 
                    !!runningJob ||
                    (scoringTarget === 'tna' && !selectedPeriodId) ||
                    (scoringTarget === 'plan' && !selectedPlanId)
                  }
                >
                  <Play className="h-5 w-5 mr-2" />
                  {startBatchScoring.isPending ? 'Starting...' : 'Start AI Prioritisation'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <AIPriorityConfigPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
