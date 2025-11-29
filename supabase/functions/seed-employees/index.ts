import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const testEmployees = [
  // CHRO
  {
    email: 'khaled.almaghrabi@noc.ly',
    password: '123',
    first_name_en: 'Khaled',
    last_name_en: 'Al-Maghrabi',
    first_name_ar: 'خالد',
    last_name_ar: 'المغربي',
    employee_id: 'NOC-001',
    job_title_en: 'Chief Human Resources Officer',
    job_title_ar: 'الرئيس التنفيذي للموارد البشرية',
    department_id: 'b1111111-1111-1111-1111-111111111111',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'E1',
    roles: ['chro', 'admin']
  },
  // L&D Manager
  {
    email: 'fatima.alzawiya@noc.ly',
    password: '123',
    first_name_en: 'Fatima',
    last_name_en: 'Al-Zawiya',
    first_name_ar: 'فاطمة',
    last_name_ar: 'الزاوية',
    employee_id: 'NOC-002',
    job_title_en: 'Learning & Development Manager',
    job_title_ar: 'مدير التعلم والتطوير',
    department_id: 'b1111111-1111-1111-1111-111111111111',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'M1',
    roles: ['l_and_d', 'manager']
  },
  // HRBP
  {
    email: 'omar.benghazi@noc.ly',
    password: '123',
    first_name_en: 'Omar',
    last_name_en: 'Benghazi',
    first_name_ar: 'عمر',
    last_name_ar: 'بنغازي',
    employee_id: 'NOC-003',
    job_title_en: 'HR Business Partner',
    job_title_ar: 'شريك أعمال الموارد البشرية',
    department_id: 'b1111111-1111-1111-1111-111111111111',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'M2',
    roles: ['hrbp']
  },
  // Program Manager - Engineering
  {
    email: 'ahmed.alsharif@noc.ly',
    password: '123',
    first_name_en: 'Ahmed',
    last_name_en: 'Al-Sharif',
    first_name_ar: 'أحمد',
    last_name_ar: 'الشريف',
    employee_id: 'NOC-004',
    job_title_en: 'Program Manager - Engineering',
    job_title_ar: 'مدير البرامج - الهندسة',
    department_id: 'b5555555-5555-5555-5555-555555555555',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'M1',
    roles: ['manager']
  },
  // Project Manager - Operations
  {
    email: 'mariam.tripoli@noc.ly',
    password: '123',
    first_name_en: 'Mariam',
    last_name_en: 'Tripoli',
    first_name_ar: 'مريم',
    last_name_ar: 'طرابلسي',
    employee_id: 'NOC-005',
    job_title_en: 'Project Manager - Operations',
    job_title_ar: 'مدير المشاريع - العمليات',
    department_id: 'b4444444-4444-4444-4444-444444444444',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'M2',
    roles: ['manager']
  },
  // Project Manager - IT
  {
    email: 'youssef.misrata@noc.ly',
    password: '123',
    first_name_en: 'Youssef',
    last_name_en: 'Misrata',
    first_name_ar: 'يوسف',
    last_name_ar: 'مصراتي',
    employee_id: 'NOC-006',
    job_title_en: 'Project Manager - IT',
    job_title_ar: 'مدير المشاريع - تقنية المعلومات',
    department_id: 'b2222222-2222-2222-2222-222222222222',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'M2',
    roles: ['manager']
  },
  // Senior Engineer - AGOCO
  {
    email: 'salim.agoco@noc.ly',
    password: '123',
    first_name_en: 'Salim',
    last_name_en: 'Al-Ajdabiya',
    first_name_ar: 'سالم',
    last_name_ar: 'الأجدابية',
    employee_id: 'AGOCO-001',
    job_title_en: 'Senior Petroleum Engineer',
    job_title_ar: 'مهندس بترول أول',
    department_id: 'b6666666-6666-6666-6666-666666666666',
    entity_id: 'a2222222-2222-2222-2222-222222222222',
    grade: 'P3',
    roles: ['employee']
  },
  // Drilling Engineer - Waha
  {
    email: 'nadia.waha@noc.ly',
    password: '123',
    first_name_en: 'Nadia',
    last_name_en: 'Al-Jufra',
    first_name_ar: 'نادية',
    last_name_ar: 'الجفرة',
    employee_id: 'WAHA-001',
    job_title_en: 'Drilling Engineer',
    job_title_ar: 'مهندس حفر',
    department_id: 'b8888888-8888-8888-8888-888888888888',
    entity_id: 'a3333333-3333-3333-3333-333333333333',
    grade: 'P2',
    roles: ['employee']
  },
  // HSE Officer - Sirte
  {
    email: 'ibrahim.sirte@noc.ly',
    password: '123',
    first_name_en: 'Ibrahim',
    last_name_en: 'Al-Sirte',
    first_name_ar: 'إبراهيم',
    last_name_ar: 'السرتي',
    employee_id: 'SOC-001',
    job_title_en: 'HSE Officer',
    job_title_ar: 'مسؤول الصحة والسلامة والبيئة',
    department_id: 'b9999999-9999-9999-9999-999999999999',
    entity_id: 'a4444444-4444-4444-4444-444444444444',
    grade: 'P2',
    roles: ['employee']
  },
  // Finance Analyst
  {
    email: 'layla.finance@noc.ly',
    password: '123',
    first_name_en: 'Layla',
    last_name_en: 'Al-Zawawi',
    first_name_ar: 'ليلى',
    last_name_ar: 'الزواوي',
    employee_id: 'NOC-007',
    job_title_en: 'Senior Finance Analyst',
    job_title_ar: 'محلل مالي أول',
    department_id: 'b3333333-3333-3333-3333-333333333333',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'P3',
    roles: ['employee']
  },
  // IT Specialist
  {
    email: 'tariq.it@noc.ly',
    password: '123',
    first_name_en: 'Tariq',
    last_name_en: 'Al-Gharyan',
    first_name_ar: 'طارق',
    last_name_ar: 'الغريان',
    employee_id: 'NOC-008',
    job_title_en: 'IT Systems Specialist',
    job_title_ar: 'أخصائي أنظمة تقنية المعلومات',
    department_id: 'b2222222-2222-2222-2222-222222222222',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'P2',
    roles: ['employee']
  },
  // Junior Engineer
  {
    email: 'aisha.junior@noc.ly',
    password: '123',
    first_name_en: 'Aisha',
    last_name_en: 'Al-Derna',
    first_name_ar: 'عائشة',
    last_name_ar: 'الدرنة',
    employee_id: 'NOC-009',
    job_title_en: 'Junior Process Engineer',
    job_title_ar: 'مهندس عمليات مبتدئ',
    department_id: 'b5555555-5555-5555-5555-555555555555',
    entity_id: 'a1111111-1111-1111-1111-111111111111',
    grade: 'P1',
    roles: ['employee']
  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results = []

    for (const emp of testEmployees) {
      console.log(`Creating user: ${emp.email}`)
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emp.email,
        password: emp.password,
        email_confirm: true,
        user_metadata: {
          first_name: emp.first_name_en,
          last_name: emp.last_name_en
        }
      })

      if (authError) {
        console.error(`Error creating user ${emp.email}:`, authError.message)
        results.push({ email: emp.email, status: 'error', message: authError.message })
        continue
      }

      const userId = authData.user.id

      // Update profile with employee details
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          employee_id: emp.employee_id,
          first_name_en: emp.first_name_en,
          last_name_en: emp.last_name_en,
          first_name_ar: emp.first_name_ar,
          last_name_ar: emp.last_name_ar,
          job_title_en: emp.job_title_en,
          job_title_ar: emp.job_title_ar,
          department_id: emp.department_id,
          entity_id: emp.entity_id,
          grade: emp.grade,
          phone: '+218' + Math.floor(Math.random() * 900000000 + 100000000),
          hire_date: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
        })
        .eq('id', userId)

      if (profileError) {
        console.error(`Error updating profile ${emp.email}:`, profileError.message)
      }

      // Add roles
      for (const role of emp.roles) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role })

        if (roleError && !roleError.message.includes('duplicate')) {
          console.error(`Error adding role ${role} for ${emp.email}:`, roleError.message)
        }
      }

      results.push({ email: emp.email, status: 'created', userId })
      console.log(`Successfully created: ${emp.email}`)
    }

    // Set manager relationships
    const managerUpdates = [
      // Ahmed (Program Manager) manages Aisha (Junior Engineer)
      { employee: 'aisha.junior@noc.ly', manager: 'ahmed.alsharif@noc.ly' },
      // Youssef (IT PM) manages Tariq (IT Specialist)
      { employee: 'tariq.it@noc.ly', manager: 'youssef.misrata@noc.ly' },
      // Fatima (L&D) reports to Khaled (CHRO)
      { employee: 'fatima.alzawiya@noc.ly', manager: 'khaled.almaghrabi@noc.ly' },
      // Omar (HRBP) reports to Khaled (CHRO)
      { employee: 'omar.benghazi@noc.ly', manager: 'khaled.almaghrabi@noc.ly' },
    ]

    for (const update of managerUpdates) {
      const { data: employee } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', update.employee)
        .single()

      const { data: manager } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', update.manager)
        .single()

      if (employee && manager) {
        await supabaseAdmin
          .from('profiles')
          .update({ manager_id: manager.id })
          .eq('id', employee.id)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${results.filter(r => r.status === 'created').length} employees`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Seed error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})