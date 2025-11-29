import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServiceBond {
  id: string;
  scholar_record_id: string;
  application_id: string | null;
  policy_id: string | null;
  bond_type: string;
  bond_duration_months: number;
  funded_amount: number | null;
  currency: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  bond_start_date: string | null;
  bond_end_date: string | null;
  return_entity_id: string | null;
  return_department_id: string | null;
  return_position: string | null;
  return_manager_id: string | null;
  status: string;
  time_served_months: number | null;
  time_suspended_months: number | null;
  repayment_required: boolean | null;
  calculated_repayment_amount: number | null;
  final_repayment_amount: number | null;
  repayment_status: string | null;
  legal_agreement_reference: string | null;
  legal_agreement_url: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  fulfilled_at: string | null;
  closed_at: string | null;
  is_historical_import: boolean | null;
  scholar_record?: {
    id: string;
    employee_id: string;
    program_name: string;
    institution: string;
    country: string;
    degree_level: string;
    expected_end_date: string | null;
    actual_end_date: string | null;
    status: string | null;
  };
  employee?: {
    id: string;
    first_name_en: string | null;
    last_name_en: string | null;
    email: string | null;
    employee_id: string | null;
  };
  return_entity?: { name_en: string } | null;
  return_department?: { name_en: string } | null;
}

