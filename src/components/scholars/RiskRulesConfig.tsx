import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertTriangle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RiskRule {
  id: string;
  rule_name: string;
  condition_type: string;
  condition_value: {
    threshold?: number;
    consecutive_terms?: number;
    module_count?: number;
  };
  risk_level: string;
  is_active: boolean;
  created_at: string;
}

const CONDITION_TYPES = [
  { value: 'gpa_below', label: 'GPA Below Threshold' },
  { value: 'failed_modules', label: 'Failed Modules Count' },
  { value: 'delayed_completion', label: 'Delayed Beyond Expected' },
  { value: 'consecutive_low_gpa', label: 'Consecutive Low GPA Terms' },
  { value: 'credits_behind', label: 'Credits Behind Schedule' },
];

const RISK_LEVELS = [
  { value: 'watch', label: 'Watch', color: 'bg-amber-100 text-amber-700' },
  { value: 'at_risk', label: 'At Risk', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export function RiskRulesConfig() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    condition_type: '',
    threshold: '',
    consecutiveTerms: '',
    risk_level: '',
    is_active: true,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['risk-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_risk_rules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RiskRule[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<RiskRule>) => {
      const { error } = await supabase
        .from('academic_risk_rules')
        .insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-rules'] });
      toast.success('Risk rule created');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create rule: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RiskRule> & { id: string }) => {
      const { error } = await supabase
        .from('academic_risk_rules')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-rules'] });
      toast.success('Risk rule updated');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update rule: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('academic_risk_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-rules'] });
      toast.success('Risk rule deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete rule: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('academic_risk_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-rules'] });
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      condition_type: '',
      threshold: '',
      consecutiveTerms: '',
      risk_level: '',
      is_active: true,
    });
    setEditingRule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (rule: RiskRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      condition_type: rule.condition_type,
      threshold: rule.condition_value?.threshold?.toString() || '',
      consecutiveTerms: rule.condition_value?.consecutive_terms?.toString() || '',
      risk_level: rule.risk_level,
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.rule_name || !formData.condition_type || !formData.risk_level) {
      toast.error('Please fill in all required fields');
      return;
    }

    const conditionValue: any = {};
    if (formData.threshold) {
      conditionValue.threshold = parseFloat(formData.threshold);
    }
    if (formData.consecutiveTerms) {
      conditionValue.consecutive_terms = parseInt(formData.consecutiveTerms);
    }

    const data = {
      rule_name: formData.rule_name,
      condition_type: formData.condition_type,
      condition_value: conditionValue,
      risk_level: formData.risk_level,
      is_active: formData.is_active,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getConditionDescription = (rule: RiskRule) => {
    const cv = rule.condition_value;
    switch (rule.condition_type) {
      case 'gpa_below':
        return `GPA below ${cv?.threshold || 0}`;
      case 'failed_modules':
        return `${cv?.threshold || 0}+ failed modules`;
      case 'delayed_completion':
        return `${cv?.threshold || 0}+ months delayed`;
      case 'consecutive_low_gpa':
        return `${cv?.consecutive_terms || 0} consecutive low GPA terms`;
      case 'credits_behind':
        return `${cv?.threshold || 0}+ credits behind`;
      default:
        return rule.condition_type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Risk Assessment Rules
            </CardTitle>
            <CardDescription>
              Configure automatic risk flagging based on academic performance
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : rules && rules.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => {
                const riskLevel = RISK_LEVELS.find(r => r.value === rule.risk_level);
                return (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell>{getConditionDescription(rule)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskLevel?.color || ''}`}>
                        {riskLevel?.label || rule.risk_level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: rule.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteMutation.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No risk rules configured</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Rule
            </Button>
          </div>
        )}

        {/* Rule Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Risk Rule' : 'Create Risk Rule'}</DialogTitle>
              <DialogDescription>
                Define conditions that will automatically flag scholars at risk
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  placeholder="e.g., Low GPA Warning"
                />
              </div>

              <div>
                <Label>Condition Type *</Label>
                <Select 
                  value={formData.condition_type} 
                  onValueChange={(value) => setFormData({ ...formData, condition_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {['gpa_below', 'failed_modules', 'delayed_completion', 'credits_behind'].includes(formData.condition_type) && (
                <div>
                  <Label>Threshold Value *</Label>
                  <Input
                    type="number"
                    step={formData.condition_type === 'gpa_below' ? '0.1' : '1'}
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    placeholder={formData.condition_type === 'gpa_below' ? 'e.g., 2.0' : 'e.g., 3'}
                  />
                </div>
              )}

              {formData.condition_type === 'consecutive_low_gpa' && (
                <div>
                  <Label>Consecutive Terms *</Label>
                  <Input
                    type="number"
                    value={formData.consecutiveTerms}
                    onChange={(e) => setFormData({ ...formData, consecutiveTerms: e.target.value })}
                    placeholder="e.g., 2"
                  />
                </div>
              )}

              <div>
                <Label>Risk Level *</Label>
                <Select 
                  value={formData.risk_level} 
                  onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
