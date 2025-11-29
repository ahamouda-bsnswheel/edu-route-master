import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  Save, 
  RotateCcw,
  FlaskConical,
  Shield,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useAIPriorityConfig, useUpdateAIPriorityConfig, type AIPriorityConfig } from '@/hooks/useAIPriority';

interface WeightSliderProps {
  label: string;
  icon: any;
  value: number;
  onChange: (value: number) => void;
  description: string;
}

function WeightSlider({ label, icon: Icon, value, onChange, description }: WeightSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <Label>{label}</Label>
        </div>
        <span className="font-mono text-sm">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={50}
        min={0}
        step={5}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function AIPriorityConfigPanel() {
  const { data: config, isLoading } = useAIPriorityConfig();
  const updateConfig = useUpdateAIPriorityConfig();
  
  const [localConfig, setLocalConfig] = useState<Partial<AIPriorityConfig>>({});
  const [isSimulation, setIsSimulation] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig({
        hse_criticality_weight: config.hse_criticality_weight,
        competency_gap_weight: config.competency_gap_weight,
        manager_priority_weight: config.manager_priority_weight,
        role_criticality_weight: config.role_criticality_weight,
        compliance_status_weight: config.compliance_status_weight,
        cost_efficiency_weight: config.cost_efficiency_weight,
        strategic_alignment_weight: config.strategic_alignment_weight,
        critical_threshold: config.critical_threshold,
        high_threshold: config.high_threshold,
        medium_threshold: config.medium_threshold,
      });
    }
  }, [config]);

  const handleWeightChange = (key: keyof AIPriorityConfig, value: number) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config) return;
    await updateConfig.mutateAsync({
      id: config.id,
      ...localConfig,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    if (config) {
      setLocalConfig({
        hse_criticality_weight: config.hse_criticality_weight,
        competency_gap_weight: config.competency_gap_weight,
        manager_priority_weight: config.manager_priority_weight,
        role_criticality_weight: config.role_criticality_weight,
        compliance_status_weight: config.compliance_status_weight,
        cost_efficiency_weight: config.cost_efficiency_weight,
        strategic_alignment_weight: config.strategic_alignment_weight,
        critical_threshold: config.critical_threshold,
        high_threshold: config.high_threshold,
        medium_threshold: config.medium_threshold,
      });
      setHasChanges(false);
    }
  };

  // Calculate total weight
  const totalWeight = 
    (localConfig.hse_criticality_weight || 0) +
    (localConfig.competency_gap_weight || 0) +
    (localConfig.manager_priority_weight || 0) +
    (localConfig.role_criticality_weight || 0) +
    (localConfig.compliance_status_weight || 0) +
    (localConfig.cost_efficiency_weight || 0) +
    (localConfig.strategic_alignment_weight || 0);

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              AI Prioritisation Configuration
            </CardTitle>
            <CardDescription>
              Configure factor weights and thresholds for training priority scoring
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={isSimulation}
                onCheckedChange={setIsSimulation}
                id="simulation-mode"
              />
              <Label htmlFor="simulation-mode" className="flex items-center gap-1">
                <FlaskConical className="h-4 w-4" />
                Simulation
              </Label>
            </div>
            {config && (
              <Badge variant="outline">v{config.version}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weights">
          <TabsList className="mb-4">
            <TabsTrigger value="weights">Factor Weights</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          </TabsList>

          <TabsContent value="weights" className="space-y-6">
            {/* Total Weight Warning */}
            {totalWeight !== 100 && (
              <Alert variant={totalWeight > 100 ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Total weight is {totalWeight}. Recommended total is 100 for balanced scoring.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6">
              <WeightSlider
                label="HSE Criticality"
                icon={Shield}
                value={localConfig.hse_criticality_weight || 0}
                onChange={(v) => handleWeightChange('hse_criticality_weight', v)}
                description="Weight for safety-critical and HSE mandatory training"
              />

              <WeightSlider
                label="Competency Gap"
                icon={TrendingUp}
                value={localConfig.competency_gap_weight || 0}
                onChange={(v) => handleWeightChange('competency_gap_weight', v)}
                description="Weight for severity of competency gaps identified"
              />

              <WeightSlider
                label="Manager Priority"
                icon={Users}
                value={localConfig.manager_priority_weight || 0}
                onChange={(v) => handleWeightChange('manager_priority_weight', v)}
                description="Weight for priority assigned by line manager in TNA"
              />

              <WeightSlider
                label="Role Criticality"
                icon={Target}
                value={localConfig.role_criticality_weight || 0}
                onChange={(v) => handleWeightChange('role_criticality_weight', v)}
                description="Weight for criticality of employee's role (succession risk, key positions)"
              />

              <WeightSlider
                label="Compliance Status"
                icon={CheckCircle}
                value={localConfig.compliance_status_weight || 0}
                onChange={(v) => handleWeightChange('compliance_status_weight', v)}
                description="Weight for mandatory compliance or overdue training"
              />

              <WeightSlider
                label="Cost Efficiency"
                icon={DollarSign}
                value={localConfig.cost_efficiency_weight || 0}
                onChange={(v) => handleWeightChange('cost_efficiency_weight', v)}
                description="Weight bonus for cost-effective training options"
              />

              <WeightSlider
                label="Strategic Alignment"
                icon={Target}
                value={localConfig.strategic_alignment_weight || 0}
                onChange={(v) => handleWeightChange('strategic_alignment_weight', v)}
                description="Weight for alignment with strategic themes"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total Weight:</span>
                <Badge variant={totalWeight === 100 ? "default" : "secondary"}>
                  {totalWeight}
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-6">
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label>Critical Threshold (≥)</Label>
                <Input
                  type="number"
                  value={localConfig.critical_threshold || 80}
                  onChange={(e) => handleWeightChange('critical_threshold', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">
                  Scores at or above this value are marked as Critical priority
                </p>
              </div>

              <div className="space-y-2">
                <Label>High Threshold (≥)</Label>
                <Input
                  type="number"
                  value={localConfig.high_threshold || 60}
                  onChange={(e) => handleWeightChange('high_threshold', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">
                  Scores at or above this value (below Critical) are marked as High priority
                </p>
              </div>

              <div className="space-y-2">
                <Label>Medium Threshold (≥)</Label>
                <Input
                  type="number"
                  value={localConfig.medium_threshold || 40}
                  onChange={(e) => handleWeightChange('medium_threshold', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">
                  Scores at or above this value (below High) are marked as Medium priority
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Priority Bands Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>
                    <span>≥ {localConfig.critical_threshold || 80}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500 text-white">High</Badge>
                    <span>{localConfig.high_threshold || 60} - {(localConfig.critical_threshold || 80) - 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500 text-black">Medium</Badge>
                    <span>{localConfig.medium_threshold || 40} - {(localConfig.high_threshold || 60) - 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Low</Badge>
                    <span>0 - {(localConfig.medium_threshold || 40) - 1}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateConfig.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {updateConfig.isPending ? 'Saving...' : isSimulation ? 'Save as Simulation' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
