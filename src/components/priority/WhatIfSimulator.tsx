import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FlaskConical, 
  RotateCcw,
  Play,
  ArrowRight,
  Shield,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { useAIPriorityConfig, useSimulateScoring, type AIPriorityConfig } from '@/hooks/useAIPriority';
import { Skeleton } from '@/components/ui/skeleton';

interface SimulationResult {
  original: { critical: number; high: number; medium: number; low: number };
  simulated: { critical: number; high: number; medium: number; low: number };
}

const factorConfig = [
  { key: 'hse_criticality_weight', label: 'HSE Criticality', icon: Shield, color: 'text-red-500' },
  { key: 'competency_gap_weight', label: 'Competency Gap', icon: TrendingUp, color: 'text-orange-500' },
  { key: 'manager_priority_weight', label: 'Manager Priority', icon: Users, color: 'text-blue-500' },
  { key: 'role_criticality_weight', label: 'Role Criticality', icon: Target, color: 'text-purple-500' },
  { key: 'compliance_status_weight', label: 'Compliance', icon: CheckCircle, color: 'text-green-500' },
  { key: 'cost_efficiency_weight', label: 'Cost Efficiency', icon: DollarSign, color: 'text-emerald-500' },
  { key: 'strategic_alignment_weight', label: 'Strategic', icon: Target, color: 'text-indigo-500' },
] as const;

export function WhatIfSimulator() {
  const { data: config, isLoading: configLoading } = useAIPriorityConfig();
  const simulateMutation = useSimulateScoring();
  
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setWeights({
        hse_criticality_weight: config.hse_criticality_weight,
        competency_gap_weight: config.competency_gap_weight,
        manager_priority_weight: config.manager_priority_weight,
        role_criticality_weight: config.role_criticality_weight,
        compliance_status_weight: config.compliance_status_weight,
        cost_efficiency_weight: config.cost_efficiency_weight,
        strategic_alignment_weight: config.strategic_alignment_weight,
      });
    }
  }, [config]);

  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  }, [weights]);

  const handleWeightChange = (key: string, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setResult(null);
  };

  const handleReset = () => {
    if (config) {
      setWeights({
        hse_criticality_weight: config.hse_criticality_weight,
        competency_gap_weight: config.competency_gap_weight,
        manager_priority_weight: config.manager_priority_weight,
        role_criticality_weight: config.role_criticality_weight,
        compliance_status_weight: config.compliance_status_weight,
        cost_efficiency_weight: config.cost_efficiency_weight,
        strategic_alignment_weight: config.strategic_alignment_weight,
      });
      setHasChanges(false);
      setResult(null);
    }
  };

  const handleSimulate = async () => {
    const simResult = await simulateMutation.mutateAsync(weights);
    setResult(simResult as SimulationResult);
  };

  if (configLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          What-If Simulation
        </CardTitle>
        <CardDescription>
          Adjust weights to see how priority distribution would change without affecting live configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weight Sliders */}
        <div className="grid gap-4">
          {factorConfig.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <Label className="text-sm">{label}</Label>
                </div>
                <div className="flex items-center gap-2">
                  {config && weights[key] !== (config as any)[key] && (
                    <span className="text-xs text-muted-foreground">
                      was {(config as any)[key]}
                    </span>
                  )}
                  <Badge variant="outline" className="font-mono">{weights[key] || 0}</Badge>
                </div>
              </div>
              <Slider
                value={[weights[key] || 0]}
                onValueChange={([v]) => handleWeightChange(key, v)}
                max={50}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {/* Total Weight */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Total Weight</span>
          <Badge variant={totalWeight === 100 ? "default" : "secondary"}>
            {totalWeight} {totalWeight !== 100 && '(recommended: 100)'}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSimulate}
            disabled={!hasChanges || simulateMutation.isPending}
          >
            <Play className="h-4 w-4 mr-1" />
            {simulateMutation.isPending ? 'Simulating...' : 'Run Simulation'}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>

        {/* Simulation Results */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium flex items-center gap-2">
              Simulation Results
              <Badge variant="outline">Sample: 1000 items</Badge>
            </h4>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Original Distribution */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-muted-foreground">Current Config</h5>
                <div className="space-y-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map((band) => (
                    <div key={band} className="flex items-center gap-2">
                      <span className="w-16 text-xs capitalize">{band}</span>
                      <Progress 
                        value={(result.original[band] / 1000) * 100} 
                        className="flex-1 h-2"
                      />
                      <span className="w-12 text-xs text-right">{result.original[band]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Simulated Distribution */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-muted-foreground">With New Weights</h5>
                <div className="space-y-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map((band) => {
                    const diff = result.simulated[band] - result.original[band];
                    return (
                      <div key={band} className="flex items-center gap-2">
                        <span className="w-16 text-xs capitalize">{band}</span>
                        <Progress 
                          value={(result.simulated[band] / 1000) * 100} 
                          className="flex-1 h-2"
                        />
                        <span className="w-12 text-xs text-right">
                          {result.simulated[band]}
                          {diff !== 0 && (
                            <span className={diff > 0 ? 'text-green-500' : 'text-red-500'}>
                              {' '}({diff > 0 ? '+' : ''}{diff})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <Alert>
              <FlaskConical className="h-4 w-4" />
              <AlertDescription>
                This is a simulation only. To apply these weights, update the configuration in the Configuration tab.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
