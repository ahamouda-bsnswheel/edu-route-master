import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useLocalAdjustment, type ScenarioItem } from '@/hooks/useScenarios';

interface LocalAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ScenarioItem;
  scenarioId: string;
}

export function LocalAdjustmentDialog({ open, onOpenChange, item, scenarioId }: LocalAdjustmentDialogProps) {
  const [newVolume, setNewVolume] = useState(item.scenario_volume);
  const [reason, setReason] = useState(item.local_adjustment_reason || '');

  const adjustMutation = useLocalAdjustment();

  const newCost = newVolume * (item.baseline_cost_per_participant || 0);
  const volumeDelta = newVolume - item.baseline_volume;
  const costDelta = newCost - item.baseline_cost;
  const isIncrease = newVolume > item.scenario_volume;

  const handleSave = async () => {
    if (!reason.trim() && isIncrease) return;
    
    await adjustMutation.mutateAsync({
      scenarioId,
      itemId: item.id,
      newVolume,
      reason: reason.trim(),
    });
    
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Volume</DialogTitle>
          <DialogDescription>
            Make a local adjustment to this training item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium">{item.course_name}</div>
            <div className="text-sm text-muted-foreground">
              {item.category_name} • {item.entity_name || 'All entities'}
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Baseline: {item.baseline_volume}</Badge>
              <Badge variant="outline">Current: {item.scenario_volume}</Badge>
            </div>
          </div>

          {/* New Volume */}
          <div className="space-y-2">
            <Label htmlFor="volume">New Volume (Participants)</Label>
            <Input
              id="volume"
              type="number"
              value={newVolume}
              onChange={(e) => setNewVolume(parseInt(e.target.value) || 0)}
              min={0}
              max={item.baseline_volume * 2}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Delta: <span className={volumeDelta < 0 ? 'text-red-500' : volumeDelta > 0 ? 'text-green-500' : ''}>
                  {volumeDelta > 0 ? '+' : ''}{volumeDelta} from baseline
                </span>
              </span>
              <span>
                Cost: {formatCurrency(newCost)} ({costDelta < 0 ? '' : '+'}{formatCurrency(costDelta)})
              </span>
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Justification {isIncrease && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this adjustment is needed..."
              rows={3}
            />
          </div>

          {isIncrease && !reason.trim() && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Justification is required when increasing volume above the scenario result.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={adjustMutation.isPending || (isIncrease && !reason.trim())}
          >
            {adjustMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
