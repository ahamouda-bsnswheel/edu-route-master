import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  Play, 
  AlertCircle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { useTNAPeriods } from '@/hooks/useTNA';
import { useTrainingPlans } from '@/hooks/useTrainingPlan';
import { useStartHistoricalScoring, useHistoricalScoringResults } from '@/hooks/useAIPriority';

export function HistoricalScoring() {
  const [dataSource, setDataSource] = useState<'tna' | 'plan'>('tna');
  const [selectedId, setSelectedId] = useState<string>('');
  
  const { data: tnaPeriods = [] } = useTNAPeriods();
  const { data: plans = [] } = useTrainingPlans();
  const startHistorical = useStartHistoricalScoring();
  const { data: historicalResults = [], isLoading: resultsLoading } = useHistoricalScoringResults();

  // Filter to show only past/archived periods for historical analysis
  const historicalPeriods = tnaPeriods.filter(p => p.status === 'archived');
  const historicalPlans = plans.filter(p => p.status === 'locked' || p.status === 'approved');

  const handleStartScoring = async () => {
    if (!selectedId) return;
    
    await startHistorical.mutateAsync({
      type: dataSource,
      id: selectedId,
    });
  };

  return (
    <div className="space-y-6">
      {/* Historical Scoring Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historical Data Scoring
          </CardTitle>
          <CardDescription>
            Apply AI prioritisation to historical TNA or training plan data for model calibration and analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Source Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant={dataSource === 'tna' ? 'default' : 'outline'}
                onClick={() => {
                  setDataSource('tna');
                  setSelectedId('');
                }}
              >
                Historical TNA
              </Button>
              <Button
                variant={dataSource === 'plan' ? 'default' : 'outline'}
                onClick={() => {
                  setDataSource('plan');
                  setSelectedId('');
                }}
              >
                Historical Training Plans
              </Button>
            </div>

            {dataSource === 'tna' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Historical TNA Period</label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select closed TNA period" />
                  </SelectTrigger>
                  <SelectContent>
                    {historicalPeriods.length === 0 ? (
                      <SelectItem value="" disabled>No historical periods available</SelectItem>
                    ) : (
                      historicalPeriods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.name} ({period.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Historical Training Plan</label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select approved/locked plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {historicalPlans.length === 0 ? (
                      <SelectItem value="" disabled>No historical plans available</SelectItem>
                    ) : (
                      historicalPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.fiscal_year} ({plan.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Historical scoring is for analysis only. Results will be marked as "Historical – For Analysis Only" 
              and will not affect current prioritisation. Use this to calibrate the model based on known outcomes.
            </AlertDescription>
          </Alert>

          {/* Start Button */}
          <Button
            onClick={handleStartScoring}
            disabled={!selectedId || startHistorical.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {startHistorical.isPending ? 'Starting...' : 'Start Historical Scoring'}
          </Button>
        </CardContent>
      </Card>

      {/* Historical Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Historical Scoring Results
          </CardTitle>
          <CardDescription>
            Past historical scoring jobs and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resultsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : historicalResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No historical scoring results yet</p>
              <p className="text-sm mt-2">Run historical scoring to see calibration data</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Items Scored</TableHead>
                  <TableHead>Distribution</TableHead>
                  <TableHead>Scored At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{result.dataset_name}</p>
                        <Badge variant="outline" className="text-xs">Historical</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{result.data_type}</TableCell>
                    <TableCell>{result.total_items.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <Badge className="bg-destructive text-destructive-foreground">
                          {result.distribution.critical}
                        </Badge>
                        <Badge className="bg-orange-500 text-white">
                          {result.distribution.high}
                        </Badge>
                        <Badge className="bg-yellow-500 text-black">
                          {result.distribution.medium}
                        </Badge>
                        <Badge variant="secondary">
                          {result.distribution.low}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(result.scored_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Calibration Analysis Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Calibration Analysis</CardTitle>
          <CardDescription>
            Compare AI scores with actual training outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Calibration analysis requires outcome data</p>
            <p className="text-sm mt-2">
              Link completion rates and effectiveness scores to historical items 
              to see how well AI predictions correlated with actual results
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
