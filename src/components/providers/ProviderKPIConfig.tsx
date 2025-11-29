import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, Save, TrendingUp, TrendingDown } from 'lucide-react';

interface KPIThreshold {
  id: string;
  kpi_name: string;
  display_name: string;
  description: string | null;
  good_threshold: number | null;
  warning_threshold: number | null;
  comparison_operator: string;
  is_active: boolean;
}

export function ProviderKPIConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingKPI, setEditingKPI] = useState<KPIThreshold | null>(null);
  const [editForm, setEditForm] = useState({
    good_threshold: 0,
    warning_threshold: 0,
    comparison_operator: 'gte',
    is_active: true,
  });

  // Fetch KPI thresholds
  const { data: thresholds, isLoading } = useQuery({
    queryKey: ['provider-kpi-thresholds-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_kpi_thresholds')
        .select('*')
        .order('kpi_name');
      if (error) throw error;
      return data as KPIThreshold[];
    },
  });

  // Update threshold mutation
  const updateThresholdMutation = useMutation({
    mutationFn: async () => {
      if (!editingKPI) return;

      const oldValues = {
        good_threshold: editingKPI.good_threshold,
        warning_threshold: editingKPI.warning_threshold,
        comparison_operator: editingKPI.comparison_operator,
        is_active: editingKPI.is_active,
      };

      const { error } = await supabase
        .from('provider_kpi_thresholds')
        .update({
          good_threshold: editForm.good_threshold,
          warning_threshold: editForm.warning_threshold,
          comparison_operator: editForm.comparison_operator,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', editingKPI.id);

      if (error) throw error;

      // Log the change
      await supabase.from('provider_performance_audit_log').insert({
        action: 'threshold_updated',
        entity_type: 'threshold',
        entity_id: editingKPI.id,
        old_value: oldValues,
        new_value: editForm,
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-kpi-thresholds-all'] });
      queryClient.invalidateQueries({ queryKey: ['provider-kpi-thresholds'] });
      setEditingKPI(null);
      toast.success('KPI threshold updated');
    },
    onError: () => toast.error('Failed to update threshold'),
  });

  const openEditDialog = (kpi: KPIThreshold) => {
    setEditingKPI(kpi);
    setEditForm({
      good_threshold: kpi.good_threshold || 0,
      warning_threshold: kpi.warning_threshold || 0,
      comparison_operator: kpi.comparison_operator || 'gte',
      is_active: kpi.is_active,
    });
  };

  const getComparisonLabel = (operator: string) => {
    return operator === 'gte' ? 'Higher is better' : 'Lower is better';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            KPI Threshold Configuration
          </CardTitle>
          <CardDescription>
            Configure performance thresholds that determine good/warning/bad status colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right text-green-600">Good</TableHead>
                  <TableHead className="text-right text-yellow-600">Warning</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thresholds?.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell>
                      <p className="font-medium">{kpi.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{kpi.kpi_name}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">
                      {kpi.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {kpi.comparison_operator === 'gte' ? (
                          <><TrendingUp className="h-3 w-3" /> Higher</>
                        ) : (
                          <><TrendingDown className="h-3 w-3" /> Lower</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {kpi.comparison_operator === 'gte' ? '≥' : '≤'} {kpi.good_threshold}
                    </TableCell>
                    <TableCell className="text-right font-medium text-yellow-600">
                      {kpi.comparison_operator === 'gte' ? '≥' : '≤'} {kpi.warning_threshold}
                    </TableCell>
                    <TableCell>
                      <Badge variant={kpi.is_active ? 'default' : 'secondary'}>
                        {kpi.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(kpi)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingKPI} onOpenChange={(open) => !open && setEditingKPI(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit KPI Threshold: {editingKPI?.display_name}</DialogTitle>
            <DialogDescription>
              Configure the thresholds for this performance indicator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Comparison Direction</Label>
              <Select 
                value={editForm.comparison_operator} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, comparison_operator: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gte">Higher is better (≥)</SelectItem>
                  <SelectItem value="lte">Lower is better (≤)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editForm.comparison_operator === 'gte' 
                  ? 'Values above good threshold are green, below warning are red'
                  : 'Values below good threshold are green, above warning are red'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-green-600">Good Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editForm.good_threshold}
                  onChange={(e) => setEditForm(prev => ({ 
                    ...prev, 
                    good_threshold: parseFloat(e.target.value) 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  {editForm.comparison_operator === 'gte' ? 'Minimum for green' : 'Maximum for green'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-yellow-600">Warning Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editForm.warning_threshold}
                  onChange={(e) => setEditForm(prev => ({ 
                    ...prev, 
                    warning_threshold: parseFloat(e.target.value) 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  {editForm.comparison_operator === 'gte' ? 'Minimum for yellow' : 'Maximum for yellow'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Enable this KPI</Label>
              <Switch
                id="is_active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                  {editForm.comparison_operator === 'gte' 
                    ? `≥ ${editForm.good_threshold}` 
                    : `≤ ${editForm.good_threshold}`}
                </span>
                <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  {editForm.comparison_operator === 'gte' 
                    ? `${editForm.warning_threshold} - ${editForm.good_threshold}` 
                    : `${editForm.good_threshold} - ${editForm.warning_threshold}`}
                </span>
                <span className="px-2 py-1 rounded bg-red-100 text-red-800">
                  {editForm.comparison_operator === 'gte' 
                    ? `< ${editForm.warning_threshold}` 
                    : `> ${editForm.warning_threshold}`}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKPI(null)}>Cancel</Button>
            <Button onClick={() => updateThresholdMutation.mutate()} disabled={updateThresholdMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}