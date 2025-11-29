import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useCreateBondEvent, ServiceBond, calculateRepayment } from '@/hooks/useBonds';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const WAIVER_REASONS = [
  { value: 'restructuring', label: 'Organizational Restructuring' },
  { value: 'medical', label: 'Medical Reasons' },
  { value: 'non_fault_termination', label: 'Non-Fault Termination' },
  { value: 'mutual_agreement', label: 'Mutual Agreement' },
  { value: 'exceptional_circumstances', label: 'Exceptional Circumstances' },
  { value: 'other', label: 'Other' },
];

const formSchema = z.object({
  waiverType: z.enum(['full', 'partial'], { required_error: 'Waiver type is required' }),
  reason: z.string().min(1, 'Reason is required'),
  waiverAmount: z.number().optional(),
  waiverTimeMonths: z.number().optional(),
  justification: z.string().min(20, 'Please provide detailed justification (at least 20 characters)'),
});

interface WaiverRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bondId: string;
  bond: ServiceBond;
}

export function WaiverRequestDialog({ open, onOpenChange, bondId, bond }: WaiverRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createEvent = useCreateBondEvent();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      waiverType: undefined,
      reason: '',
      waiverAmount: undefined,
      waiverTimeMonths: undefined,
      justification: '',
    },
  });

  const waiverType = form.watch('waiverType');

  // Calculate potential repayment if breaking bond
  const timeServed = bond.time_served_months || 0;
  const potentialRepayment = bond.funded_amount 
    ? calculateRepayment(
        Number(bond.funded_amount),
        bond.bond_duration_months,
        timeServed
      )
    : 0;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await createEvent.mutateAsync({
        bond_id: bondId,
        event_type: 'waiver_request',
        event_date: new Date().toISOString().split('T')[0],
        reason: values.reason,
        description: values.justification,
        waiver_type: values.waiverType,
        waiver_amount: values.waiverType === 'partial' ? values.waiverAmount : potentialRepayment,
        waiver_time_months: values.waiverTimeMonths,
        approval_status: 'pending',
      });
      onOpenChange(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Request Bond Waiver</DialogTitle>
          <DialogDescription>
            Submit a waiver request to partially or fully waive the remaining bond obligation.
            This will require approval from authorized personnel.
          </DialogDescription>
        </DialogHeader>

        {bond.funded_amount && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Based on current progress ({timeServed} of {bond.bond_duration_months} months), 
              potential repayment would be approximately <strong>{potentialRepayment.toLocaleString()} {bond.currency}</strong>.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="waiverType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waiver Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select waiver type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="full">Full Waiver (no repayment required)</SelectItem>
                      <SelectItem value="partial">Partial Waiver (reduced repayment)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WAIVER_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {waiverType === 'partial' && (
              <>
                <FormField
                  control={form.control}
                  name="waiverAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposed Repayment Amount ({bond.currency})</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter reduced amount"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Original calculated: {potentialRepayment.toLocaleString()} {bond.currency}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="waiverTimeMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time to Waive (months)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Optional: months to waive"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide detailed justification for this waiver request..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be reviewed by approvers. Include all relevant context.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
