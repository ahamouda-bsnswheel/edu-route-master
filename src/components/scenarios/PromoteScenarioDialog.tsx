import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { usePromoteScenario } from '@/hooks/useScenarios';

interface PromoteScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
  scenarioName: string;
}

export function PromoteScenarioDialog({ open, onOpenChange, scenarioId, scenarioName }: PromoteScenarioDialogProps) {
  const navigate = useNavigate();
  const [newPlanName, setNewPlanName] = useState(`${scenarioName} - Promoted`);
  const [newPlanDescription, setNewPlanDescription] = useState('');

  const promoteMutation = usePromoteScenario();

  const handlePromote = async () => {
    if (!newPlanName.trim()) return;

    const result = await promoteMutation.mutateAsync({
      scenarioId,
      newPlanName: newPlanName.trim(),
      newPlanDescription: newPlanDescription.trim() || undefined,
    });

    if (result?.newPlanId) {
      onOpenChange(false);
      navigate('/scenarios');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Promote Scenario to Plan</DialogTitle>
          <DialogDescription>
            Create a new plan version based on this scenario's adjusted values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will create a new plan version. The original baseline plan will not be modified.
              The scenario will be marked as "Adopted" and locked from further edits.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="plan-name">New Plan Name *</Label>
            <Input
              id="plan-name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="e.g., Training Plan 2026 - Reduced Budget v2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Description (Optional)</Label>
            <Textarea
              id="plan-description"
              value={newPlanDescription}
              onChange={(e) => setNewPlanDescription(e.target.value)}
              placeholder="Describe what changes this plan represents..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePromote}
            disabled={!newPlanName.trim() || promoteMutation.isPending}
          >
            {promoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Promote to Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
