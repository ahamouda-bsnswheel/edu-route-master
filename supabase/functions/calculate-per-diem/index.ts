import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerDiemRequest {
  action: 'estimate' | 'calculate_final' | 'recalculate' | 'bulk_calculate';
  employee_id: string;
  training_request_id?: string;
  session_id?: string;
  travel_visa_request_id?: string;
  destination_country: string;
  destination_city?: string;
  employee_grade?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  is_domestic?: boolean;
  accommodation_covered?: boolean;
  participants?: Array<{
    employee_id: string;
    employee_grade?: number;
    is_domestic?: boolean;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PerDiemRequest = await req.json();
    console.log('Per diem calculation request:', body);

    const { action } = body;

    const { data: policyConfigs } = await supabase
      .from('per_diem_policy_config')
      .select('*')
      .eq('is_active', true);

    const policies: Record<string, unknown> = {};
    policyConfigs?.forEach((p: { config_key: string; config_value: unknown }) => {
      policies[p.config_key] = p.config_value;
    });

    if (action === 'bulk_calculate' && body.participants) {
      const results = [];
      for (const participant of body.participants) {
        const result = await calculatePerDiem(supabase, {
          ...body,
          employee_id: participant.employee_id,
          employee_grade: participant.employee_grade,
          is_domestic: participant.is_domestic,
        }, policies, 'estimate');
        results.push(result);
      }
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calculationType = action === 'estimate' ? 'estimate' : 'final';
    const result = await calculatePerDiem(supabase, body, policies, calculationType);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const error = err as Error;
    console.error('Per diem calculation error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function calculatePerDiem(
  supabase: ReturnType<typeof createClient>,
  request: PerDiemRequest,
  policies: Record<string, unknown>,
  calculationType: 'estimate' | 'final'
) {
  const {
    employee_id, training_request_id, session_id, travel_visa_request_id,
    destination_country, destination_city, employee_grade,
    planned_start_date, planned_end_date, actual_start_date, actual_end_date,
    is_domestic = false, accommodation_covered = false,
  } = request;

  const startDate = calculationType === 'final' && actual_start_date ? actual_start_date : planned_start_date;
  const endDate = calculationType === 'final' && actual_end_date ? actual_end_date : planned_end_date;

  if (!startDate || !endDate) {
    return { success: false, error: 'Start and end dates are required', config_missing: true, config_missing_reason: 'Missing travel dates' };
  }

  // Find destination band
  const { data: destBands } = await supabase
    .from('per_diem_destination_bands')
    .select('*')
    .eq('country', destination_country)
    .eq('is_active', true)
    .lte('valid_from', startDate)
    .order('valid_from', { ascending: false })
    .limit(1);

  if (!destBands || destBands.length === 0) {
    return { success: false, config_missing: true, config_missing_reason: 'No per diem rate configured for destination' };
  }

  const destinationBand = destBands[0];

  // Find grade band
  let gradeMultiplier = 1.0;
  let gradeBand = null;
  if (employee_grade) {
    const { data: gradeBands } = await supabase
      .from('per_diem_grade_bands')
      .select('*')
      .lte('grade_from', employee_grade)
      .gte('grade_to', employee_grade)
      .eq('is_active', true)
      .limit(1);
    if (gradeBands && gradeBands.length > 0) {
      gradeBand = gradeBands[0];
      gradeMultiplier = gradeBand.multiplier || 1.0;
    }
  }

  // Calculate days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const travelDayRate = (policies.travel_day_rate as { percentage?: number })?.percentage || 50;
  const fullDays = Math.max(0, totalDays - 2);
  const travelDays = 2;
  const totalEligibleDays = fullDays + (travelDays * travelDayRate / 100);

  let dailyRate = destinationBand.training_daily_rate * gradeMultiplier;
  if (accommodation_covered) dailyRate = 0;

  const estimatedAmount = dailyRate * totalEligibleDays;

  const calculationData = {
    employee_id, training_request_id, session_id, travel_visa_request_id,
    destination_country, destination_city, destination_band: destinationBand.band,
    is_domestic, employee_grade, grade_band_id: gradeBand?.id,
    planned_start_date, planned_end_date,
    actual_start_date: calculationType === 'final' ? actual_start_date : null,
    actual_end_date: calculationType === 'final' ? actual_end_date : null,
    calculation_type: calculationType, daily_rate: dailyRate, currency: destinationBand.currency,
    full_days: fullDays, travel_days: travelDays, weekend_days: 0, excluded_days: 0,
    total_eligible_days: totalEligibleDays, estimated_amount: estimatedAmount,
    final_amount: calculationType === 'final' ? estimatedAmount : null,
    destination_band_id: destinationBand.id, policy_snapshot: policies,
    status: calculationType === 'final' ? 'calculated' : 'pending',
    config_missing: false, accommodation_covered,
    calculated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };

  const { data: savedCalc } = await supabase.from('per_diem_calculations').insert(calculationData).select().single();

  return {
    success: true,
    calculation: savedCalc || calculationData,
    destination_band: destinationBand,
    grade_band: gradeBand,
    breakdown: { total_days: totalDays, full_days: fullDays, travel_days: travelDays, travel_day_rate: `${travelDayRate}%`, total_eligible_days: totalEligibleDays, effective_daily_rate: dailyRate, currency: destinationBand.currency, grade_multiplier: gradeMultiplier },
  };
}