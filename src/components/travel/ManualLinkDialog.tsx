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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Link2 } from 'lucide-react';
import { useManualLinkTravel, useTravelVisaRequests } from '@/hooks/useTravelVisa';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingRequestId: string;
  employeeId: string;
  destinationCountry: string;
  destinationCity?: string;
  trainingStartDate: string;
  trainingEndDate: string;
}

export function ManualLinkDialog({
  open,
  onOpenChange,
  trainingRequestId,
  employeeId,
  destinationCountry,
  destinationCity,
  trainingStartDate,
  trainingEndDate
}: ManualLinkDialogProps) {
  const [travelRequestId, setTravelRequestId] = useState('');
  const [visaRequestId, setVisaRequestId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const manualLinkMutation = useManualLinkTravel();

  const { data: existingRequests } = useTravelVisaRequests({ trainingRequestId });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!travelRequestId && !visaRequestId) {
      toast({
        title: 'Error',
        description: 'Please enter at least one request ID',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      // Check if we have an existing record to link to
      let recordId = existingRequests?.[0]?.id;

      if (!recordId) {
        // Create a new travel_visa_request record first
        const { data: newRecord, error } = await supabase
          .from('travel_visa_requests')
          .insert({
            training_request_id: trainingRequestId,
            employee_id: employeeId,
            destination_country: destinationCountry,
            destination_city: destinationCity,
            travel_start_date: trainingStartDate,
            travel_end_date: trainingEndDate,
            training_start_date: trainingStartDate,
            training_end_date: trainingEndDate,
            travel_status: 'not_initiated',
            visa_status: 'not_required',
            initiation_method: 'external'
          })
          .select()
          .single();

        if (error) throw error;
        recordId = newRecord.id;
      }

      // Now link the external IDs
      await manualLinkMutation.mutateAsync({
        travelVisaRequestId: recordId,
        travelRequestId: travelRequestId || undefined,
        visaRequestId: visaRequestId || undefined
      });

      onOpenChange(false);
      setTravelRequestId('');
      setVisaRequestId('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link travel request',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link External Travel/Visa Request
          </DialogTitle>
          <DialogDescription>
            If you've already created a travel or visa request in the corporate system, 
            enter the request IDs below to link them to this training.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="travelRequestId">Travel Request ID</Label>
            <Input
              id="travelRequestId"
              value={travelRequestId}
              onChange={(e) => setTravelRequestId(e.target.value)}
              placeholder="e.g., TR-2024-001234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visaRequestId">Visa Request ID (Optional)</Label>
            <Input
              id="visaRequestId"
              value={visaRequestId}
              onChange={(e) => setVisaRequestId(e.target.value)}
              placeholder="e.g., VR-2024-001234"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || manualLinkMutation.isPending}>
              {(isCreating || manualLinkMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Link Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}