export interface BondPolicy {
  id: string;
  policy_name: string;
  program_type: string;
  training_location: string | null;
  min_funding_amount: number | null;
  max_funding_amount: number | null;
  bond_type: string;
  bond_duration_months: number;
  repayment_formula: string | null;
  repayment_percentage: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface BondEvent {
  id: string;
  bond_id: string;
  event_type: string;
  event_date: string;
  end_date: string | null;
  reason: string | null;
  description: string | null;
  waiver_type: string | null;
  waiver_amount: number | null;
  waiver_time_months: number | null;
  approval_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_chain: unknown;
  document_url: string | null;
  days_affected: number | null;
  created_at: string | null;
  created_by: string | null;
}

export interface BondRepayment {
  id: string;
  bond_id: string;
  amount: number;
  currency: string | null;
  payment_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
}

// Fetch all bonds with filters
export function useBonds(filters?: {
  status?: string;
  entityId?: string;
  programType?: string;
}) {
  return useQuery({
    queryKey: ['bonds', filters],
    queryFn: async () => {
      let query = supabase
        .from('service_bonds')
        .select(`
          *,
          scholar_record:scholar_records(
            id,
            employee_id,
            program_name,
            institution,
            country,
            degree_level,
            expected_end_date,
            actual_end_date,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch employee profiles separately
      const scholarRecordIds = data?.map(b => b.scholar_record?.employee_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, email, employee_id, entity_id')
        .in('id', scholarRecordIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map(bond => ({
        ...bond,
        employee: bond.scholar_record ? profileMap.get(bond.scholar_record.employee_id) : null
      })) as ServiceBond[];
    },
  });
}

// Fetch single bond
export function useBond(bondId: string | null) {
  return useQuery({
    queryKey: ['bond', bondId],
    queryFn: async () => {
      if (!bondId) return null;

      const { data, error } = await supabase
        .from('service_bonds')
        .select(`
          *,
          scholar_record:scholar_records(
            id,
            employee_id,
            program_name,
            institution,
            country,
            degree_level,
            expected_end_date,
            actual_end_date,
            status
          ),
          return_entity:entities(name_en),
          return_department:departments(name_en)
        `)
        .eq('id', bondId)
        .single();

      if (error) throw error;

      // Fetch employee profile
      if (data?.scholar_record?.employee_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name_en, last_name_en, email, employee_id')
          .eq('id', data.scholar_record.employee_id)
          .single();
        
        return { ...data, employee: profile } as ServiceBond;
      }

      return data as ServiceBond;
    },
    enabled: !!bondId,
  });
}

// Fetch bond by scholar record
export function useBondByScholar(scholarRecordId: string | null) {
  return useQuery({
    queryKey: ['bond-by-scholar', scholarRecordId],
    queryFn: async () => {
      if (!scholarRecordId) return null;

      const { data, error } = await supabase
        .from('service_bonds')
        .select(`
          *,
          scholar_record:scholar_records(
            id,
            employee_id,
            program_name,
            institution,
            country,
            degree_level,
            expected_end_date,
            actual_end_date,
            status
          ),
          return_entity:entities(name_en),
          return_department:departments(name_en)
        `)
        .eq('scholar_record_id', scholarRecordId)
        .maybeSingle();

      if (error) throw error;
      return data as ServiceBond | null;
    },
    enabled: !!scholarRecordId,
  });
}

// Fetch my bond (for employees)
export function useMyBond() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-bond', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get my scholar record
      const { data: scholarRecord } = await supabase
        .from('scholar_records')
        .select('id')
        .eq('employee_id', user.id)
        .maybeSingle();

      if (!scholarRecord) return null;

      const { data, error } = await supabase
        .from('service_bonds')
        .select(`
          *,
          scholar_record:scholar_records(
            id,
            employee_id,
            program_name,
            institution,
            country,
            degree_level,
            expected_end_date,
            actual_end_date,
            status
          )
        `)
        .eq('scholar_record_id', scholarRecord.id)
        .maybeSingle();

      if (error) throw error;
      return data as ServiceBond | null;
    },
    enabled: !!user?.id,
  });
}

// Fetch bond policies
export function useBondPolicies() {
  return useQuery({
    queryKey: ['bond-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bond_policies')
        .select('*')
        .eq('is_active', true)
        .order('policy_name');

      if (error) throw error;
      return data as BondPolicy[];
    },
  });
}

// Fetch bond events
export function useBondEvents(bondId: string | null) {
  return useQuery({
    queryKey: ['bond-events', bondId],
    queryFn: async () => {
      if (!bondId) return [];

      const { data, error } = await supabase
        .from('bond_events')
        .select('*')
        .eq('bond_id', bondId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data as BondEvent[];
    },
    enabled: !!bondId,
  });
}

// Fetch bond repayments
export function useBondRepayments(bondId: string | null) {
  return useQuery({
    queryKey: ['bond-repayments', bondId],
    queryFn: async () => {
      if (!bondId) return [];

      const { data, error } = await supabase
        .from('bond_repayments')
        .select('*')
        .eq('bond_id', bondId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as BondRepayment[];
    },
    enabled: !!bondId,
  });
}

// Dashboard stats
export function useBondDashboardStats() {
  return useQuery({
    queryKey: ['bond-dashboard-stats'],
    queryFn: async () => {
      const { data: bonds, error } = await supabase
        .from('service_bonds')
        .select('status, bond_end_date, repayment_status, final_repayment_amount');

      if (error) throw error;

      const now = new Date();
      const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Check for bonds that should be marked as fulfilled
      const bondsToFulfill = bonds?.filter(b => {
        if (b.status !== 'active' || !b.bond_end_date) return false;
        const endDate = new Date(b.bond_end_date);
        return endDate <= now;
      }) || [];

      // Auto-update fulfilled bonds
      for (const bond of bondsToFulfill) {
        await supabase
          .from('service_bonds')
          .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
          .eq('status', 'active')
          .lte('bond_end_date', now.toISOString().split('T')[0]);
      }

      const stats = {
        total: bonds?.length || 0,
        pending: bonds?.filter(b => b.status === 'pending').length || 0,
        active: bonds?.filter(b => b.status === 'active').length || 0,
        fulfilled: bonds?.filter(b => b.status === 'fulfilled').length || 0,
        broken: bonds?.filter(b => b.status === 'broken').length || 0,
        approachingFulfilment: bonds?.filter(b => {
          if (b.status !== 'active' || !b.bond_end_date) return false;
          const endDate = new Date(b.bond_end_date);
          return endDate <= threeMonthsLater && endDate > now;
        }).length || 0,
        pendingReturn: bonds?.filter(b => b.status === 'pending').length || 0,
        outstandingRepayment: bonds?.filter(b => 
          b.repayment_status === 'pending' || b.repayment_status === 'partial'
        ).reduce((sum, b) => sum + (Number(b.final_repayment_amount) || 0), 0) || 0,
      };

      return stats;
    },
  });
}

// Pending waivers for approval
export interface PendingWaiver {
  event: BondEvent;
  bondId: string;
  employeeName: string;
  employeeId: string;
  programName: string;
  institution: string;
}

export function usePendingWaivers() {
  return useQuery({
    queryKey: ['pending-waivers'],
    queryFn: async () => {
      // Get all pending waiver events
      const { data: events, error } = await supabase
        .from('bond_events')
        .select('*')
        .eq('event_type', 'waiver_request')
        .eq('approval_status', 'pending')
        .order('event_date', { ascending: false });

      if (error) throw error;
      if (!events || events.length === 0) return [];

      // Get bond IDs
      const bondIds = [...new Set(events.map(e => e.bond_id))];

      // Fetch bonds with scholar records
      const { data: bonds } = await supabase
        .from('service_bonds')
        .select(`
          id,
          scholar_record:scholar_records(
            employee_id,
            program_name,
            institution
          )
        `)
        .in('id', bondIds);

      // Fetch employee profiles
      const employeeIds = bonds?.map(b => b.scholar_record?.employee_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, employee_id')
        .in('id', employeeIds);

      const bondMap = new Map(bonds?.map(b => [b.id, b]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return events.map(event => {
        const bond = bondMap.get(event.bond_id);
        const profile = bond?.scholar_record?.employee_id 
          ? profileMap.get(bond.scholar_record.employee_id)
          : null;

        return {
          event: event as BondEvent,
          bondId: event.bond_id,
          employeeName: profile ? `${profile.first_name_en} ${profile.last_name_en}` : 'Unknown',
          employeeId: profile?.employee_id || '',
          programName: bond?.scholar_record?.program_name || 'Unknown',
          institution: bond?.scholar_record?.institution || 'Unknown',
        } as PendingWaiver;
      });
    },
  });
}

// Create bond mutation
export function useCreateBond() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bondData: Partial<ServiceBond>) => {
      const insertData = {
        scholar_record_id: bondData.scholar_record_id,
        application_id: bondData.application_id,
        policy_id: bondData.policy_id,
        bond_type: bondData.bond_type || 'time_based',
        bond_duration_months: bondData.bond_duration_months || 36,
        funded_amount: bondData.funded_amount,
        currency: bondData.currency,
        expected_return_date: bondData.expected_return_date,
        status: bondData.status || 'pending',
        notes: bondData.notes,
        created_by: user?.id,
      };
      
      const { data, error } = await supabase
        .from('service_bonds')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('bond_audit_log').insert({
        bond_id: data.id,
        action: 'created',
        actor_id: user?.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      toast.success('Bond record created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bond: ${error.message}`);
    },
  });
}

// Update bond mutation
export function useUpdateBond() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceBond> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_bonds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('bond_audit_log').insert({
        bond_id: id,
        action: 'updated',
        actor_id: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      queryClient.invalidateQueries({ queryKey: ['bond', variables.id] });
      toast.success('Bond record updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bond: ${error.message}`);
    },
  });
}

