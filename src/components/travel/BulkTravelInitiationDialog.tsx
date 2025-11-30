import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';
import { useBulkInitiateTravelVisa } from '@/hooks/useTravelVisa';

interface BulkTravelInitiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  participantIds: string[];
  onComplete?: () => void;
}

export function BulkTravelInitiationDialog({
  open,
  onOpenChange,
  sessionId,
  participantIds,
  onComplete
}: BulkTravelInitiationDialogProps) {
  const [results, setResults] = useState<any>(null);

  const bulkMutation = useBulkInitiateTravelVisa();

  const handleInitiate = async () => {
    const result = await bulkMutation.mutateAsync({
      sessionId,
      participantIds
    });
    setResults(result);
  };

  const handleClose = () => {
    if (results) {
      onComplete?.();
    }
    setResults(null);
    onOpenChange(false);
  };

  const progress = results 
    ? ((results.summary?.succeeded || 0) / (results.summary?.total || 1)) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Travel Initiation
          </DialogTitle>
          <DialogDescription>
            {results 
              ? `Completed processing ${results.summary?.total || 0} participants`
              : `Initiate travel requests for ${participantIds.length} selected participants`
            }
          </DialogDescription>
        </DialogHeader>

        {!results && !bulkMutation.isPending && (
          <div className="py-4">
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm">
                This will create travel and visa requests in the corporate travel system 
                for all selected participants. This action cannot be undone.
              </p>
            </div>
          </div>
        )}

        {bulkMutation.isPending && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              Processing travel requests...
            </p>
            <Progress value={50} className="animate-pulse" />
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <Progress value={progress} />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{results.summary?.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{results.summary?.succeeded || 0}</div>
                <div className="text-sm text-muted-foreground">Succeeded</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{results.summary?.failed || 0}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {results.errors?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Errors:</p>
                <ScrollArea className="h-32 rounded-md border p-2">
                  {results.errors.map((err: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 py-1 text-sm">
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{err.error}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {results.summary?.succeeded > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm">
                  Successfully initiated {results.summary.succeeded} travel requests
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!results && !bulkMutation.isPending && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleInitiate}>
                Initiate Travel Requests
              </Button>
            </>
          )}
          {results && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}