import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, AlertTriangle, Settings } from 'lucide-react';

interface AnomalyRule {
  id: string;
  rule_name: string;
  rule_type: string;
  comparison_type: string;
  threshold_value: number;
  applies_to: string | null;
  severity: string;
  is_active: boolean | null;
  created_at: string | null;
  created_by: string | null;
}

const RULE_TYPES = [
  { value: 'cost_per_participant', label: 'Cost per Participant' },
  { value: 'per_diem_variance', label: 'Per Diem Variance' },
  { value: 'travel_cost_ratio', label: 'Travel Cost Ratio' },
  { value: 'provider_cost_spike', label: 'Provider Cost Spike' },
  { value: 'destination_cost_outlier', label: 'Destination Cost Outlier' },
];

const APPLIES_TO = [
  { value: 'session', label: 'Session' },
  { value: 'provider', label: 'Provider' },
  { value: 'destination', label: 'Destination' },
  { value: 'employee', label: 'Employee' },
  { value: 'entity', label: 'Business Unit' },
  { value: 'all', label: 'All' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
];

const COMPARISON_TYPES = [
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'greater_than_or_equal', label: '>=' },
  { value: 'equals', label: '=' },
  { value: 'times_median', label: '× Median' },
  { value: 'percentage', label: '%' },
];

export function AnomalyRulesConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AnomalyRule> | null>(null);

  // Fetch rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['cost-anomaly-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_anomaly_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AnomalyRule[];
    },
  });

  // Save rule mutation
  const saveRule = useMutation({
    mutationFn: async (rule: Partial<AnomalyRule>) => {
      const ruleData = {
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        comparison_type: rule.comparison_type,
        threshold_value: rule.threshold_value,
        applies_to: rule.applies_to,
        severity: rule.severity,
        is_active: rule.is_active,
      };

      if (rule.id) {
        const { data, error } = await supabase
          .from('cost_anomaly_rules')
          .update(ruleData)
          .eq('id', rule.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('cost_anomaly_rules')
          .insert(ruleData)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-anomaly-rules'] });
      toast({ title: 'Rule saved successfully' });
      setDialogOpen(false);
      setEditingRule(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving rule', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle rule status
  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('cost_anomaly_rules')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-anomaly-rules'] });
    },
  });

  // Delete rule
  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_anomaly_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-anomaly-rules'] });
      toast({ title: 'Rule deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting rule', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    setEditingRule({
      rule_name: '',
      rule_type: 'cost_per_participant',
      comparison_type: 'greater_than',
      threshold_value: 0,
      applies_to: 'all',
      severity: 'medium',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (rule: AnomalyRule) => {
    setEditingRule({ ...rule });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingRule?.rule_name || editingRule?.threshold_value === undefined) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    saveRule.mutate(editingRule);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cost Anomaly Detection Rules
              </CardTitle>
              <CardDescription>
                Configure rules to automatically detect unusual cost patterns
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (rules || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No anomaly detection rules configured</p>
              <p className="text-sm mt-1">Create rules to automatically flag unusual costs</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules || []).map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell>
                      {RULE_TYPES.find(t => t.value === rule.rule_type)?.label || rule.rule_type}
                    </TableCell>
                    <TableCell>
                      {COMPARISON_TYPES.find(o => o.value === rule.comparison_type)?.label} {rule.threshold_value}
                    </TableCell>
                    <TableCell className="capitalize">{rule.applies_to || 'All'}</TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_LEVELS.find(s => s.value === rule.severity)?.color}>
                        {rule.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active === true}
                        onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, isActive: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rule Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule?.id ? 'Edit Rule' : 'New Anomaly Rule'}</DialogTitle>
            <DialogDescription>
              Configure when to flag costs as anomalies
            </DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rule Name *</Label>
                <Input
                  value={editingRule.rule_name || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                  placeholder="e.g., High cost per participant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select
                    value={editingRule.rule_type || 'cost_per_participant'}
                    onValueChange={(v) => setEditingRule({ ...editingRule, rule_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <Select
                    value={editingRule.applies_to || 'all'}
                    onValueChange={(v) => setEditingRule({ ...editingRule, applies_to: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLIES_TO.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Comparison Type</Label>
                  <Select
                    value={editingRule.comparison_type || 'greater_than'}
                    onValueChange={(v) => setEditingRule({ ...editingRule, comparison_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPARISON_TYPES.map((op) => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Threshold Value *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingRule.threshold_value || 0}
                    onChange={(e) => setEditingRule({ ...editingRule, threshold_value: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={editingRule.severity || 'medium'}
                  onValueChange={(v) => setEditingRule({ ...editingRule, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingRule.is_active !== false}
                  onCheckedChange={(checked) => setEditingRule({ ...editingRule, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveRule.isPending}>
              {saveRule.isPending ? 'Saving...' : 'Save Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
