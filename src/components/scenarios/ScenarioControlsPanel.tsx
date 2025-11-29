import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DollarSign, 
  Target, 
  Shield, 
  Plane,
  Settings2,
  Building2,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const [entityCapsOpen, setEntityCapsOpen] = useState(false);
  const [protectedCategoriesOpen, setProtectedCategoriesOpen] = useState(false);

  // Fetch entities for entity caps
  const { data: entities } = useQuery({
    queryKey: ['entities-for-scenario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('id, name_en')
        .eq('is_active', true)
        .order('name_en');
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for protection
  const { data: categories } = useQuery({
    queryKey: ['categories-for-scenario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_categories')
        .select('id, name_en')
        .eq('is_active', true)
        .order('name_en');
      if (error) throw error;
      return data;
    },
  });

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

  const addEntityCap = (entityId: string) => {
    const current = levers.entityCaps || {};
    if (!current[entityId]) {
      onLeversChange({
        ...levers,
        entityCaps: {
          ...current,
          [entityId]: { type: 'percentage', value: 100 },
        },
      });
    }
  };

  const updateEntityCap = (entityId: string, type: 'percentage' | 'absolute', value: number) => {
    const current = levers.entityCaps || {};
    onLeversChange({
      ...levers,
      entityCaps: {
        ...current,
        [entityId]: { type, value },
      },
    });
  };

  const removeEntityCap = (entityId: string) => {
    const current = { ...levers.entityCaps };
    delete current[entityId];
    onLeversChange({ ...levers, entityCaps: current });
  };

  const toggleProtectedCategory = (categoryId: string, checked: boolean) => {
    const current = levers.protectedCategories || [];
    const updated = checked
      ? [...current, categoryId]
      : current.filter(c => c !== categoryId);
    onLeversChange({ ...levers, protectedCategories: updated });
  };

  const entityCapsEntries = Object.entries(levers.entityCaps || {});
  const availableEntities = entities?.filter(e => !levers.entityCaps?.[e.id]) || [];

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

      {/* Entity-Specific Caps */}
      <Card>
        <Collapsible open={entityCapsOpen} onOpenChange={setEntityCapsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Entity-Specific Caps
                  {entityCapsEntries.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {entityCapsEntries.length}
                    </Badge>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${entityCapsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <CardDescription className="text-xs">
                Set budget limits per entity (e.g., "Entity A: -10%")
              </CardDescription>

              {entityCapsEntries.map(([entityId, cap]) => {
                const entity = entities?.find(e => e.id === entityId);
                const capData = cap as { type: 'percentage' | 'absolute'; value: number };
                return (
                  <div key={entityId} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{entity?.name_en || entityId}</p>
                    </div>
                    <Select
                      value={capData.type}
                      onValueChange={(v) => updateEntityCap(entityId, v as 'percentage' | 'absolute', capData.value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-20 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="absolute">$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={capData.value}
                      onChange={(e) => updateEntityCap(entityId, capData.type, parseFloat(e.target.value) || 0)}
                      className="w-20 h-7 text-xs"
                      disabled={disabled}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeEntityCap(entityId)}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}

              {availableEntities.length > 0 && (
                <Select
                  value=""
                  onValueChange={(entityId) => addEntityCap(entityId)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8">
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="text-xs">Add Entity Cap</span>
                  </SelectTrigger>
                  <SelectContent>
                    {availableEntities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
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
        <Collapsible open={protectedCategoriesOpen} onOpenChange={setProtectedCategoriesOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Protected Categories
                  {(levers.protectedCategories?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {levers.protectedCategories?.length}
                    </Badge>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${protectedCategoriesOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <CardDescription className="text-xs">
                Protected categories will not be cut regardless of budget constraints
              </CardDescription>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {categories?.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${category.id}`}
                      checked={levers.protectedCategories?.includes(category.id) ?? false}
                      onCheckedChange={(checked) => toggleProtectedCategory(category.id, !!checked)}
                      disabled={disabled}
                    />
                    <Label htmlFor={`cat-${category.id}`} className="text-sm">
                      {category.name_en}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Other Protections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Other Rules
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
        </CardContent>
      </Card>
    </div>
  );
}
