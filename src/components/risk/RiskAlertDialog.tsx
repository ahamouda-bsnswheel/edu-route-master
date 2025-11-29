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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RiskAlertDialogProps {
  alert: any;
  open: boolean;
  onClose: () => void;
  onUpdate: (status: string, notes?: string) => void;
}

const RISK_BAND_CONFIG = {
  on_track: { label: 'On Track', color: 'bg-green-500', textColor: 'text-green-700', icon: CheckCircle },
  watch: { label: 'Watch', color: 'bg-amber-500', textColor: 'text-amber-700', icon: Clock },
  at_risk: { label: 'At Risk', color: 'bg-orange-500', textColor: 'text-orange-700', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-700', icon: AlertTriangle },
};

export function RiskAlertDialog({ alert, open, onClose, onUpdate }: RiskAlertDialogProps) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  
  const scholar = alert?.scholar_record;
  const employee = scholar?.employee;
  const prevConfig = alert?.previous_band ? RISK_BAND_CONFIG[alert.previous_band as keyof typeof RISK_BAND_CONFIG] : null;
  const newConfig = RISK_BAND_CONFIG[alert?.new_band as keyof typeof RISK_BAND_CONFIG];

  const handleAction = (status: string) => {
    onUpdate(status, notes || undefined);
  };

  const handleViewScholar = () => {
    onClose();
    navigate(`/scholars/${scholar?.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${newConfig?.textColor}`} />
            Risk Escalation Alert
          </DialogTitle>
          <DialogDescription>
            Review and take action on this risk alert
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scholar Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-lg">
                  {employee?.first_name_en} {employee?.last_name_en}
                </p>
                <p className="text-sm text-muted-foreground">
                  {employee?.employee_id}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleViewScholar}>
                View Record
              </Button>
            </div>
            <p className="text-sm">
              {scholar?.program_name} at {scholar?.institution}
            </p>
            <p className="text-sm text-muted-foreground">{scholar?.country}</p>
          </div>

          {/* Risk Change */}
          <div>
            <Label className="text-sm text-muted-foreground">Risk Level Change</Label>
            <div className="flex items-center gap-3 mt-1">
              {prevConfig ? (
                <>
                  <Badge variant="outline" className={prevConfig.textColor}>
                    {prevConfig.label}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">New risk detected:</span>
              )}
              <Badge className={`${newConfig?.color} text-white`}>
                {newConfig?.label}
              </Badge>
            </div>
          </div>

          {/* Alert Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Alert Type</Label>
              <p className="capitalize">{alert?.alert_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p>{format(new Date(alert?.created_at), 'MMM d, yyyy HH:mm')}</p>
            </div>
          </div>

          {/* Review Notes */}
          <div>
            <Label htmlFor="notes">Review Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about your review and any planned actions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleAction('dismissed')}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Dismiss
          </Button>
          <Button 
            variant="default"
            onClick={() => handleAction('action_planned')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Action Planned
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
