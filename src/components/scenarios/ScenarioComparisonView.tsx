import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Minus, GitCompare } from 'lucide-react';
import { useScenarios, useScenarioComparison } from '@/hooks/useScenarios';

interface ScenarioComparisonViewProps {
  currentScenarioId: string;
  basisPlanId: string;
}

export function ScenarioComparisonView({ currentScenarioId, basisPlanId }: ScenarioComparisonViewProps) {
  const [compareScenarioId, setCompareScenarioId] = useState<string>('');
  
  const { data: scenarios, isLoading: scenariosLoading } = useScenarios(basisPlanId);
  const { data: comparisonData, isLoading: comparisonLoading } = useScenarioComparison(
    compareScenarioId ? [currentScenarioId, compareScenarioId] : [currentScenarioId]
  );

  const otherScenarios = scenarios?.filter(s => s.id !== currentScenarioId) || [];
  const currentData = comparisonData?.find(s => s.id === currentScenarioId);
  const compareData = comparisonData?.find(s => s.id === compareScenarioId);

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getComparison = (current: number | null, compare: number | null) => {
    if (current === null || compare === null) return null;
    const diff = current - compare;
    const percent = compare !== 0 ? (diff / compare) * 100 : 0;
    return { diff, percent };
  };

  if (scenariosLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Scenario Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Scenarios
          </CardTitle>
          <CardDescription>
            Select another scenario to compare with the current one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={compareScenarioId} onValueChange={setCompareScenarioId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a scenario to compare" />
            </SelectTrigger>
            <SelectContent>
              {otherScenarios.map((scenario) => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </SelectItem>
              ))}
              {otherScenarios.length === 0 && (
                <SelectItem value="" disabled>
                  No other scenarios available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      {currentData && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Scenario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{currentData.name}</span>
                <Badge>Current</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentData.scenario_total_cost)}
                </div>
                {currentData.baseline_total_cost && (
                  <div className="text-sm text-muted-foreground">
                    {((currentData.scenario_total_cost || 0) / currentData.baseline_total_cost * 100).toFixed(1)}% of baseline
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Participants</div>
                <div className="text-xl font-bold">
                  {currentData.scenario_total_participants?.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Cost vs Baseline</div>
                <Progress 
                  value={currentData.baseline_total_cost 
                    ? ((currentData.scenario_total_cost || 0) / currentData.baseline_total_cost) * 100
                    : 100
                  } 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Comparison Scenario */}
          <Card className={!compareData ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{compareData?.name || 'Select a scenario'}</span>
                {compareData && <Badge variant="outline">Compare</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {compareData ? (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      {formatCurrency(compareData.scenario_total_cost)}
                      {(() => {
                        const comp = getComparison(
                          currentData.scenario_total_cost,
                          compareData.scenario_total_cost
                        );
                        if (!comp) return null;
                        const Icon = comp.diff < 0 ? TrendingDown : comp.diff > 0 ? TrendingUp : Minus;
                        const color = comp.diff < 0 ? 'text-red-500' : comp.diff > 0 ? 'text-green-500' : '';
                        return (
                          <span className={`text-sm ${color} flex items-center gap-1`}>
                            <Icon className="h-4 w-4" />
                            {comp.diff > 0 ? '+' : ''}{comp.percent.toFixed(1)}%
                          </span>
                        );
                      })()}
                    </div>
                    {compareData.baseline_total_cost && (
                      <div className="text-sm text-muted-foreground">
                        {((compareData.scenario_total_cost || 0) / compareData.baseline_total_cost * 100).toFixed(1)}% of baseline
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Participants</div>
                    <div className="text-xl font-bold flex items-center gap-2">
                      {compareData.scenario_total_participants?.toLocaleString()}
                      {(() => {
                        const comp = getComparison(
                          currentData.scenario_total_participants,
                          compareData.scenario_total_participants
                        );
                        if (!comp) return null;
                        const color = comp.diff < 0 ? 'text-red-500' : comp.diff > 0 ? 'text-green-500' : '';
                        return (
                          <span className={`text-sm ${color}`}>
                            ({comp.diff > 0 ? '+' : ''}{comp.diff})
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Cost vs Baseline</div>
                    <Progress 
                      value={compareData.baseline_total_cost 
                        ? ((compareData.scenario_total_cost || 0) / compareData.baseline_total_cost) * 100
                        : 100
                      } 
                      className="h-2"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a scenario above to compare
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Scenarios Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Scenarios Summary</CardTitle>
          <CardDescription>
            Quick comparison of all scenarios for this plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scenarios?.map((scenario) => {
              const costPercent = scenario.baseline_total_cost
                ? ((scenario.scenario_total_cost || 0) / scenario.baseline_total_cost) * 100
                : 100;
              const delta = costPercent - 100;
              
              return (
                <div 
                  key={scenario.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    scenario.id === currentScenarioId ? 'bg-muted border-primary' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{scenario.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(scenario.scenario_total_cost)}
                    </div>
                  </div>
                  <div className="w-32">
                    <Progress value={Math.min(costPercent, 150)} max={150} className="h-2" />
                  </div>
                  <div className={`w-20 text-right font-mono text-sm ${
                    delta < 0 ? 'text-red-500' : delta > 0 ? 'text-green-500' : ''
                  }`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                  </div>
                  <Badge variant={scenario.id === currentScenarioId ? 'default' : 'outline'}>
                    {scenario.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