// Confirm return to work
export function useConfirmReturnToWork() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bondId,
      actualReturnDate,
      returnEntityId,
      returnDepartmentId,
      returnPosition,
      returnManagerId,
    }: {
      bondId: string;
      actualReturnDate: string;
      returnEntityId?: string;
      returnDepartmentId?: string;
      returnPosition?: string;
      returnManagerId?: string;
    }) => {
      // Get bond to calculate end date
      const { data: bond } = await supabase
        .from('service_bonds')
        .select('bond_duration_months')
        .eq('id', bondId)
        .single();

      if (!bond) throw new Error('Bond not found');

      const startDate = new Date(actualReturnDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + bond.bond_duration_months);

      const { data, error } = await supabase
        .from('service_bonds')
        .update({
          actual_return_date: actualReturnDate,
          bond_start_date: actualReturnDate,
          bond_end_date: endDate.toISOString().split('T')[0],
          return_entity_id: returnEntityId,
          return_department_id: returnDepartmentId,
          return_position: returnPosition,
          return_manager_id: returnManagerId,
          status: 'active',
        })
        .eq('id', bondId)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('bond_audit_log').insert({
        bond_id: bondId,
        action: 'return_confirmed',
        new_value: actualReturnDate,
        actor_id: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      queryClient.invalidateQueries({ queryKey: ['bond', variables.bondId] });
      toast.success('Return to work confirmed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm return: ${error.message}`);
    },
  });
}

