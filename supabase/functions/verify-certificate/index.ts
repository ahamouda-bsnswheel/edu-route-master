import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('t');

    if (!token) {
      return new Response(generateVerificationPage(null, 'Invalid verification link'), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    if (token === 'preview') {
      return new Response(generateVerificationPage({
        certificate_number: 'CERT-PREVIEW-0001',
        status: 'valid',
        course_name_en: 'Sample Training Course',
        completion_date: new Date().toISOString().split('T')[0],
        participant_name_en: 'John Doe',
        provider_name: 'National Oil Corporation',
      }, null), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    console.log('Verifying certificate with token:', token.substring(0, 8) + '...');

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('certificate_number, status, course_name_en, completion_date, participant_name_en, provider_name, expires_at')
      .eq('verification_token', token)
      .single();

    if (error || !certificate) {
      console.log('Certificate not found');
      return new Response(generateVerificationPage(null, 'Certificate not found'), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Check expiry
    let status = certificate.status;
    if (status === 'valid' && certificate.expires_at) {
      const expiryDate = new Date(certificate.expires_at);
      if (expiryDate < new Date()) {
        status = 'expired';
      }
    }

    // Log verification
    await supabase.from('certificate_audit_log').insert({
      action: 'verified',
      details: { 
        token: token.substring(0, 8) + '...', 
        certificate_number: certificate.certificate_number,
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      },
    });

    return new Response(generateVerificationPage({ ...certificate, status }, null), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });

  } catch (error: unknown) {
    console.error('Verification error:', error);
    return new Response(generateVerificationPage(null, 'Verification failed'), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});

function generateVerificationPage(certificate: any, errorMessage: string | null): string {
  const statusColors: Record<string, string> = {
    valid: '#22c55e',
    expired: '#f97316',
    revoked: '#ef4444',
  };

  const statusLabels: Record<string, string> = {
    valid: '✓ Valid Certificate',
    expired: '⚠ Expired Certificate',
    revoked: '✗ Revoked Certificate',
  };

  if (errorMessage || !certificate) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Verification</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 40px; max-width: 400px; text-align: center; }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { color: #ef4444; margin: 0 0 16px; font-size: 24px; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Verification Failed</h1>
    <p>${errorMessage || 'Unable to verify this certificate'}</p>
  </div>
</body>
</html>`;
  }

  const status = certificate.status || 'valid';
  const statusColor = statusColors[status] || statusColors.valid;
  const statusLabel = statusLabels[status] || statusLabels.valid;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Verification - ${certificate.certificate_number}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); padding: 40px; max-width: 450px; width: 100%; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin: 0 auto 16px; }
    h1 { color: #1a365d; margin: 0; font-size: 20px; }
    .status { display: inline-block; padding: 8px 20px; border-radius: 20px; background: ${statusColor}15; color: ${statusColor}; font-weight: 600; margin: 20px 0; font-size: 16px; }
    .details { border-top: 1px solid #eee; padding-top: 20px; }
    .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
    .label { color: #888; font-size: 13px; }
    .value { color: #333; font-weight: 500; text-align: right; max-width: 60%; }
    .footer { text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">NOC</div>
      <h1>Certificate Verification</h1>
    </div>
    
    <div style="text-align: center;">
      <div class="status">${statusLabel}</div>
    </div>
    
    <div class="details">
      <div class="row">
        <span class="label">Certificate ID</span>
        <span class="value">${certificate.certificate_number}</span>
      </div>
      <div class="row">
        <span class="label">Course</span>
        <span class="value">${certificate.course_name_en}</span>
      </div>
      <div class="row">
        <span class="label">Recipient</span>
        <span class="value">${certificate.participant_name_en || 'Participant'}</span>
      </div>
      <div class="row">
        <span class="label">Completion Date</span>
        <span class="value">${certificate.completion_date ? new Date(certificate.completion_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
      </div>
      <div class="row">
        <span class="label">Provider</span>
        <span class="value">${certificate.provider_name || 'National Oil Corporation'}</span>
      </div>
    </div>
    
    <div class="footer">
      Verified by National Oil Corporation Learning Management System
    </div>
  </div>
</body>
</html>`;
}
