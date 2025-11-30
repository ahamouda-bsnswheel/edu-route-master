import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  action: 'create_batch' | 'pull_records' | 'validate' | 'export' | 're_export' | 
          'mark_posted' | 'defer_records' | 'get_batch' | 'list_batches' | 
          'get_records' | 'get_summary' | 'get_reconciliation' | 'save_config' | 
          'list_configs' | 'delete_batch';
  batchId?: string;
  configId?: string;
  recordIds?: string[];
  filters?: {
    exportType?: string;
    periodStart?: string;
    periodEnd?: string;
    entityFilter?: string[];
    costCentreFilter?: string[];
    status?: string;
  };
  config?: any;
  pagination?: {
    page: number;
    pageSize: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: ExportRequest = await req.json();
    const { action } = body;

    console.log(`[manage-expense-export] Action: ${action}, User: ${userId}`);

    switch (action) {
      case 'create_batch':
        return await createBatch(supabase, body, userId);
      case 'pull_records':
        return await pullRecords(supabase, body, userId);
      case 'validate':
        return await validateBatch(supabase, body, userId);
      case 'export':
        return await exportBatch(supabase, body, userId);
      case 're_export':
        return await reExportBatch(supabase, body, userId);
      case 'mark_posted':
        return await markPosted(supabase, body, userId);
      case 'defer_records':
        return await deferRecords(supabase, body, userId);
      case 'get_batch':
        return await getBatch(supabase, body);
      case 'list_batches':
        return await listBatches(supabase, body);
      case 'get_records':
        return await getRecords(supabase, body);
      case 'get_summary':
        return await getSummary(supabase, body);
      case 'get_reconciliation':
        return await getReconciliation(supabase, body);
      case 'save_config':
        return await saveConfig(supabase, body, userId);
      case 'list_configs':
        return await listConfigs(supabase);
      case 'delete_batch':
        return await deleteBatch(supabase, body, userId);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[manage-expense-export] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createBatch(supabase: any, body: ExportRequest, userId: string | null) {
  const { filters, configId } = body;
  
  const { data: batch, error } = await supabase
    .from('expense_export_batches')
    .insert({
      config_id: configId || null,
      export_type: filters?.exportType || 'per_diem',
      period_start: filters?.periodStart,
      period_end: filters?.periodEnd,
      entity_filter: filters?.entityFilter || null,
      cost_centre_filter: filters?.costCentreFilter || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Log audit
  await supabase.from('expense_export_audit_log').insert({
    batch_id: batch.id,
    action: 'create_batch',
    actor_id: userId,
    new_status: 'draft',
    details: { filters },
  });

  return new Response(
    JSON.stringify({ success: true, batch }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function pullRecords(supabase: any, body: ExportRequest, userId: string | null) {
  const { batchId } = body;
  
  // Get batch details
  const { data: batch, error: batchError } = await supabase
    .from('expense_export_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchError) throw batchError;

  // Pull per diem records that haven't been exported yet
  const { data: perDiemRecords, error: perDiemError } = await supabase
    .from('per_diem_calculations')
    .select(`
      *,
      profiles:employee_id (
        id,
        first_name_en,
        last_name_en,
        employee_id,
        department,
        entity
      )
    `)
    .gte('created_at', batch.period_start)
    .lte('created_at', batch.period_end)
    .in('status', ['final', 'approved']);

  if (perDiemError) throw perDiemError;

  // Filter out already exported records
  const { data: existingRecords } = await supabase
    .from('expense_export_records')
    .select('source_id')
    .eq('source_type', 'per_diem')
    .in('status', ['exported', 'posted']);

  const exportedIds = new Set((existingRecords || []).map((r: any) => r.source_id));
  const eligibleRecords = (perDiemRecords || []).filter((r: any) => !exportedIds.has(r.id));

  // Get all incidents for the period to check for adjustments
  const { data: incidents } = await supabase
    .from('travel_incidents')
    .select('id, employee_id, session_id, trip_id, incident_type, training_impact')
    .gte('incident_date', batch.period_start)
    .lte('incident_date', batch.period_end)
    .in('training_impact', ['late_arrival', 'missed_days', 'no_show', 'session_cancelled']);

  // Create a map of employee+session to incidents
  const incidentMap = new Map<string, string[]>();
  for (const incident of incidents || []) {
    const key = `${incident.employee_id}-${incident.session_id || 'none'}`;
    if (!incidentMap.has(key)) {
      incidentMap.set(key, []);
    }
    incidentMap.get(key)!.push(incident.id);
  }

  // Create export records with incident adjustment flags
  const recordsToInsert = eligibleRecords.map((r: any) => {
    const incidentKey = `${r.employee_id}-${r.session_id || 'none'}`;
    const relatedIncidents = incidentMap.get(incidentKey) || [];
    
    return {
      batch_id: batchId,
      source_type: 'per_diem',
      source_id: r.id,
      employee_id: r.employee_id,
      employee_payroll_id: r.profiles?.employee_id || null,
      employee_name: r.profiles ? `${r.profiles.first_name_en || ''} ${r.profiles.last_name_en || ''}`.trim() : null,
      training_request_id: r.training_request_id,
      session_id: r.session_id,
      trip_id: r.trip_id || null,
      expense_type: 'PER_DIEM_TRAINING',
      amount: r.final_amount || r.estimated_amount,
      currency: r.currency || 'LYD',
      cost_centre: r.profiles?.department || null,
      expense_date: r.actual_end_date || r.planned_end_date,
      posting_period: new Date(r.actual_end_date || r.planned_end_date || new Date()).toISOString().substring(0, 7),
      destination_country: r.destination_country,
      destination_city: r.destination_city,
      status: 'pending',
      export_key: `PD-${r.id}-${Date.now()}`,
      has_incident_adjustment: relatedIncidents.length > 0,
      incident_ids: relatedIncidents,
    };
  });

  if (recordsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('expense_export_records')
      .insert(recordsToInsert);

    if (insertError) throw insertError;
  }

  // Update batch totals
  const totalAmount = recordsToInsert.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const incidentAdjustedCount = recordsToInsert.filter((r: any) => r.has_incident_adjustment).length;
  
  await supabase
    .from('expense_export_batches')
    .update({
      total_records: recordsToInsert.length,
      total_amount: totalAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  // Log audit
  await supabase.from('expense_export_audit_log').insert({
    batch_id: batchId,
    action: 'pull_records',
    actor_id: userId,
    details: { 
      records_pulled: recordsToInsert.length, 
      total_amount: totalAmount,
      incident_adjusted_count: incidentAdjustedCount
    },
  });

  console.log(`[pull_records] Pulled ${recordsToInsert.length} records, ${incidentAdjustedCount} with incident adjustments`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      recordsCount: recordsToInsert.length,
      totalAmount,
      incidentAdjustedCount
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function validateBatch(supabase: any, body: ExportRequest, userId: string | null) {
  const { batchId } = body;

  // Get all records for this batch
  const { data: records, error } = await supabase
    .from('expense_export_records')
    .select('*')
    .eq('batch_id', batchId);

  if (error) throw error;

  const validationErrors: any[] = [];
  let validCount = 0;
  let errorCount = 0;

  for (const record of records || []) {
    const errors: string[] = [];

    // Validation checks
    if (!record.employee_payroll_id) {
      errors.push('Missing employee payroll ID');
    }
    if (!record.cost_centre) {
      errors.push('Missing cost centre');
    }
    if (!record.amount || record.amount <= 0) {
      errors.push('Invalid amount');
    }
    if (!record.currency) {
      errors.push('Missing currency');
    }

    if (errors.length > 0) {
      errorCount++;
      await supabase
        .from('expense_export_records')
        .update({ 
          validation_errors: errors,
          status: 'pending' // Keep as pending with errors
        })
        .eq('id', record.id);
      
      validationErrors.push({
        recordId: record.id,
        employeeName: record.employee_name,
        errors,
      });
    } else {
      validCount++;
      await supabase
        .from('expense_export_records')
        .update({ 
          validation_errors: [],
          status: 'included' // Ready for export
        })
        .eq('id', record.id);
    }
  }

  // Update batch
  const newStatus = errorCount === 0 ? 'validated' : 'draft';
  await supabase
    .from('expense_export_batches')
    .update({
      status: newStatus,
      valid_records: validCount,
      error_records: errorCount,
      validation_errors: validationErrors,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  // Log audit
  await supabase.from('expense_export_audit_log').insert({
    batch_id: batchId,
    action: 'validate',
    actor_id: userId,
    old_status: 'draft',
    new_status: newStatus,
    details: { valid_count: validCount, error_count: errorCount },
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      status: newStatus,
      validCount,
      errorCount,
      validationErrors 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function exportBatch(supabase: any, body: ExportRequest, userId: string | null) {
  const { batchId } = body;

  // Get batch and records
  const { data: batch, error: batchError } = await supabase
    .from('expense_export_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchError) throw batchError;
  if (batch.status !== 'validated') {
    throw new Error('Batch must be validated before export');
  }

  const { data: records, error: recordsError } = await supabase
    .from('expense_export_records')
    .select('*')
    .eq('batch_id', batchId)
    .eq('status', 'included');

  if (recordsError) throw recordsError;

  // Generate CSV content
  const headers = [
    'Export Key',
    'Employee Payroll ID',
    'Employee Name',
    'Expense Type',
    'Amount',
    'Currency',
    'Cost Centre',
    'GL Account',
    'Expense Date',
    'Posting Period',
    'Destination Country',
    'Destination City',
    'Training Request ID',
    'Session ID',
    'Has Incident Adjustment'
  ];

  const csvRows = [headers.join(',')];
  
  for (const record of records || []) {
    const row = [
      record.export_key,
      record.employee_payroll_id || '',
      `"${record.employee_name || ''}"`,
      record.expense_type,
      record.amount,
      record.currency,
      record.cost_centre || '',
      record.gl_account || '',
      record.expense_date || '',
      record.posting_period || '',
      record.destination_country || '',
      record.destination_city || '',
      record.training_request_id || '',
      record.session_id || '',
      record.has_incident_adjustment ? 'Yes' : 'No'
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\n');
  const fileName = `export_${batch.batch_number}_${new Date().toISOString().split('T')[0]}.csv`;

  // Update batch status
  const now = new Date().toISOString();
  await supabase
    .from('expense_export_batches')
    .update({
      status: 'exported',
      exported_at: now,
      exported_by: userId,
      export_file_name: fileName,
      updated_at: now,
    })
    .eq('id', batchId);

  // Mark records as exported
  await supabase
    .from('expense_export_records')
    .update({
      status: 'exported',
      first_exported_at: now,
      last_exported_at: now,
      updated_at: now,
    })
    .eq('batch_id', batchId)
    .eq('status', 'included');

  // Log audit
  await supabase.from('expense_export_audit_log').insert({
    batch_id: batchId,
    action: 'export',
    actor_id: userId,
    old_status: 'validated',
    new_status: 'exported',
    details: { 
      records_exported: (records || []).length,
      file_name: fileName,
      total_amount: batch.total_amount
    },
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      fileName,
      csvContent,
      recordsExported: (records || []).length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function reExportBatch(supabase: any, body: ExportRequest, userId: string | null) {
  const { batchId } = body;

  const { data: batch, error: batchError } = await supabase
    .from('expense_export_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchError) throw batchError;

  const { data: records, error: recordsError } = await supabase
    .from('expense_export_records')
    .select('*')
    .eq('batch_id', batchId)
    .in('status', ['exported', 'failed']);

  if (recordsError) throw recordsError;

  // Generate CSV
  const headers = [
    'Export Key', 'Employee Payroll ID', 'Employee Name', 'Expense Type',
    'Amount', 'Currency', 'Cost Centre', 'GL Account', 'Expense Date',
    'Posting Period', 'Destination Country', 'Destination City',
    'Training Request ID', 'Session ID', 'Has Incident Adjustment'
  ];

  const csvRows = [headers.join(',')];
  for (const record of records || []) {
    const row = [
      record.export_key, record.employee_payroll_id || '',
      `"${record.employee_name || ''}"`, record.expense_type,
      record.amount, record.currency, record.cost_centre || '',
      record.gl_account || '', record.expense_date || '',
      record.posting_period || '', record.destination_country || '',
      record.destination_city || '', record.training_request_id || '',
      record.session_id || '', record.has_incident_adjustment ? 'Yes' : 'No'
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\n');
  const fileName = `re_export_${batch.batch_number}_${new Date().toISOString().split('T')[0]}.csv`;
  const now = new Date().toISOString();

  // Update batch
  await supabase
    .from('expense_export_batches')
    .update({
      status: 're_exported',
      re_export_count: (batch.re_export_count || 0) + 1,
      updated_at: now,
    })
    .eq('id', batchId);

  // Update records
  await supabase
    .from('expense_export_records')
    .update({
      last_exported_at: now,
      updated_at: now,
    })
    .eq('batch_id', batchId);

  // Log audit
  await supabase.from('expense_export_audit_log').insert({
    batch_id: batchId,
    action: 're_export',
    actor_id: userId,
    old_status: batch.status,
    new_status: 're_exported',
    details: { re_export_count: (batch.re_export_count || 0) + 1 },
  });

  return new Response(
    JSON.stringify({ success: true, fileName, csvContent, recordsExported: (records || []).length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function markPosted(supabase: any, body: ExportRequest, userId: string | null) {
  const { batchId, recordIds } = body;

  const query = supabase
    .from('expense_export_records')
    .update({
      status: 'posted',
      external_status: 'posted',
      updated_at: new Date().toISOString(),
    })
    .eq('batch_id', batchId);

  if (recordIds && recordIds.length > 0) {
    query.in('id', recordIds);
  }

  const { error } = await query;
  if (error) throw error;

  // Check if all records are posted
  const { data: remaining } = await supabase
    .from('expense_export_records')
    .select('id')
    .eq('batch_id', batchId)
    .neq('status', 'posted');

  if ((remaining || []).length === 0) {
    await supabase
      .from('expense_export_batches')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', batchId);
  }

  await supabase.from('expense_export_audit_log').insert({
    batch_id: batchId,
    action: 'mark_posted',
    actor_id: userId,
    details: { record_ids: recordIds },
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deferRecords(supabase: any, body: ExportRequest, userId: string | null) {
  const { batchId, recordIds } = body;

  const { error } = await supabase
    .from('expense_export_records')
    .update({
      status: 'deferred',
      updated_at: new Date().toISOString(),
    })
    .eq('batch_id', batchId)
    .in('id', recordIds || []);

  if (error) throw error;

  // Update batch counts
  const { data: deferred } = await supabase
    .from('expense_export_records')
    .select('id')
    .eq('batch_id', batchId)
    .eq('status', 'deferred');

  await supabase
    .from('expense_export_batches')
    .update({
      deferred_records: (deferred || []).length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  await supabase.from('expense_export_audit_log').insert({
    batch_id: batchId,
    action: 'defer_records',
    actor_id: userId,
    details: { record_ids: recordIds },
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getBatch(supabase: any, body: ExportRequest) {
  const { batchId } = body;

  const { data: batch, error } = await supabase
    .from('expense_export_batches')
    .select(`
      *,
      config:config_id (*)
    `)
    .eq('id', batchId)
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, batch }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listBatches(supabase: any, body: ExportRequest) {
  const { filters, pagination } = body;
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 20;

  let query = supabase
    .from('expense_export_batches')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.exportType) {
    query = query.eq('export_type', filters.exportType);
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: batches, error, count } = await query;
  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, batches, total: count }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getRecords(supabase: any, body: ExportRequest) {
  const { batchId, filters, pagination } = body;
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 50;

  let query = supabase
    .from('expense_export_records')
    .select('*', { count: 'exact' })
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: records, error, count } = await query;
  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, records, total: count }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSummary(supabase: any, body: ExportRequest) {
  const { filters } = body;

  // Get summary of exported amounts by entity, category, etc.
  const { data: batches, error } = await supabase
    .from('expense_export_batches')
    .select('*')
    .in('status', ['exported', 're_exported', 'closed']);

  if (error) throw error;

  const { data: records, error: recError } = await supabase
    .from('expense_export_records')
    .select('*')
    .in('status', ['exported', 'posted']);

  if (recError) throw recError;

  // Aggregate by various dimensions
  const byCountry: Record<string, number> = {};
  const byExpenseType: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  for (const record of records || []) {
    const country = record.destination_country || 'Unknown';
    byCountry[country] = (byCountry[country] || 0) + (record.amount || 0);

    const expType = record.expense_type || 'Unknown';
    byExpenseType[expType] = (byExpenseType[expType] || 0) + (record.amount || 0);

    const month = record.posting_period || 'Unknown';
    byMonth[month] = (byMonth[month] || 0) + (record.amount || 0);
  }

  const totalExported = (records || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  return new Response(
    JSON.stringify({
      success: true,
      summary: {
        totalExported,
        totalBatches: (batches || []).length,
        totalRecords: (records || []).length,
        byCountry,
        byExpenseType,
        byMonth,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getReconciliation(supabase: any, body: ExportRequest) {
  const { filters } = body;

  // Get exported vs posted comparison
  const { data: records, error } = await supabase
    .from('expense_export_records')
    .select('*')
    .in('status', ['exported', 'posted', 'failed']);

  if (error) throw error;

  const exported = (records || []).filter((r: any) => r.status === 'exported');
  const posted = (records || []).filter((r: any) => r.status === 'posted');
  const failed = (records || []).filter((r: any) => r.status === 'failed');

  const exportedAmount = exported.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const postedAmount = posted.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  return new Response(
    JSON.stringify({
      success: true,
      reconciliation: {
        exportedCount: exported.length,
        exportedAmount,
        postedCount: posted.length,
        postedAmount,
        pendingCount: exported.length,
        pendingAmount: exportedAmount,
        failedCount: failed.length,
        variance: exportedAmount - postedAmount,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function saveConfig(supabase: any, body: ExportRequest, userId: string | null) {
  const { config, configId } = body;

  if (configId) {
    const { data, error } = await supabase
      .from('expense_export_config')
      .update({ ...config, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', configId)
      .select()
      .single();

    if (error) throw error;
    return new Response(
      JSON.stringify({ success: true, config: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    const { data, error } = await supabase
      .from('expense_export_config')
      .insert({ ...config, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    return new Response(
      JSON.stringify({ success: true, config: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function listConfigs(supabase: any) {
  const { data: configs, error } = await supabase
    .from('expense_export_config')
    .select('*')
    .eq('is_active', true)
    .order('config_name');

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, configs }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteBatch(supabase: any, body: ExportRequest, userId: string | null) {
  const { batchId } = body;

  // Only allow deleting draft batches
  const { data: batch, error: fetchError } = await supabase
    .from('expense_export_batches')
    .select('status')
    .eq('id', batchId)
    .single();

  if (fetchError) throw fetchError;
  if (batch.status !== 'draft') {
    throw new Error('Only draft batches can be deleted');
  }

  const { error } = await supabase
    .from('expense_export_batches')
    .delete()
    .eq('id', batchId);

  if (error) throw error;

  await supabase.from('expense_export_audit_log').insert({
    action: 'delete_batch',
    actor_id: userId,
    details: { batch_id: batchId },
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}