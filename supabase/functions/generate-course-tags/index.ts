import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_VERSION = "lovable-ai-v1";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { courseId } = await req.json();
    
    if (!courseId) {
      throw new Error('courseId is required');
    }

    console.log(`Starting AI tagging for course: ${courseId}`);

    // Fetch course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        course_categories(name_en, name_ar),
        training_providers(name_en, categories)
      `)
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message}`);
    }

    // Fetch tagging configuration
    const { data: config } = await supabase
      .from('ai_tagging_config')
      .select('*')
      .eq('is_enabled', true);

    const configMap = new Map(config?.map(c => [c.tag_type, c]) || []);

    // Fetch vocabularies for controlled types
    const { data: competencies } = await supabase
      .from('competencies')
      .select('name_en, code, category')
      .eq('is_active', true);

    const { data: jobRoles } = await supabase
      .from('job_roles')
      .select('name_en, code, job_family')
      .eq('is_active', true);

    const { data: categories } = await supabase
      .from('course_categories')
      .select('name_en, name_ar')
      .eq('is_active', true);

    // Build context for AI
    const courseContent = `
Course Title: ${course.name_en}
Arabic Title: ${course.name_ar || 'N/A'}
Description: ${course.description_en || 'N/A'}
Arabic Description: ${course.description_ar || 'N/A'}
Objectives: ${course.objectives || 'N/A'}
Target Audience: ${course.target_audience || 'N/A'}
Category: ${course.course_categories?.name_en || 'N/A'}
Provider: ${course.training_providers?.name_en || 'N/A'}
Provider Categories: ${(course.training_providers?.categories || []).join(', ')}
Delivery Mode: ${course.delivery_mode || 'N/A'}
Duration: ${course.duration_hours || 'N/A'} hours / ${course.duration_days || 'N/A'} days
Training Location: ${course.training_location || 'N/A'}
Languages: ${(course.delivery_languages || []).join(', ')}
Prerequisites: ${(course.prerequisites || []).join(', ')}
`.trim();

    const vocabularyContext = `
Available Competencies: ${competencies?.map(c => `${c.name_en} (${c.category})`).join(', ') || 'None'}

Available Job Roles: ${jobRoles?.map(r => `${r.name_en} (${r.job_family})`).join(', ') || 'None'}

Available Categories: ${categories?.map(c => c.name_en).join(', ') || 'None'}

Difficulty Levels: Beginner, Intermediate, Advanced, Expert

Languages: English, Arabic, French, Turkish, Italian, Spanish

Modalities: Classroom (ILT), Virtual (VILT), E-Learning, Blended, On-the-Job
`.trim();

    // Call Lovable AI for tag suggestions
    const systemPrompt = `You are an expert Learning & Development specialist tasked with auto-tagging training courses.
Analyze the course content and suggest relevant tags across these categories:

1. TOPICS: Key subject matter keywords (5-10 suggestions)
2. CATEGORIES: Training category from the available list
3. COMPETENCIES: Skills/competencies from the available competency library
4. JOB_ROLES: Target job roles from the available job catalogue
5. DIFFICULTY: Course difficulty level (Beginner/Intermediate/Advanced/Expert)
6. LANGUAGE: Languages the course is delivered in
7. MODALITY: Delivery modality

For each tag, provide:
- tag_type: one of "topic", "category", "competency", "job_role", "difficulty", "language", "modality"
- tag_value: the tag label (use exact names from vocabulary when applicable)
- confidence: a score between 0.0 and 1.0
- explanation: brief reason why this tag is relevant
- source_snippet: specific text from the course that supports this tag

IMPORTANT: 
- For controlled vocabularies (competencies, job_roles, categories), ONLY use values from the provided lists
- Be conservative with confidence scores - only use 0.8+ for very clear matches
- Provide diverse, relevant tags that will help with search and recommendations

Return ONLY a JSON array of tag objects, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${vocabularyContext}\n\n---\n\nCOURSE CONTENT:\n${courseContent}\n\nGenerate tags for this course:` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI service");
    }

    console.log("AI response received, parsing tags...");

    // Parse AI response
    let suggestedTags = [];
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestedTags = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Clear existing pending suggestions for this course
    await supabase
      .from('ai_tag_suggestions')
      .delete()
      .eq('course_id', courseId)
      .eq('status', 'pending');

    // Insert new suggestions with confidence levels
    const tagInserts = suggestedTags
      .filter((tag: any) => tag.tag_type && tag.tag_value && typeof tag.confidence === 'number')
      .map((tag: any) => {
        const tagConfig = configMap.get(tag.tag_type);
        const highThreshold = tagConfig?.high_confidence_threshold || 0.8;
        const mediumThreshold = tagConfig?.medium_confidence_threshold || 0.5;
        
        let confidenceLevel = 'low';
        if (tag.confidence >= highThreshold) confidenceLevel = 'high';
        else if (tag.confidence >= mediumThreshold) confidenceLevel = 'medium';

        return {
          course_id: courseId,
          tag_type: tag.tag_type,
          tag_value: tag.tag_value,
          confidence_score: Math.min(1, Math.max(0, tag.confidence)),
          confidence_level: confidenceLevel,
          explanation: tag.explanation || null,
          source_snippet: tag.source_snippet || null,
          model_version: MODEL_VERSION,
          status: 'pending',
        };
      });

    if (tagInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_tag_suggestions')
        .upsert(tagInserts, { 
          onConflict: 'course_id,tag_type,tag_value',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error("Error inserting suggestions:", insertError);
        throw insertError;
      }
    }

    // Log the tagging action
    await supabase.from('ai_tagging_audit_log').insert({
      action: 'ai_tagging_completed',
      entity_type: 'course',
      entity_id: courseId,
      new_value: { tags_generated: tagInserts.length, model_version: MODEL_VERSION },
    });

    console.log(`Successfully generated ${tagInserts.length} tag suggestions for course ${courseId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions_count: tagInserts.length,
      model_version: MODEL_VERSION 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-course-tags:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
