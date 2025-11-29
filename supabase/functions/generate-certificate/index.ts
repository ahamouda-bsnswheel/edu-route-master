import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { enrollmentId } = await req.json();

    if (!enrollmentId) {
      return new Response(
        JSON.stringify({ error: 'Enrollment ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating certificate for enrollment:', enrollmentId);

    // Fetch enrollment with related data
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('session_enrollments')
      .select(`
        *,
        session:sessions(
          *,
          course:courses(*)
        )
      `)
      .eq('id', enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('Enrollment not found:', enrollmentError);
      return new Response(
        JSON.stringify({ error: 'Enrollment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify completion
    if (enrollment.completion_status !== 'completed' || !enrollment.passed) {
      return new Response(
        JSON.stringify({ error: 'Certificate can only be generated for completed and passed enrollments' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch participant profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', enrollment.participant_id)
      .single();

    if (profileError) {
      console.error('Profile not found:', profileError);
    }

    const participantName = profile 
      ? `${profile.first_name_en || ''} ${profile.last_name_en || ''}`.trim() || 'Participant'
      : 'Participant';

    const courseName = enrollment.session?.course?.name_en || 'Training Course';
    const completionDate = enrollment.completion_date 
      ? new Date(enrollment.completion_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

    const sessionLocation = enrollment.session?.location_en || 'Training Center';
    const providerName = 'National Oil Corporation';
    const certificateId = `CERT-${enrollmentId.slice(0, 8).toUpperCase()}`;

    // Generate HTML certificate
    const certificateHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate of Completion</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Open Sans', sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .certificate {
      width: 800px;
      height: 600px;
      background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
      padding: 30px;
      position: relative;
    }
    
    .certificate-inner {
      width: 100%;
      height: 100%;
      background: white;
      border: 3px solid #d4af37;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      position: relative;
    }
    
    .certificate-inner::before {
      content: '';
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 1px solid #d4af37;
      pointer-events: none;
    }
    
    .header {
      text-align: center;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
      border-radius: 50%;
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 36px;
      font-weight: bold;
    }
    
    .title {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      color: #1a365d;
      text-transform: uppercase;
      letter-spacing: 4px;
      margin-bottom: 5px;
    }
    
    .subtitle {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .content {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .presented-to {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }
    
    .recipient-name {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      color: #1a365d;
      border-bottom: 2px solid #d4af37;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .description {
      font-size: 14px;
      color: #444;
      line-height: 1.6;
      max-width: 500px;
      margin: 0 auto;
    }
    
    .course-name {
      font-weight: 600;
      color: #1a365d;
    }
    
    .footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .signature-block {
      text-align: center;
      width: 200px;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 5px;
      font-size: 11px;
      color: #666;
    }
    
    .signature-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 2px;
    }
    
    .date-block {
      text-align: center;
    }
    
    .date-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .date-value {
      font-size: 14px;
      color: #333;
      font-weight: 600;
    }
    
    .certificate-id {
      position: absolute;
      bottom: 15px;
      right: 20px;
      font-size: 10px;
      color: #999;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .certificate {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="certificate-inner">
      <div class="header">
        <div class="logo">NOC</div>
        <h1 class="title">Certificate</h1>
        <p class="subtitle">of Completion</p>
      </div>
      
      <div class="content">
        <p class="presented-to">This is to certify that</p>
        <h2 class="recipient-name">${participantName}</h2>
        <p class="description">
          has successfully completed the training program<br>
          <span class="course-name">${courseName}</span><br>
          held at ${sessionLocation}
        </p>
      </div>
      
      <div class="footer">
        <div class="signature-block">
          <p class="signature-name">Training Director</p>
          <div class="signature-line">${providerName}</div>
        </div>
        
        <div class="date-block">
          <p class="date-label">Date of Completion</p>
          <p class="date-value">${completionDate}</p>
        </div>
        
        <div class="signature-block">
          <p class="signature-name">L&D Manager</p>
          <div class="signature-line">Learning & Development</div>
        </div>
      </div>
      
      <p class="certificate-id">${certificateId}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Update enrollment with certificate info
    const { error: updateError } = await supabase
      .from('session_enrollments')
      .update({
        certificate_generated_at: new Date().toISOString(),
        certificate_url: `data:text/html;base64,${btoa(unescape(encodeURIComponent(certificateHtml)))}`,
      })
      .eq('id', enrollmentId);

    if (updateError) {
      console.error('Failed to update enrollment:', updateError);
    }

    console.log('Certificate generated successfully for:', participantName);

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificateId,
          participantName,
          courseName,
          completionDate,
          html: certificateHtml,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
