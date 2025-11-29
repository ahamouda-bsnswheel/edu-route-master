import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateData {
  participantNameEn: string;
  participantNameAr?: string;
  employeeId?: string;
  courseNameEn: string;
  courseNameAr?: string;
  sessionStartDate: string;
  sessionEndDate: string;
  completionDate: string;
  durationHours?: number;
  cpdHours?: number;
  providerName: string;
  trainerName?: string;
  assessmentScore?: number;
  certificateNumber: string;
  verificationToken: string;
  verificationUrl: string;
}

interface TemplateConfig {
  language: string;
  pageSize: string;
  orientation: string;
  backgroundUrl?: string;
  headerLogoUrl?: string;
  footerLogoUrl?: string;
  signatureImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  customCss?: string;
}

function generateCertificateHTML(data: CertificateData, template: TemplateConfig): string {
  const isArabic = template.language === 'ar';
  const isBilingual = template.language === 'bilingual';
  const direction = isArabic ? 'rtl' : 'ltr';
  
  const participantName = isBilingual 
    ? `${data.participantNameEn}${data.participantNameAr ? ` / ${data.participantNameAr}` : ''}`
    : (isArabic && data.participantNameAr) ? data.participantNameAr : data.participantNameEn;
    
  const courseName = isBilingual 
    ? `${data.courseNameEn}${data.courseNameAr ? `<br/><span class="ar">${data.courseNameAr}</span>` : ''}`
    : (isArabic && data.courseNameAr) ? data.courseNameAr : data.courseNameEn;

  const completionText = isArabic ? 'أتم بنجاح' : 'Has successfully completed';
  const dateLabel = isArabic ? 'تاريخ الإنجاز' : 'Date of Completion';
  const certificateTitle = isArabic ? 'شهادة إتمام' : 'Certificate of Completion';
  const verifyText = isArabic ? 'للتحقق' : 'Verify at';

  return `
<!DOCTYPE html>
<html dir="${direction}">
<head>
  <meta charset="UTF-8">
  <title>${certificateTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page {
      size: ${template.pageSize} ${template.orientation};
      margin: 0;
    }
    
    body {
      font-family: '${template.fontFamily}', 'Open Sans', 'Noto Naskh Arabic', sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      direction: ${direction};
    }
    
    .certificate {
      width: ${template.orientation === 'landscape' ? '1056px' : '816px'};
      height: ${template.orientation === 'landscape' ? '816px' : '1056px'};
      background: ${template.backgroundUrl ? `url('${template.backgroundUrl}') center/cover` : `linear-gradient(135deg, ${template.primaryColor} 0%, ${template.primaryColor}dd 100%)`};
      padding: 40px;
      position: relative;
    }
    
    .certificate-inner {
      width: 100%;
      height: 100%;
      background: white;
      border: 4px solid ${template.secondaryColor};
      padding: 50px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      position: relative;
    }
    
    .certificate-inner::before {
      content: '';
      position: absolute;
      top: 12px; left: 12px; right: 12px; bottom: 12px;
      border: 2px solid ${template.secondaryColor};
      pointer-events: none;
    }
    
    .header { text-align: center; }
    
    .logo {
      width: 100px;
      height: 100px;
      background: ${template.headerLogoUrl ? `url('${template.headerLogoUrl}') center/contain no-repeat` : `linear-gradient(135deg, ${template.primaryColor} 0%, ${template.primaryColor}dd 100%)`};
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 42px;
      font-weight: bold;
    }
    
    .title {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      color: ${template.primaryColor};
      text-transform: uppercase;
      letter-spacing: 6px;
      margin-bottom: 8px;
    }
    
    .subtitle {
      font-size: 16px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    
    .content {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 20px 0;
    }
    
    .presented-to {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 15px;
    }
    
    .recipient-name {
      font-family: 'Playfair Display', serif;
      font-size: 48px;
      color: ${template.primaryColor};
      border-bottom: 3px solid ${template.secondaryColor};
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: inline-block;
    }
    
    .description {
      font-size: 16px;
      color: #444;
      line-height: 1.8;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .course-name {
      font-weight: 700;
      color: ${template.primaryColor};
      font-size: 20px;
    }
    
    .ar { font-family: 'Noto Naskh Arabic', serif; direction: rtl; }
    
    .details {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    
    .detail-item {
      text-align: center;
    }
    
    .detail-label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .detail-value {
      font-size: 14px;
      color: #333;
      font-weight: 600;
      margin-top: 4px;
    }
    
    .footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 30px;
    }
    
    .signature-block {
      text-align: center;
      width: 200px;
    }
    
    .signature-image {
      height: 50px;
      margin-bottom: 8px;
    }
    
    .signature-line {
      border-top: 2px solid #333;
      padding-top: 8px;
      font-size: 12px;
      color: #666;
    }
    
    .signature-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 3px;
    }
    
    .date-block { text-align: center; }
    
    .date-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .date-value {
      font-size: 16px;
      color: #333;
      font-weight: 600;
      margin-top: 4px;
    }
    
    .certificate-id {
      position: absolute;
      bottom: 20px;
      right: 25px;
      font-size: 10px;
      color: #999;
    }
    
    .qr-section {
      position: absolute;
      bottom: 20px;
      left: 25px;
      text-align: center;
    }
    
    .qr-code {
      width: 60px;
      height: 60px;
      background: #f0f0f0;
      margin-bottom: 4px;
    }
    
    .verify-text {
      font-size: 8px;
      color: #999;
    }
    
    ${template.customCss || ''}
    
    @media print {
      body { background: white; padding: 0; }
      .certificate { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="certificate-inner">
      <div class="header">
        <div class="logo">${template.headerLogoUrl ? '' : 'NOC'}</div>
        <h1 class="title">${certificateTitle.split(' ')[0]}</h1>
        <p class="subtitle">${certificateTitle.split(' ').slice(1).join(' ')}</p>
      </div>
      
      <div class="content">
        <p class="presented-to">${completionText}</p>
        <h2 class="recipient-name">${participantName}</h2>
        <p class="description">
          ${isArabic ? 'برنامج التدريب' : 'the training program'}<br/>
          <span class="course-name">${courseName}</span><br/>
          ${data.providerName ? `${isArabic ? 'مقدم من' : 'provided by'} ${data.providerName}` : ''}
        </p>
        
        <div class="details">
          ${data.durationHours ? `
          <div class="detail-item">
            <div class="detail-label">${isArabic ? 'المدة' : 'Duration'}</div>
            <div class="detail-value">${data.durationHours} ${isArabic ? 'ساعة' : 'hours'}</div>
          </div>` : ''}
          ${data.cpdHours ? `
          <div class="detail-item">
            <div class="detail-label">CPD Hours</div>
            <div class="detail-value">${data.cpdHours}</div>
          </div>` : ''}
          ${data.assessmentScore ? `
          <div class="detail-item">
            <div class="detail-label">${isArabic ? 'النتيجة' : 'Score'}</div>
            <div class="detail-value">${data.assessmentScore}%</div>
          </div>` : ''}
        </div>
      </div>
      
      <div class="footer">
        <div class="signature-block">
          ${template.signatureImageUrl ? `<img src="${template.signatureImageUrl}" class="signature-image" />` : ''}
          <p class="signature-name">${isArabic ? 'مدير التدريب' : 'Training Director'}</p>
          <div class="signature-line">${data.providerName}</div>
        </div>
        
        <div class="date-block">
          <p class="date-label">${dateLabel}</p>
          <p class="date-value">${data.completionDate}</p>
        </div>
        
        <div class="signature-block">
          <p class="signature-name">${isArabic ? 'مدير التطوير والتعلم' : 'L&D Manager'}</p>
          <div class="signature-line">${isArabic ? 'قسم التعلم والتطوير' : 'Learning & Development'}</div>
        </div>
      </div>
      
      <div class="qr-section">
        <div class="qr-code"></div>
        <p class="verify-text">${verifyText}: ${data.verificationUrl}</p>
      </div>
      
      <p class="certificate-id">${data.certificateNumber}</p>
    </div>
  </div>
</body>
</html>`.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { enrollmentId, templateId, preview, previewData } = await req.json();

    // Handle preview mode
    if (preview && previewData) {
      console.log('Generating preview certificate');
      const template: TemplateConfig = previewData.template || {
        language: 'en',
        pageSize: 'A4',
        orientation: 'landscape',
        primaryColor: '#1a365d',
        secondaryColor: '#d4af37',
        fontFamily: 'Arial',
      };
      
      const data: CertificateData = {
        participantNameEn: previewData.participantName || 'John Doe',
        participantNameAr: previewData.participantNameAr || 'محمد أحمد',
        employeeId: previewData.employeeId || 'EMP-001',
        courseNameEn: previewData.courseName || 'Sample Training Course',
        courseNameAr: previewData.courseNameAr || 'دورة تدريبية نموذجية',
        sessionStartDate: previewData.startDate || new Date().toISOString().split('T')[0],
        sessionEndDate: previewData.endDate || new Date().toISOString().split('T')[0],
        completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        durationHours: previewData.durationHours || 16,
        cpdHours: previewData.cpdHours,
        providerName: previewData.providerName || 'National Oil Corporation',
        trainerName: previewData.trainerName,
        assessmentScore: previewData.score,
        certificateNumber: 'CERT-PREVIEW-0001',
        verificationToken: 'preview-token',
        verificationUrl: `${supabaseUrl}/functions/v1/verify-certificate?t=preview`,
      };
      
      const html = generateCertificateHTML(data, template);
      return new Response(JSON.stringify({ success: true, html }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
          course:courses(*, provider:training_providers(*), category:course_categories(*))
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

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('status', 'valid')
      .maybeSingle();

    if (existingCert) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          certificate: existingCert,
          message: 'Certificate already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch participant profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', enrollment.participant_id)
      .single();

    // Get template
    let template: TemplateConfig = {
      language: 'en',
      pageSize: 'A4',
      orientation: 'landscape',
      primaryColor: '#1a365d',
      secondaryColor: '#d4af37',
      fontFamily: 'Arial',
    };
    let templateRecord = null;

    if (templateId) {
      const { data: tpl } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (tpl) templateRecord = tpl;
    } else {
      // Find template by course > category > default
      const { data: courseAssignment } = await supabase
        .from('course_certificate_templates')
        .select('template:certificate_templates(*)')
        .eq('course_id', enrollment.session?.course?.id)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (courseAssignment?.template) {
        templateRecord = courseAssignment.template;
      } else if (enrollment.session?.course?.category_id) {
        const { data: categoryAssignment } = await supabase
          .from('course_certificate_templates')
          .select('template:certificate_templates(*)')
          .eq('category_id', enrollment.session?.course?.category_id)
          .order('priority', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (categoryAssignment?.template) {
          templateRecord = categoryAssignment.template;
        }
      }

      if (!templateRecord) {
        const { data: defaultTemplate } = await supabase
          .from('certificate_templates')
          .select('*')
          .eq('is_default', true)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle();
        if (defaultTemplate) templateRecord = defaultTemplate;
      }
    }

    if (templateRecord) {
      template = {
        language: templateRecord.language || 'en',
        pageSize: templateRecord.page_size || 'A4',
        orientation: templateRecord.orientation || 'landscape',
        backgroundUrl: templateRecord.background_url,
        headerLogoUrl: templateRecord.header_logo_url,
        footerLogoUrl: templateRecord.footer_logo_url,
        signatureImageUrl: templateRecord.signature_image_url,
        primaryColor: templateRecord.primary_color || '#1a365d',
        secondaryColor: templateRecord.secondary_color || '#d4af37',
        fontFamily: templateRecord.font_family || 'Arial',
        customCss: templateRecord.custom_css,
      };
    }

    const participantName = profile 
      ? `${profile.first_name_en || ''} ${profile.last_name_en || ''}`.trim() || 'Participant'
      : 'Participant';

    const course = enrollment.session?.course;
    const completionDate = enrollment.completion_date 
      ? new Date(enrollment.completion_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Calculate expiry if course has validity
    let expiresAt = null;
    if (course?.validity_months) {
      const expiry = new Date(enrollment.completion_date || new Date());
      expiry.setMonth(expiry.getMonth() + course.validity_months);
      expiresAt = expiry.toISOString();
    }

    // Create certificate record first to get number and token
    const { data: newCert, error: certError } = await supabase
      .from('certificates')
      .insert({
        employee_id: enrollment.participant_id,
        enrollment_id: enrollmentId,
        session_id: enrollment.session_id,
        course_id: course?.id,
        template_id: templateRecord?.id,
        template_version: templateRecord?.version,
        participant_name_en: profile?.first_name_en ? `${profile.first_name_en} ${profile.last_name_en}` : null,
        participant_name_ar: profile?.first_name_ar ? `${profile.first_name_ar} ${profile.last_name_ar}` : null,
        participant_employee_id: profile?.employee_id,
        course_name_en: course?.name_en,
        course_name_ar: course?.name_ar,
        session_start_date: enrollment.session?.start_date,
        session_end_date: enrollment.session?.end_date,
        completion_date: enrollment.completion_date ? enrollment.completion_date.split('T')[0] : new Date().toISOString().split('T')[0],
        duration_hours: course?.duration_hours,
        cpd_hours: course?.duration_hours, // Using duration as CPD for now
        provider_name: course?.provider?.name_en || 'National Oil Corporation',
        trainer_name: enrollment.session?.instructor_name,
        assessment_score: enrollment.assessment_score,
        expires_at: expiresAt,
        status: 'valid',
      })
      .select()
      .single();

    if (certError) {
      console.error('Failed to create certificate record:', certError);
      throw certError;
    }

    // Generate HTML
    const certData: CertificateData = {
      participantNameEn: participantName,
      participantNameAr: profile?.first_name_ar ? `${profile.first_name_ar} ${profile.last_name_ar}` : undefined,
      employeeId: profile?.employee_id || undefined,
      courseNameEn: course?.name_en || 'Training Course',
      courseNameAr: course?.name_ar || undefined,
      sessionStartDate: enrollment.session?.start_date,
      sessionEndDate: enrollment.session?.end_date,
      completionDate,
      durationHours: course?.duration_hours,
      cpdHours: course?.duration_hours,
      providerName: course?.provider?.name_en || 'National Oil Corporation',
      trainerName: enrollment.session?.instructor_name,
      assessmentScore: enrollment.assessment_score,
      certificateNumber: newCert.certificate_number,
      verificationToken: newCert.verification_token,
      verificationUrl: `${supabaseUrl}/functions/v1/verify-certificate?t=${newCert.verification_token}`,
    };

    const html = generateCertificateHTML(certData, template);
    const pdfUrl = `data:text/html;base64,${btoa(unescape(encodeURIComponent(html)))}`;

    // Update certificate with PDF URL
    await supabase
      .from('certificates')
      .update({ pdf_url: pdfUrl })
      .eq('id', newCert.id);

    // Update enrollment
    await supabase
      .from('session_enrollments')
      .update({
        certificate_generated_at: new Date().toISOString(),
        certificate_url: pdfUrl,
      })
      .eq('id', enrollmentId);

    // Log audit
    await supabase.from('certificate_audit_log').insert({
      certificate_id: newCert.id,
      template_id: templateRecord?.id,
      action: 'generated',
      details: { enrollmentId, templateVersion: templateRecord?.version },
    });

    console.log('Certificate generated successfully:', newCert.certificate_number);

    return new Response(
      JSON.stringify({
        success: true,
        certificate: { ...newCert, pdf_url: pdfUrl },
        html,
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
