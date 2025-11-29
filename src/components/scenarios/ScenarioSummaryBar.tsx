import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  TrendingDown, 
  TrendingUp,
  Minus,
} from 'lucide-react';
import type { PlanScenario } from '@/hooks/useScenarios';

interface ScenarioSummaryBarProps {
  scenario: PlanScenario;
}

export function ScenarioSummaryBar({ scenario }: ScenarioSummaryBarProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const costDelta = (scenario.scenario_total_cost || 0) - (scenario.baseline_total_cost || 0);
  const costDeltaPercent = scenario.baseline_total_cost 
    ? (costDelta / scenario.baseline_total_cost) * 100 
    : 0;
  
  const participantsDelta = (scenario.scenario_total_participants || 0) - (scenario.baseline_total_participants || 0);
  const participantsDeltaPercent = scenario.baseline_total_participants
    ? (participantsDelta / scenario.baseline_total_participants) * 100
    : 0;

  const budgetUtilization = scenario.global_budget_value && scenario.global_budget_type === 'percentage'
    ? (scenario.scenario_total_cost || 0) / ((scenario.baseline_total_cost || 1) * (scenario.global_budget_value / 100)) * 100
    : scenario.global_budget_value && scenario.global_budget_type === 'absolute'
    ? (scenario.scenario_total_cost || 0) / scenario.global_budget_value * 100
    : 100;

  const DeltaIcon = ({ delta }: { delta: number }) => {
    if (delta < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (delta > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const DeltaText = ({ delta, percent }: { delta: number; percent: number }) => {
    const color = delta < 0 ? 'text-red-500' : delta > 0 ? 'text-green-500' : 'text-muted-foreground';
    return (
      <span className={`text-sm font-medium ${color}`}>
        {delta > 0 ? '+' : ''}{percent.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Baseline Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Baseline Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(scenario.baseline_total_cost)}
          </div>
          <p className="text-xs text-muted-foreground">
            Original plan total
          </p>
        </CardContent>
      </Card>

      {/* Scenario Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scenario Cost</CardTitle>
          <DeltaIcon delta={costDelta} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(scenario.scenario_total_cost)}
          </div>
          <div className="flex items-center gap-2">
            <DeltaText delta={costDelta} percent={costDeltaPercent} />
            <span className="text-xs text-muted-foreground">
              ({formatCurrency(costDelta)})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Participants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {scenario.scenario_total_participants?.toLocaleString() || 0}
            </span>
            <span className="text-muted-foreground">
              / {scenario.baseline_total_participants?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DeltaIcon delta={participantsDelta} />
            <DeltaText delta={participantsDelta} percent={participantsDeltaPercent} />
          </div>
        </CardContent>
      </Card>

      {/* Budget Utilization */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {budgetUtilization.toFixed(0)}%
          </div>
          <Progress 
            value={Math.min(budgetUtilization, 100)} 
            className="mt-2 h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {scenario.global_budget_value 
              ? `Target: ${scenario.global_budget_type === 'percentage' 
                  ? `${scenario.global_budget_value}% of baseline`
                  : formatCurrency(scenario.global_budget_value)}`
              : 'No budget cap set'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
