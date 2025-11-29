import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  Target, 
  Shield, 
  Plane,
  Settings2,
} from 'lucide-react';
import type { ScenarioLevers } from '@/hooks/useScenarios';

interface ScenarioControlsPanelProps {
  levers: ScenarioLevers;
  onLeversChange: (levers: ScenarioLevers) => void;
  disabled?: boolean;
  baselineCost: number;
}

const priorityBands = ['critical', 'high', 'medium', 'low'];

export function ScenarioControlsPanel({ 
  levers, 
  onLeversChange, 
  disabled,
  baselineCost,
}: ScenarioControlsPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculatedBudget = levers.globalBudgetType === 'percentage'
    ? baselineCost * ((levers.globalBudgetValue || 100) / 100)
    : levers.globalBudgetValue || baselineCost;

  return (
    <div className="space-y-4">
      {/* Budget Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Budget Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Budget Type</Label>
            <Select 
              value={levers.globalBudgetType || 'percentage'} 
              onValueChange={(v) => onLeversChange({ 
                ...levers, 
                globalBudgetType: v as 'percentage' | 'absolute' 
              })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">% of Baseline</SelectItem>
                <SelectItem value="absolute">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {levers.globalBudgetType === 'percentage' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Budget Percentage</Label>
                <Badge variant="outline" className="font-mono">
                  {levers.globalBudgetValue || 100}%
                </Badge>
              </div>
              <Slider
                value={[levers.globalBudgetValue || 100]}
                onValueChange={([v]) => onLeversChange({ ...levers, globalBudgetValue: v })}
                min={0}
                max={150}
                step={5}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Target: {formatCurrency(calculatedBudget)}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Fixed Budget Amount</Label>
              <Input
                type="number"
                value={levers.globalBudgetValue || ''}
                onChange={(e) => onLeversChange({ 
                  ...levers, 
                  globalBudgetValue: parseFloat(e.target.value) || 0 
                })}
                disabled={disabled}
                placeholder="Enter budget amount"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Priority Rules
          </CardTitle>
          <CardDescription className="text-xs">
            Select which priority bands to include
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {priorityBands.map((band) => (
            <div key={band} className="flex items-center space-x-2">
              <Checkbox
                id={`band-${band}`}
                checked={levers.includePriorityBands?.includes(band) ?? true}
                onCheckedChange={(checked) => {
                  const current = levers.includePriorityBands || priorityBands;
                  const updated = checked
                    ? [...current, band]
                    : current.filter(b => b !== band);
                  onLeversChange({ ...levers, includePriorityBands: updated });
                }}
                disabled={disabled}
              />
              <Label htmlFor={`band-${band}`} className="text-sm capitalize">
                {band}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cut Order */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Cut Order
          </CardTitle>
          <CardDescription className="text-xs">
            Order in which items are cut when over budget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select
            value={(levers.cutOrder || ['low', 'medium', 'high', 'critical']).join(',')}
            onValueChange={(v) => onLeversChange({ 
              ...levers, 
              cutOrder: v.split(',') 
            })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low,medium,high,critical">
                Low → Medium → High → Critical
              </SelectItem>
              <SelectItem value="low,medium,critical,high">
                Low → Medium → Critical → High
              </SelectItem>
              <SelectItem value="medium,low,high,critical">
                Medium → Low → High → Critical
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Category Protection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Protections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Cut Abroad First</Label>
              <p className="text-xs text-muted-foreground">
                Prioritize cutting international trainings
              </p>
            </div>
            <Switch
              checked={levers.cutAbroadFirst || false}
              onCheckedChange={(checked) => onLeversChange({ 
                ...levers, 
                cutAbroadFirst: checked 
              })}
              disabled={disabled}
            />
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground">
              HSE mandatory trainings are automatically protected
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