// Create bond event
export function useCreateBondEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventData: Partial<BondEvent>) => {
      const insertData = {
        bond_id: eventData.bond_id!,
        event_type: eventData.event_type!,
        event_date: eventData.event_date!,
        end_date: eventData.end_date,
        reason: eventData.reason,
        description: eventData.description,
        waiver_type: eventData.waiver_type,
        waiver_amount: eventData.waiver_amount,
        waiver_time_months: eventData.waiver_time_months,
        approval_status: eventData.approval_status,
        document_url: eventData.document_url,
        days_affected: eventData.days_affected,
        created_by: user?.id,
      };
      
      const { data, error } = await supabase
        .from('bond_events')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('bond_audit_log').insert({
        bond_id: eventData.bond_id,
        event_id: data.id,
        action: `event_created_${eventData.event_type}`,
        actor_id: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bond-events', variables.bond_id] });
      queryClient.invalidateQueries({ queryKey: ['bond', variables.bond_id] });
      toast.success('Event recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create event: ${error.message}`);
    },
  });
}

// Process waiver approval
export function useProcessWaiverApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventId,
      bondId,
      decision,
      comments,
    }: {
      eventId: string;
      bondId: string;
      decision: 'approved' | 'rejected';
      comments?: string;
    }) => {
      // Update event
      const { error: eventError } = await supabase
        .from('bond_events')
        .update({
          approval_status: decision,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // If approved, update bond status
      if (decision === 'approved') {
        const { data: event } = await supabase
          .from('bond_events')
          .select('waiver_type, waiver_amount')
          .eq('id', eventId)
          .single();

        const newStatus = event?.waiver_type === 'full' ? 'waived_full' : 'waived_partial';

        await supabase
          .from('service_bonds')
          .update({
            status: newStatus,
            final_repayment_amount: event?.waiver_type === 'full' ? 0 : event?.waiver_amount,
            repayment_status: event?.waiver_type === 'full' ? 'waived' : 'pending',
          })
          .eq('id', bondId);
      }

      // Create audit log
      await supabase.from('bond_audit_log').insert({
        bond_id: bondId,
        event_id: eventId,
        action: `waiver_${decision}`,
        reason: comments,
        actor_id: user?.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bond-events', variables.bondId] });
      queryClient.invalidateQueries({ queryKey: ['bond', variables.bondId] });
      toast.success('Waiver processed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process waiver: ${error.message}`);
    },
  });
}

// Record repayment
export function useRecordRepayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (repaymentData: Partial<BondRepayment>) => {
      const insertData = {
        bond_id: repaymentData.bond_id!,
        amount: repaymentData.amount!,
        currency: repaymentData.currency,
        payment_date: repaymentData.payment_date,
        payment_method: repaymentData.payment_method,
        reference_number: repaymentData.reference_number,
        status: repaymentData.status || 'pending',
        notes: repaymentData.notes,
        created_by: user?.id,
      };
      
      const { data, error } = await supabase
        .from('bond_repayments')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Calculate total repaid
      const { data: allRepayments } = await supabase
        .from('bond_repayments')
        .select('amount')
        .eq('bond_id', repaymentData.bond_id)
        .eq('status', 'confirmed');

      const totalRepaid = (allRepayments?.reduce((sum, r) => sum + Number(r.amount), 0) || 0) + Number(repaymentData.amount);

      // Get bond to check if fully repaid
      const { data: bond } = await supabase
        .from('service_bonds')
        .select('final_repayment_amount')
        .eq('id', repaymentData.bond_id)
        .single();

      const isFullyRepaid = totalRepaid >= (Number(bond?.final_repayment_amount) || 0);

      // Update bond repayment status
      await supabase
        .from('service_bonds')
        .update({
          repayment_status: isFullyRepaid ? 'completed' : 'partial',
          status: isFullyRepaid ? 'fulfilled' : undefined,
        })
        .eq('id', repaymentData.bond_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bond-repayments', variables.bond_id] });
      queryClient.invalidateQueries({ queryKey: ['bond', variables.bond_id] });
      toast.success('Repayment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record repayment: ${error.message}`);
    },
  });
}

// Calculate repayment amount
export function calculateRepayment(
  fundedAmount: number,
  bondDurationMonths: number,
  timeServedMonths: number,
  repaymentFormula: string = 'pro_rata',
  repaymentPercentage: number = 100
): number {
  if (repaymentFormula === 'pro_rata') {
    const remainingRatio = Math.max(0, (bondDurationMonths - timeServedMonths) / bondDurationMonths);
    return fundedAmount * remainingRatio * (repaymentPercentage / 100);
  }
  // Fixed formula - full amount
  return fundedAmount * (repaymentPercentage / 100);
}
