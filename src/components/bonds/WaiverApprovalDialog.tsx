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
import { AlertTriangle, CheckCircle, XCircle, DollarSign, Clock } from 'lucide-react';
import { useProcessWaiverApproval, BondEvent } from '@/hooks/useBonds';
import { format } from 'date-fns';

interface WaiverApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: BondEvent | null;
  bondId: string;
  employeeName?: string;
  programName?: string;
}

const WAIVER_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  full: { label: 'Full Waiver', color: 'bg-purple-100 text-purple-800' },
  partial_amount: { label: 'Partial Amount', color: 'bg-orange-100 text-orange-800' },
  partial_time: { label: 'Partial Time', color: 'bg-blue-100 text-blue-800' },
};

export function WaiverApprovalDialog({ 
  open, 
  onOpenChange, 
  event, 
  bondId,
  employeeName,
  programName 
}: WaiverApprovalDialogProps) {
  const [comments, setComments] = useState('');
  const processWaiver = useProcessWaiverApproval();

  if (!event) return null;

  const waiverConfig = WAIVER_TYPE_CONFIG[event.waiver_type || ''] || WAIVER_TYPE_CONFIG.full;

  const handleApprove = async () => {
    await processWaiver.mutateAsync({
      eventId: event.id,
      bondId,
      decision: 'approved',
      comments,
    });
    onOpenChange(false);
    setComments('');
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      return;
    }
    await processWaiver.mutateAsync({
      eventId: event.id,
      bondId,
      decision: 'rejected',
      comments,
    });
    onOpenChange(false);
    setComments('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Review Waiver Request
          </DialogTitle>
          <DialogDescription>
            Review and approve or reject this bond waiver request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee & Program Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Employee</span>
              <span className="font-medium">{employeeName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Program</span>
              <span className="font-medium">{programName || 'N/A'}</span>
            </div>
          </div>

          {/* Waiver Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Waiver Type</span>
              <Badge className={waiverConfig.color}>{waiverConfig.label}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Request Date</span>
              <span className="font-medium">
                {format(new Date(event.event_date), 'dd MMM yyyy')}
              </span>
            </div>

            {event.waiver_amount && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Waiver Amount
                </span>
                <span className="font-medium">{event.waiver_amount.toLocaleString()} LYD</span>
              </div>
            )}

            {event.waiver_time_months && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Time Waived
                </span>
                <span className="font-medium">{event.waiver_time_months} months</span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <Label className="text-sm text-muted-foreground">Reason for Request</Label>
            <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{event.reason || 'No reason provided'}</p>
          </div>

          {event.description && (
            <div>
              <Label className="text-sm text-muted-foreground">Justification</Label>
              <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{event.description}</p>
            </div>
          )}

          {/* Comments */}
          <div>
            <Label htmlFor="comments">Decision Comments *</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter your comments (required for rejection)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={processWaiver.isPending || !comments.trim()}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={processWaiver.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
