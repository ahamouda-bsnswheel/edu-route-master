import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ExportBatchStatus = 'draft' | 'validated' | 'exported' | 're_exported' | 'closed' | 'error';
export type ExportType = 'per_diem' | 'tuition' | 'travel_cost' | 'combined';
export type ExportFormat = 'csv' | 'json' | 'xml';
export type DeliveryMethod = 'file_download' | 'sftp' | 'api';
export type ExportRecordStatus = 'pending' | 'included' | 'exported' | 'failed' | 'deferred' | 'posted';

export interface ExportConfig {
  id: string;
  config_name: string;
  export_type: ExportType;
  export_format: ExportFormat;
  delivery_method: DeliveryMethod;
  field_mappings: any[];
  default_entity_filter: string[] | null;
  default_cost_centre_filter: string[] | null;
  date_basis: string;
  sftp_host: string | null;
  sftp_port: number;
  sftp_path: string | null;
  api_endpoint: string | null;
  api_auth_type: string | null;
  default_gl_account: string | null;
  default_cost_element: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExportBatch {
  id: string;
  batch_number: string;
  config_id: string | null;
  export_type: ExportType;
  status: ExportBatchStatus;
  period_start: string;
  period_end: string;
  entity_filter: string[] | null;
  cost_centre_filter: string[] | null;
  total_records: number;
  total_amount: number;
  currency: string;
  valid_records: number;
  error_records: number;
  deferred_records: number;
  validation_errors: any[];
  exported_at: string | null;
  exported_by: string | null;
  export_file_name: string | null;
  target_system: string | null;
  external_batch_id: string | null;
  re_export_count: number;
  created_at: string;
  created_by: string | null;
}

export interface ExportRecord {
  id: string;
  batch_id: string;
  source_type: string;
  source_id: string;
  employee_id: string;
  employee_payroll_id: string | null;
  employee_name: string | null;
  training_request_id: string | null;
  session_id: string | null;
  trip_id: string | null;
  course_name: string | null;
  expense_type: string;
  amount: number;
  currency: string;
  cost_centre: string | null;
  gl_account: string | null;
  expense_date: string | null;
  posting_period: string | null;
  destination_country: string | null;
  destination_city: string | null;
  status: ExportRecordStatus;
  validation_errors: string[];
  export_key: string;
  first_exported_at: string | null;
  last_exported_at: string | null;
  external_status: string | null;
  external_reference: string | null;
  has_incident_adjustment: boolean;
  incident_ids: string[];
  created_at: string;
}

export interface ExportSummary {
  totalExported: number;
  totalBatches: number;
  totalRecords: number;
  byCountry: Record<string, number>;
  byExpenseType: Record<string, number>;
  byMonth: Record<string, number>;
}

export interface ReconciliationData {
  exportedCount: number;
  exportedAmount: number;
  postedCount: number;
  postedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  failedCount: number;
  variance: number;
}

// Hook to list export batches
export function useExportBatches(filters?: { status?: string; exportType?: string }) {
  return useQuery({
    queryKey: ['export-batches', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: {
          action: 'list_batches',
          filters,
          pagination: { page: 1, pageSize: 100 },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.batches as ExportBatch[];
    },
  });
}

// Hook to get a single batch
export function useExportBatch(batchId?: string) {
  return useQuery({
    queryKey: ['export-batch', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'get_batch', batchId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.batch as ExportBatch;
    },
    enabled: !!batchId,
  });
}

// Hook to get batch records
export function useExportRecords(batchId?: string, filters?: { status?: string }) {
  return useQuery({
    queryKey: ['export-records', batchId, filters],
    queryFn: async () => {
      if (!batchId) return [];
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: {
          action: 'get_records',
          batchId,
          filters,
          pagination: { page: 1, pageSize: 500 },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.records as ExportRecord[];
    },
    enabled: !!batchId,
  });
}

// Hook to get export configs
export function useExportConfigs() {
  return useQuery({
    queryKey: ['export-configs'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'list_configs' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.configs as ExportConfig[];
    },
  });
}

// Hook to get export summary
export function useExportSummary() {
  return useQuery({
    queryKey: ['export-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'get_summary' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.summary as ExportSummary;
    },
  });
}

// Hook to get reconciliation data
export function useReconciliation() {
  return useQuery({
    queryKey: ['export-reconciliation'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'get_reconciliation' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.reconciliation as ReconciliationData;
    },
  });
}

// Mutation to create a batch
export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      exportType: ExportType;
      periodStart: string;
      periodEnd: string;
      entityFilter?: string[];
      costCentreFilter?: string[];
      configId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: {
          action: 'create_batch',
          configId: params.configId,
          filters: {
            exportType: params.exportType,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            entityFilter: params.entityFilter,
            costCentreFilter: params.costCentreFilter,
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.batch as ExportBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      toast({ title: 'Batch created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating batch', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to pull records
export function usePullRecords() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'pull_records', batchId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      queryClient.invalidateQueries({ queryKey: ['export-batch'] });
      queryClient.invalidateQueries({ queryKey: ['export-records'] });
      toast({ title: `Pulled ${data.recordsCount} records` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error pulling records', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to validate batch
export function useValidateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'validate', batchId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      queryClient.invalidateQueries({ queryKey: ['export-batch'] });
      queryClient.invalidateQueries({ queryKey: ['export-records'] });
      if (data.errorCount > 0) {
        toast({ 
          title: 'Validation completed with errors', 
          description: `${data.validCount} valid, ${data.errorCount} with errors`,
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Batch validated successfully' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error validating batch', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to export batch
export function useExportBatchMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'export', batchId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      queryClient.invalidateQueries({ queryKey: ['export-batch'] });
      queryClient.invalidateQueries({ queryKey: ['export-records'] });
      queryClient.invalidateQueries({ queryKey: ['export-summary'] });
      
      // Download the CSV file
      const blob = new Blob([data.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: `Exported ${data.recordsExported} records` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error exporting batch', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to re-export batch
export function useReExportBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 're_export', batchId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      queryClient.invalidateQueries({ queryKey: ['export-batch'] });
      
      const blob = new Blob([data.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: `Re-exported ${data.recordsExported} records` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error re-exporting batch', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to mark records as posted
export function useMarkPosted() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { batchId: string; recordIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'mark_posted', ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      queryClient.invalidateQueries({ queryKey: ['export-batch'] });
      queryClient.invalidateQueries({ queryKey: ['export-records'] });
      queryClient.invalidateQueries({ queryKey: ['export-reconciliation'] });
      toast({ title: 'Records marked as posted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error marking records', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to defer records
export function useDeferRecords() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { batchId: string; recordIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'defer_records', ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      queryClient.invalidateQueries({ queryKey: ['export-batch'] });
      queryClient.invalidateQueries({ queryKey: ['export-records'] });
      toast({ title: 'Records deferred' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deferring records', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to save config
export function useSaveConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { config: Partial<ExportConfig>; configId?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'save_config', ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.config as ExportConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-configs'] });
      toast({ title: 'Configuration saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving config', description: error.message, variant: 'destructive' });
    },
  });
}

// Mutation to delete batch
export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-expense-export', {
        body: { action: 'delete_batch', batchId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-batches'] });
      toast({ title: 'Batch deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting batch', description: error.message, variant: 'destructive' });
    },
  });
}

// Status labels and colors
export const batchStatusLabels: Record<ExportBatchStatus, string> = {
  draft: 'Draft',
  validated: 'Validated',
  exported: 'Exported',
  re_exported: 'Re-exported',
  closed: 'Closed',
  error: 'Error',
};

export const batchStatusColors: Record<ExportBatchStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  validated: 'bg-blue-100 text-blue-800',
  exported: 'bg-green-100 text-green-800',
  re_exported: 'bg-amber-100 text-amber-800',
  closed: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800',
};

export const recordStatusLabels: Record<ExportRecordStatus, string> = {
  pending: 'Pending',
  included: 'Included',
  exported: 'Exported',
  failed: 'Failed',
  deferred: 'Deferred',
  posted: 'Posted',
};

export const recordStatusColors: Record<ExportRecordStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  included: 'bg-blue-100 text-blue-800',
  exported: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  deferred: 'bg-amber-100 text-amber-800',
  posted: 'bg-emerald-100 text-emerald-800',
};

export const exportTypeLabels: Record<ExportType, string> = {
  per_diem: 'Per Diem',
  tuition: 'Tuition',
  travel_cost: 'Travel Cost',
  combined: 'Combined',
};