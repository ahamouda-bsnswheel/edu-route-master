import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateScenario } from '@/hooks/useScenarios';
import { Loader2 } from 'lucide-react';

interface CreateScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPlanId?: string;
}

export function CreateScenarioDialog({ open, onOpenChange, preselectedPlanId }: CreateScenarioDialogProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [planId, setPlanId] = useState(preselectedPlanId || '');
  const [visibilityScope, setVisibilityScope] = useState<'global' | 'entity' | 'restricted'>('global');

  const createMutation = useCreateScenario();

  // Fetch available plans
  const { data: plans } = useQuery({
    queryKey: ['training-plans-for-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_plans')
        .select('id, name, version, status')
        .in('status', ['draft', 'approved'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const selectedPlan = plans?.find(p => p.id === planId);

  const handleCreate = async () => {
    if (!planId || !name) return;

    const result = await createMutation.mutateAsync({
      planId,
      planVersion: selectedPlan?.version || 1,
      name,
      description,
      visibilityScope,
    });

    if (result?.scenario?.id) {
      onOpenChange(false);
      navigate(`/scenarios/${result.scenario.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Scenario</DialogTitle>
          <DialogDescription>
            Create a what-if scenario based on an existing training plan. Changes won't affect the original plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan">Basis Plan *</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan to base scenario on" />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} (v{plan.version}) - {plan.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Scenario Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Budget -20% Scenario"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this scenario..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={visibilityScope} onValueChange={(v) => setVisibilityScope(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (All authorized users)</SelectItem>
                <SelectItem value="entity">Entity-specific</SelectItem>
                <SelectItem value="restricted">Restricted (Owner only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!planId || !name || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Scenario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
