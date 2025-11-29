import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';

interface RiskOverrideDialogProps {
  currentBand: string;
  open: boolean;
  onClose: () => void;
  onOverride: (newBand: string, reason: string) => void;
  isLoading?: boolean;
}

const RISK_BANDS = [
  { value: 'on_track', label: 'On Track', description: 'Scholar is progressing well', icon: CheckCircle, color: 'text-green-600' },
  { value: 'watch', label: 'Watch', description: 'Minor concerns, monitoring required', icon: Clock, color: 'text-amber-600' },
  { value: 'at_risk', label: 'At Risk', description: 'Significant concerns, intervention needed', icon: AlertTriangle, color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', description: 'Severe risk of non-completion', icon: AlertTriangle, color: 'text-red-600' },
];

export function RiskOverrideDialog({ currentBand, open, onClose, onOverride, isLoading }: RiskOverrideDialogProps) {
  const [selectedBand, setSelectedBand] = useState(currentBand);
  const [reason, setReason] = useState('');

  const handleOverride = () => {
    if (!reason.trim()) return;
    onOverride(selectedBand, reason);
  };

  const isValid = selectedBand !== currentBand && reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Override Risk Status
          </DialogTitle>
          <DialogDescription>
            Manually set the risk level with a justification. This override will be logged for audit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Risk Band Selection */}
          <div>
            <Label>New Risk Level</Label>
            <RadioGroup value={selectedBand} onValueChange={setSelectedBand} className="mt-2 space-y-2">
              {RISK_BANDS.map((band) => {
                const Icon = band.icon;
                return (
                  <div
                    key={band.value}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBand === band.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    } ${band.value === currentBand ? 'opacity-50' : ''}`}
                    onClick={() => band.value !== currentBand && setSelectedBand(band.value)}
                  >
                    <RadioGroupItem value={band.value} id={band.value} disabled={band.value === currentBand} />
                    <Icon className={`h-4 w-4 ${band.color}`} />
                    <div className="flex-1">
                      <Label htmlFor={band.value} className="cursor-pointer font-medium">
                        {band.label}
                        {band.value === currentBand && (
                          <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">{band.description}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Justification */}
          <div>
            <Label htmlFor="reason">
              Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Provide a detailed reason for this override (minimum 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be recorded in the audit log
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleOverride} disabled={!isValid || isLoading}>
            {isLoading ? 'Saving...' : 'Apply Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
