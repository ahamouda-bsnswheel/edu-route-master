import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScoringRequest {
  type: "single" | "batch";
  tna_item_id?: string;
  plan_item_id?: string;
  tna_period_id?: string;
  plan_id?: string;
  job_id?: string;
}

interface PriorityFactors {
  hse_critical: boolean;
  competency_gap_level: "high" | "medium" | "low" | "none";
  manager_priority: "high" | "medium" | "low";
  role_criticality: "critical" | "key" | "standard";
  compliance_overdue: boolean;
  estimated_cost: number;
  strategic_theme: string | null;
  training_type: string;
  training_location: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { type, tna_item_id, plan_item_id, tna_period_id, plan_id, job_id } = await req.json() as ScoringRequest;

    // Get active config
    const { data: config, error: configError } = await supabase
      .from("ai_priority_config")
      .select("*")
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      throw new Error("No active AI priority config found");
    }

    if (type === "single") {
      // Score single item
      const result = await scoreSingleItem(supabase, lovableApiKey, config, tna_item_id, plan_item_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (type === "batch") {
      // Start batch scoring in background
      const jobResult = await startBatchScoring(supabase, lovableApiKey, config, tna_period_id, plan_id, job_id);
      return new Response(JSON.stringify(jobResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scoring error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function scoreSingleItem(
  supabase: any,
  lovableApiKey: string | undefined,
  config: any,
  tnaItemId?: string,
  planItemId?: string
) {
  let itemData: any;
  let factors: PriorityFactors;

  if (tnaItemId) {
    // Fetch TNA item with related data
    const { data, error } = await supabase
      .from("tna_items")
      .select(`
        *,
        submission:tna_submissions(
          employee_id,
          profiles:employee_id(job_role_id, department_id)
        ),
        course:courses(id, name_en, is_mandatory, cost_amount),
        competency:competencies(id, name_en, category)
      `)
      .eq("id", tnaItemId)
      .single();

    if (error) throw error;
    itemData = data;

    factors = extractFactorsFromTNA(itemData);
  } else if (planItemId) {
    // Fetch plan item
    const { data, error } = await supabase
      .from("training_plan_items")
      .select(`
        *,
        course:courses(id, name_en, is_mandatory, cost_amount),
        category:course_categories(id, name_en)
      `)
      .eq("id", planItemId)
      .single();

    if (error) throw error;
    itemData = data;

    factors = extractFactorsFromPlanItem(itemData);
  } else {
    throw new Error("Either tna_item_id or plan_item_id is required");
  }

  // Calculate rule-based score
  const ruleBasedScore = calculateRuleBasedScore(factors, config);

  // Get AI explanation if API key available
  let aiExplanation = null;
  if (lovableApiKey) {
    aiExplanation = await getAIExplanation(lovableApiKey, factors, ruleBasedScore, itemData);
  }

  // Determine priority band
  const band = getPriorityBand(ruleBasedScore.totalScore, config);

  // Prepare score record
  const scoreRecord = {
    tna_item_id: tnaItemId || null,
    plan_item_id: planItemId || null,
    priority_score: ruleBasedScore.totalScore,
    priority_band: band,
    hse_contribution: ruleBasedScore.contributions.hse,
    competency_gap_contribution: ruleBasedScore.contributions.competencyGap,
    manager_priority_contribution: ruleBasedScore.contributions.managerPriority,
    role_criticality_contribution: ruleBasedScore.contributions.roleCriticality,
    compliance_contribution: ruleBasedScore.contributions.compliance,
    cost_contribution: ruleBasedScore.contributions.cost,
    strategic_contribution: ruleBasedScore.contributions.strategic,
    explanation_summary: aiExplanation?.summary || generateRuleSummary(factors, ruleBasedScore),
    factor_details: aiExplanation?.details || ruleBasedScore.details,
    model_version: "v1",
    config_version: config.version,
    scored_at: new Date().toISOString(),
  };

  // Upsert score
  const { data: savedScore, error: saveError } = await supabase
    .from("ai_priority_scores")
    .upsert(scoreRecord, {
      onConflict: tnaItemId ? "tna_item_id" : "plan_item_id",
    })
    .select()
    .single();

  if (saveError) {
    // If upsert fails, try insert
    const { data: insertedScore, error: insertError } = await supabase
      .from("ai_priority_scores")
      .insert(scoreRecord)
      .select()
      .single();
    
    if (insertError) throw insertError;
    return insertedScore;
  }

  return savedScore;
}

async function startBatchScoring(
  supabase: any,
  lovableApiKey: string | undefined,
  config: any,
  tnaPeriodId?: string,
  planId?: string,
  existingJobId?: string
) {
  // Create or update job
  let jobId = existingJobId;
  
  if (!jobId) {
    // Count items to process
    let totalItems = 0;
    if (tnaPeriodId) {
      const { count } = await supabase
        .from("tna_items")
        .select("id", { count: "exact", head: true })
        .eq("submission.period_id", tnaPeriodId);
      totalItems = count || 0;
    } else if (planId) {
      const { count } = await supabase
        .from("training_plan_items")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", planId)
        .eq("item_status", "active");
      totalItems = count || 0;
    }

    const { data: job, error } = await supabase
      .from("ai_scoring_jobs")
      .insert({
        job_name: `Priority scoring - ${new Date().toISOString()}`,
        job_type: "batch",
        tna_period_id: tnaPeriodId,
        plan_id: planId,
        status: "running",
        total_items: totalItems,
        started_at: new Date().toISOString(),
        config_snapshot: config,
        model_version: "v1",
      })
      .select()
      .single();

    if (error) throw error;
    jobId = job.id;
  }

  // Process items in batches
  const batchSize = 50;
  let processed = 0;
  let successCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  try {
    if (tnaPeriodId) {
      // Get TNA items for period
      const { data: submissions } = await supabase
        .from("tna_submissions")
        .select("id")
        .eq("period_id", tnaPeriodId)
        .in("status", ["approved", "locked"]);

      if (submissions) {
        const submissionIds = submissions.map((s: any) => s.id);
        
        const { data: items } = await supabase
          .from("tna_items")
          .select("id")
          .in("submission_id", submissionIds);

        if (items) {
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            for (const item of batch) {
              try {
                await scoreSingleItem(supabase, lovableApiKey, config, item.id, undefined);
                successCount++;
              } catch (err: any) {
                errorCount++;
                errors.push({ item_id: item.id, error: err.message });
              }
              processed++;
            }

            // Update job progress
            await supabase
              .from("ai_scoring_jobs")
              .update({
                processed_items: processed,
                success_count: successCount,
                error_count: errorCount,
                error_log: errors.slice(-100), // Keep last 100 errors
              })
              .eq("id", jobId);
          }
        }
      }
    } else if (planId) {
      // Get plan items
      const { data: items } = await supabase
        .from("training_plan_items")
        .select("id")
        .eq("plan_id", planId)
        .eq("item_status", "active");

      if (items) {
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          
          for (const item of batch) {
            try {
              await scoreSingleItem(supabase, lovableApiKey, config, undefined, item.id);
              successCount++;
            } catch (err: any) {
              errorCount++;
              errors.push({ item_id: item.id, error: err.message });
            }
            processed++;
          }

          // Update job progress
          await supabase
            .from("ai_scoring_jobs")
            .update({
              processed_items: processed,
              success_count: successCount,
              error_count: errorCount,
              error_log: errors.slice(-100),
            })
            .eq("id", jobId);
        }
      }
    }

    // Mark job as completed
    await supabase
      .from("ai_scoring_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_items: processed,
        success_count: successCount,
        error_count: errorCount,
        error_log: errors.slice(-100),
      })
      .eq("id", jobId);

    return { job_id: jobId, status: "completed", processed, successCount, errorCount };
  } catch (error: any) {
    // Mark job as failed
    await supabase
      .from("ai_scoring_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_log: [...errors, { error: error.message }],
      })
      .eq("id", jobId);

    throw error;
  }
}

function extractFactorsFromTNA(item: any): PriorityFactors {
  const courseIsMandatory = item.course?.is_mandatory || false;
  const trainingType = item.training_type || "short_term";
  const trainingLocation = item.training_location || "local";
  const priority = item.priority || "medium";
  const estimatedCost = item.estimated_cost || item.course?.cost_amount || 0;
  
  // Determine HSE criticality based on competency category or course properties
  const isHSE = item.competency?.category?.toLowerCase().includes("hse") ||
                item.course?.name_en?.toLowerCase().includes("safety") ||
                item.course?.name_en?.toLowerCase().includes("hse") ||
                courseIsMandatory;

  return {
    hse_critical: isHSE,
    competency_gap_level: mapPriorityToGap(priority),
    manager_priority: priority as "high" | "medium" | "low",
    role_criticality: "standard", // Would need job role data to determine
    compliance_overdue: courseIsMandatory,
    estimated_cost: estimatedCost,
    strategic_theme: null,
    training_type: trainingType,
    training_location: trainingLocation,
  };
}

function extractFactorsFromPlanItem(item: any): PriorityFactors {
  const courseIsMandatory = item.course?.is_mandatory || false;
  const priority = item.priority || "medium";
  
  const isHSE = item.category?.name_en?.toLowerCase().includes("hse") ||
                item.item_name?.toLowerCase().includes("safety") ||
                item.item_name?.toLowerCase().includes("hse");

  return {
    hse_critical: isHSE,
    competency_gap_level: mapPriorityToGap(priority),
    manager_priority: priority as "high" | "medium" | "low",
    role_criticality: "standard",
    compliance_overdue: courseIsMandatory,
    estimated_cost: item.unit_cost || 0,
    strategic_theme: null,
    training_type: item.training_type || "short_term",
    training_location: item.training_location || "local",
  };
}

function mapPriorityToGap(priority: string): "high" | "medium" | "low" | "none" {
  switch (priority) {
    case "high": return "high";
    case "medium": return "medium";
    case "low": return "low";
    default: return "none";
  }
}

function calculateRuleBasedScore(factors: PriorityFactors, config: any) {
  const contributions = {
    hse: 0,
    competencyGap: 0,
    managerPriority: 0,
    roleCriticality: 0,
    compliance: 0,
    cost: 0,
    strategic: 0,
  };

  const details: any[] = [];

  // HSE criticality
  if (factors.hse_critical) {
    const weight = config.hse_criticality_weight;
    contributions.hse = weight;
    details.push({
      factor: "HSE Critical",
      value: "Yes",
      contribution: weight,
      explanation: "Training is safety-critical or HSE mandatory",
    });
  }

  // Competency gap
  const gapScores = { high: 1, medium: 0.6, low: 0.3, none: 0 };
  const gapScore = gapScores[factors.competency_gap_level];
  contributions.competencyGap = Math.round(config.competency_gap_weight * gapScore);
  if (gapScore > 0) {
    details.push({
      factor: "Competency Gap",
      value: factors.competency_gap_level,
      contribution: contributions.competencyGap,
      explanation: `${factors.competency_gap_level} competency gap identified`,
    });
  }

  // Manager priority
  const priorityScores = { high: 1, medium: 0.6, low: 0.3 };
  const priorityScore = priorityScores[factors.manager_priority];
  contributions.managerPriority = Math.round(config.manager_priority_weight * priorityScore);
  details.push({
    factor: "Manager Priority",
    value: factors.manager_priority,
    contribution: contributions.managerPriority,
    explanation: `Manager marked as ${factors.manager_priority} priority`,
  });

  // Role criticality
  const roleScores = { critical: 1, key: 0.7, standard: 0.4 };
  const roleScore = roleScores[factors.role_criticality];
  contributions.roleCriticality = Math.round(config.role_criticality_weight * roleScore);
  details.push({
    factor: "Role Criticality",
    value: factors.role_criticality,
    contribution: contributions.roleCriticality,
    explanation: `Employee role is ${factors.role_criticality}`,
  });

  // Compliance
  if (factors.compliance_overdue) {
    contributions.compliance = config.compliance_status_weight;
    details.push({
      factor: "Compliance Status",
      value: "Overdue/Mandatory",
      contribution: contributions.compliance,
      explanation: "Mandatory training or compliance requirement",
    });
  }

  // Cost efficiency (lower cost = higher priority boost)
  const costThreshold = 5000; // Configurable threshold
  if (factors.estimated_cost < costThreshold) {
    contributions.cost = Math.round(config.cost_efficiency_weight * (1 - factors.estimated_cost / costThreshold));
    details.push({
      factor: "Cost Efficiency",
      value: `${factors.estimated_cost} (below threshold)`,
      contribution: contributions.cost,
      explanation: "Cost-effective training option",
    });
  }

  // Strategic alignment (placeholder)
  if (factors.strategic_theme) {
    contributions.strategic = config.strategic_alignment_weight;
    details.push({
      factor: "Strategic Alignment",
      value: factors.strategic_theme,
      contribution: contributions.strategic,
      explanation: `Aligned with strategic theme: ${factors.strategic_theme}`,
    });
  }

  const totalScore = Math.min(100, Math.round(
    contributions.hse +
    contributions.competencyGap +
    contributions.managerPriority +
    contributions.roleCriticality +
    contributions.compliance +
    contributions.cost +
    contributions.strategic
  ));

  return { totalScore, contributions, details };
}

function getPriorityBand(score: number, config: any): string {
  if (score >= config.critical_threshold) return "critical";
  if (score >= config.high_threshold) return "high";
  if (score >= config.medium_threshold) return "medium";
  return "low";
}

function generateRuleSummary(factors: PriorityFactors, score: any): string {
  const parts: string[] = [];
  
  if (factors.hse_critical) {
    parts.push("HSE critical training");
  }
  if (factors.competency_gap_level === "high") {
    parts.push("significant competency gap");
  }
  if (factors.manager_priority === "high") {
    parts.push("high manager priority");
  }
  if (factors.compliance_overdue) {
    parts.push("mandatory compliance requirement");
  }

  if (parts.length === 0) {
    return `Priority score ${score.totalScore}: Standard training need.`;
  }

  return `Priority score ${score.totalScore}: Prioritised due to ${parts.join(", ")}.`;
}

async function getAIExplanation(
  apiKey: string,
  factors: PriorityFactors,
  score: any,
  itemData: any
) {
  try {
    const prompt = `You are an HR training prioritisation expert. Analyze this training need and explain why it received its priority score in 2-3 sentences. Be specific and actionable.

Training: ${itemData.course?.name_en || itemData.item_name || "Training need"}
Type: ${factors.training_type}, Location: ${factors.training_location}
HSE Critical: ${factors.hse_critical}
Competency Gap: ${factors.competency_gap_level}
Manager Priority: ${factors.manager_priority}
Compliance Required: ${factors.compliance_overdue}
Estimated Cost: ${factors.estimated_cost}

Score breakdown:
- HSE contribution: ${score.contributions.hse}
- Competency gap contribution: ${score.contributions.competencyGap}
- Manager priority contribution: ${score.contributions.managerPriority}
- Role criticality contribution: ${score.contributions.roleCriticality}
- Compliance contribution: ${score.contributions.compliance}
- Cost efficiency contribution: ${score.contributions.cost}

Total Score: ${score.totalScore}/100

Provide a brief, clear explanation of why this training received this priority level.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an HR training prioritisation expert. Provide brief, clear explanations." },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return null;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || null;

    return {
      summary,
      details: score.details,
    };
  } catch (error) {
    console.error("AI explanation error:", error);
    return null;
  }
}
