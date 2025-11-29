import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScholarData {
  id: string;
  employee_id: string;
  program_name: string;
  institution: string;
  country: string;
  degree_level: string;
  status: string;
  cumulative_gpa: number | null;
  gpa_scale: number | null;
  credits_completed: number | null;
  total_credits_required: number | null;
  current_term_number: number | null;
  total_terms: number | null;
  actual_start_date: string | null;
  expected_end_date: string | null;
  risk_level: string | null;
}

interface TermData {
  term_number: number;
  term_gpa: number | null;
  credits_attempted: number | null;
  credits_earned: number | null;
  status: string | null;
}

interface ModuleData {
  passed: boolean | null;
  module_type: string | null;
  is_retake: boolean | null;
}

interface EventData {
  event_type: string;
  event_date: string;
}

interface RiskConfig {
  gpa_weight: number;
  credits_weight: number;
  failed_modules_weight: number;
  events_weight: number;
  timeline_weight: number;
  gpa_threshold_low: number;
  gpa_threshold_medium: number;
  credits_behind_threshold: number;
  max_failed_core_modules: number;
}

interface RiskBands {
  on_track: { min: number; max: number };
  watch: { min: number; max: number };
  at_risk: { min: number; max: number };
  critical: { min: number; max: number };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scholar_record_id, batch_mode = false } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch risk configuration
    const { data: configData } = await supabase
      .from("scholar_risk_config")
      .select("config_key, config_value");

    const config: Record<string, any> = {};
    configData?.forEach((c: any) => {
      config[c.config_key] = c.config_value;
    });

    const riskFactors: RiskConfig = config.risk_factors || {
      gpa_weight: 0.25,
      credits_weight: 0.20,
      failed_modules_weight: 0.20,
      events_weight: 0.15,
      timeline_weight: 0.20,
      gpa_threshold_low: 2.0,
      gpa_threshold_medium: 2.5,
      credits_behind_threshold: 0.20,
      max_failed_core_modules: 2,
    };

    const riskBands: RiskBands = config.risk_bands || {
      on_track: { min: 0, max: 39 },
      watch: { min: 40, max: 59 },
      at_risk: { min: 60, max: 79 },
      critical: { min: 80, max: 100 },
    };

    // Fetch scholars to score
    let scholarsQuery = supabase
      .from("scholar_records")
      .select("*")
      .in("status", ["active", "on_leave"]);

    if (!batch_mode && scholar_record_id) {
      scholarsQuery = scholarsQuery.eq("id", scholar_record_id);
    }

    const { data: scholars, error: scholarsError } = await scholarsQuery;
    
    if (scholarsError) {
      throw new Error(`Failed to fetch scholars: ${scholarsError.message}`);
    }

    if (!scholars || scholars.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scholars to score", scored: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];
    const alerts: any[] = [];

    for (const scholar of scholars as ScholarData[]) {
      try {
        // Fetch academic terms
        const { data: terms } = await supabase
          .from("academic_terms")
          .select("term_number, term_gpa, credits_attempted, credits_earned, status")
          .eq("scholar_record_id", scholar.id)
          .order("term_number", { ascending: true });

        // Fetch modules for failed count
        const { data: modules } = await supabase
          .from("academic_modules")
          .select("passed, module_type, is_retake, term_id")
          .in("term_id", (terms || []).map((t: any) => t.id) || []);

        // Fetch events
        const { data: events } = await supabase
          .from("academic_events")
          .select("event_type, event_date")
          .eq("scholar_record_id", scholar.id);

        // Get previous risk score
        const { data: prevScore } = await supabase
          .from("scholar_risk_scores")
          .select("risk_band")
          .eq("scholar_record_id", scholar.id)
          .eq("is_override", false)
          .order("scored_at", { ascending: false })
          .limit(1)
          .single();

        // Calculate risk using AI
        const riskResult = await calculateRiskWithAI(
          scholar,
          terms as TermData[] || [],
          modules as ModuleData[] || [],
          events as EventData[] || [],
          riskFactors,
          riskBands,
          lovableApiKey
        );

        // Save risk score
        const { data: savedScore, error: saveError } = await supabase
          .from("scholar_risk_scores")
          .insert({
            scholar_record_id: scholar.id,
            risk_score: riskResult.score,
            risk_band: riskResult.band,
            contributing_factors: riskResult.factors,
            feature_snapshot: riskResult.features,
            model_version: "1.0-ai",
            previous_band: prevScore?.risk_band || null,
          })
          .select()
          .single();

        if (saveError) {
          console.error("Error saving score:", saveError);
          continue;
        }

        // Check for escalation and create alert
        if (prevScore?.risk_band && prevScore.risk_band !== riskResult.band) {
          const bandOrder = ["on_track", "watch", "at_risk", "critical"];
          const prevIndex = bandOrder.indexOf(prevScore.risk_band);
          const newIndex = bandOrder.indexOf(riskResult.band);
          
          if (newIndex > prevIndex) {
            // Risk escalated
            const { data: alert } = await supabase
              .from("scholar_risk_alerts")
              .insert({
                scholar_record_id: scholar.id,
                risk_score_id: savedScore.id,
                previous_band: prevScore.risk_band,
                new_band: riskResult.band,
                alert_type: riskResult.band === "critical" ? "critical_threshold" : "escalation",
                notified_roles: ["l_and_d", "hrbp"],
              })
              .select()
              .single();

            if (alert) {
              alerts.push(alert);
            }
          }
        } else if (!prevScore) {
          // First score - create alert if at risk
          if (riskResult.band === "at_risk" || riskResult.band === "critical") {
            await supabase
              .from("scholar_risk_alerts")
              .insert({
                scholar_record_id: scholar.id,
                risk_score_id: savedScore.id,
                previous_band: null,
                new_band: riskResult.band,
                alert_type: "new_risk",
                notified_roles: ["l_and_d", "hrbp"],
              });
          }
        }

        // Update scholar_records risk_level
        await supabase
          .from("scholar_records")
          .update({ risk_level: riskResult.band })
          .eq("id", scholar.id);

        results.push({
          scholar_id: scholar.id,
          score: riskResult.score,
          band: riskResult.band,
          factors: riskResult.factors,
        });
      } catch (scholarError) {
        console.error(`Error scoring scholar ${scholar.id}:`, scholarError);
        results.push({
          scholar_id: scholar.id,
          error: scholarError instanceof Error ? scholarError.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        scored: results.filter(r => !r.error).length,
        errors: results.filter(r => r.error).length,
        alerts_created: alerts.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Risk scoring error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function calculateRiskWithAI(
  scholar: ScholarData,
  terms: TermData[],
  modules: ModuleData[],
  events: EventData[],
  config: RiskConfig,
  bands: RiskBands,
  apiKey: string | undefined
): Promise<{ score: number; band: string; factors: any[]; features: any }> {
  // Calculate feature metrics
  const features = calculateFeatures(scholar, terms, modules, events);
  
  // If no API key, use rule-based scoring
  if (!apiKey) {
    return calculateRuleBasedRisk(features, config, bands);
  }

  try {
    // Use AI to analyze and score
    const prompt = `You are an academic risk assessment AI. Analyze the following scholar data and provide a non-completion risk assessment.

Scholar Profile:
- Program: ${scholar.program_name} at ${scholar.institution}
- Country: ${scholar.country}
- Degree Level: ${scholar.degree_level}
- Status: ${scholar.status}
- Current Term: ${scholar.current_term_number || 0} of ${scholar.total_terms || 'unknown'}

Academic Metrics:
- Cumulative GPA: ${scholar.cumulative_gpa || 'N/A'} (scale: ${scholar.gpa_scale || 4.0})
- Credits Completed: ${scholar.credits_completed || 0} of ${scholar.total_credits_required || 'unknown'}
- Terms Completed: ${terms.filter(t => t.status === 'completed').length}

Term History:
${terms.map(t => `- Term ${t.term_number}: GPA ${t.term_gpa || 'N/A'}, Credits ${t.credits_earned || 0}/${t.credits_attempted || 0}, Status: ${t.status}`).join('\n') || 'No term data'}

Module Results:
- Failed Modules: ${modules.filter(m => m.passed === false).length}
- Failed Core Modules: ${modules.filter(m => m.passed === false && m.module_type === 'core').length}
- Retakes: ${modules.filter(m => m.is_retake).length}

Academic Events:
${events.map(e => `- ${e.event_type} on ${e.event_date}`).join('\n') || 'No events'}

Timeline:
- Started: ${scholar.actual_start_date || 'N/A'}
- Expected Completion: ${scholar.expected_end_date || 'N/A'}
- Progress: ${features.timelineProgress}% of expected duration

Based on this data, provide a JSON response with:
1. risk_score: A number from 0-100 (0 = no risk, 100 = certain non-completion)
2. risk_band: One of "on_track", "watch", "at_risk", "critical"
3. factors: Array of objects with {factor: string, description: string, impact: "low"|"medium"|"high"}

Consider:
- GPA trends (declining is concerning)
- Credits behind schedule
- Failed modules, especially core ones
- Negative events (suspensions, warnings)
- Timeline delays

Respond ONLY with valid JSON, no markdown or explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an academic risk assessment AI. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return calculateRuleBasedRisk(features, config, bands);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return calculateRuleBasedRisk(features, config, bands);
    }

    // Parse AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return calculateRuleBasedRisk(features, config, bands);
    }

    const aiResult = JSON.parse(jsonMatch[0]);
    
    // Validate and clamp score
    const score = Math.max(0, Math.min(100, Number(aiResult.risk_score) || 50));
    const band = determineBand(score, bands);
    
    return {
      score,
      band,
      factors: aiResult.factors || [],
      features,
    };
  } catch (error) {
    console.error("AI scoring error:", error);
    return calculateRuleBasedRisk(features, config, bands);
  }
}

function calculateFeatures(
  scholar: ScholarData,
  terms: TermData[],
  modules: ModuleData[],
  events: EventData[]
) {
  const gpaScale = scholar.gpa_scale || 4.0;
  const normalizedGpa = scholar.cumulative_gpa ? (scholar.cumulative_gpa / gpaScale) * 4.0 : null;
  
  // GPA trend (last 3 terms)
  const recentTerms = terms.slice(-3);
  let gpaTrend = "stable";
  if (recentTerms.length >= 2) {
    const gpas = recentTerms.map(t => t.term_gpa).filter(g => g !== null) as number[];
    if (gpas.length >= 2) {
      const trend = gpas[gpas.length - 1] - gpas[0];
      gpaTrend = trend < -0.3 ? "declining" : trend > 0.3 ? "improving" : "stable";
    }
  }

  // Credits progress
  const expectedCredits = scholar.total_credits_required 
    ? (scholar.current_term_number || 0) / (scholar.total_terms || 1) * scholar.total_credits_required
    : 0;
  const creditsBehind = expectedCredits > 0 
    ? Math.max(0, (expectedCredits - (scholar.credits_completed || 0)) / expectedCredits)
    : 0;

  // Module failures
  const failedModules = modules.filter(m => m.passed === false).length;
  const failedCoreModules = modules.filter(m => m.passed === false && m.module_type === 'core').length;
  const retakes = modules.filter(m => m.is_retake).length;

  // Timeline progress
  let timelineProgress = 0;
  if (scholar.actual_start_date && scholar.expected_end_date) {
    const start = new Date(scholar.actual_start_date).getTime();
    const end = new Date(scholar.expected_end_date).getTime();
    const now = Date.now();
    const totalDuration = end - start;
    const elapsed = now - start;
    timelineProgress = totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
  }

  // Negative events
  const negativeEvents = events.filter(e => 
    ["suspension", "warning", "probation", "academic_warning"].includes(e.event_type)
  ).length;

  return {
    normalizedGpa,
    gpaTrend,
    creditsBehind,
    failedModules,
    failedCoreModules,
    retakes,
    timelineProgress,
    negativeEvents,
    termsCompleted: terms.filter(t => t.status === 'completed').length,
    totalTerms: scholar.total_terms || 0,
  };
}

function calculateRuleBasedRisk(
  features: ReturnType<typeof calculateFeatures>,
  config: RiskConfig,
  bands: RiskBands
): { score: number; band: string; factors: any[]; features: any } {
  let score = 0;
  const factors: any[] = [];

  // GPA factor
  if (features.normalizedGpa !== null) {
    if (features.normalizedGpa < config.gpa_threshold_low) {
      score += 30 * config.gpa_weight * 4;
      factors.push({
        factor: "low_gpa",
        description: `GPA (${features.normalizedGpa.toFixed(2)}) is below minimum threshold (${config.gpa_threshold_low})`,
        impact: "high"
      });
    } else if (features.normalizedGpa < config.gpa_threshold_medium) {
      score += 20 * config.gpa_weight * 4;
      factors.push({
        factor: "below_average_gpa",
        description: `GPA (${features.normalizedGpa.toFixed(2)}) is below recommended (${config.gpa_threshold_medium})`,
        impact: "medium"
      });
    }
  }

  // GPA trend factor
  if (features.gpaTrend === "declining") {
    score += 15;
    factors.push({
      factor: "declining_gpa",
      description: "GPA has been declining over recent terms",
      impact: "medium"
    });
  }

  // Credits behind factor
  if (features.creditsBehind > config.credits_behind_threshold) {
    score += 25 * config.credits_weight * 4;
    factors.push({
      factor: "credits_behind",
      description: `Credits completed are ${Math.round(features.creditsBehind * 100)}% behind expected progress`,
      impact: features.creditsBehind > 0.4 ? "high" : "medium"
    });
  }

  // Failed modules factor
  if (features.failedCoreModules >= config.max_failed_core_modules) {
    score += 30 * config.failed_modules_weight * 4;
    factors.push({
      factor: "failed_core_modules",
      description: `Failed ${features.failedCoreModules} core modules (threshold: ${config.max_failed_core_modules})`,
      impact: "high"
    });
  } else if (features.failedModules > 0) {
    score += 10 * features.failedModules * config.failed_modules_weight;
    factors.push({
      factor: "failed_modules",
      description: `Failed ${features.failedModules} module(s)`,
      impact: features.failedModules > 2 ? "medium" : "low"
    });
  }

  // Negative events factor
  if (features.negativeEvents > 0) {
    score += 15 * features.negativeEvents * config.events_weight;
    factors.push({
      factor: "negative_events",
      description: `${features.negativeEvents} negative academic event(s) on record`,
      impact: features.negativeEvents > 1 ? "high" : "medium"
    });
  }

  // Timeline factor
  if (features.timelineProgress > 100) {
    score += 20 * config.timeline_weight * 4;
    factors.push({
      factor: "timeline_exceeded",
      description: "Program duration has exceeded expected completion date",
      impact: "high"
    });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = determineBand(score, bands);

  return { score, band, factors, features };
}

function determineBand(score: number, bands: RiskBands): string {
  if (score <= bands.on_track.max) return "on_track";
  if (score <= bands.watch.max) return "watch";
  if (score <= bands.at_risk.max) return "at_risk";
  return "critical";
}
