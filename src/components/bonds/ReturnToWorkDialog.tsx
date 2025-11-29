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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useConfirmReturnToWork } from '@/hooks/useBonds';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  actualReturnDate: z.string().min(1, 'Return date is required'),
  returnEntityId: z.string().optional(),
  returnDepartmentId: z.string().optional(),
  returnPosition: z.string().optional(),
});

interface ReturnToWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bondId: string;
}

export function ReturnToWorkDialog({ open, onOpenChange, bondId }: ReturnToWorkDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmReturn = useConfirmReturnToWork();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actualReturnDate: new Date().toISOString().split('T')[0],
      returnEntityId: '',
      returnDepartmentId: '',
      returnPosition: '',
    },
  });

  // Fetch entities
  const { data: entities } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('entities')
        .select('id, name_en')
        .eq('is_active', true)
        .order('name_en');
      return data || [];
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('departments')
        .select('id, name_en')
        .eq('is_active', true)
        .order('name_en');
      return data || [];
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await confirmReturn.mutateAsync({
        bondId,
        actualReturnDate: values.actualReturnDate,
        returnEntityId: values.returnEntityId || undefined,
        returnDepartmentId: values.returnDepartmentId || undefined,
        returnPosition: values.returnPosition || undefined,
      });
      onOpenChange(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Return to Work</DialogTitle>
          <DialogDescription>
            Record the employee's return date and post-return assignment. This will start the bond period.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actualReturnDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Return Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="returnEntityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return Entity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entities?.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="returnDepartmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="returnPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position on Return</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Confirming...' : 'Confirm Return'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
