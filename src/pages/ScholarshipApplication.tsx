import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, Building2, MapPin, Calendar, DollarSign, 
  FileText, Upload, Save, Send, ArrowLeft, ArrowRight, Check,
  AlertCircle, Clock, User
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  useScholarshipApplication, 
  useScholarshipPrograms,
  useScholarshipDocuments,
  useScholarshipApplicationMutation,
  useSubmitScholarshipApplication
} from '@/hooks/useScholarship';

const applicationSchema = z.object({
  program_type: z.string().min(1, 'Program type is required'),
  program_name_custom: z.string().min(1, 'Program name is required'),
  institution_custom: z.string().min(1, 'Institution is required'),
  country: z.string().min(1, 'Country is required'),
  city: z.string().optional(),
  study_mode: z.string().min(1, 'Study mode is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  duration_months: z.number().min(1).optional(),
  tuition_per_year: z.number().min(0).optional(),
  tuition_total: z.number().min(0).optional(),
  living_allowance: z.number().min(0).optional(),
  travel_cost: z.number().min(0).optional(),
  visa_insurance_cost: z.number().min(0).optional(),
  currency: z.string().default('LYD'),
  funding_source: z.string().default('company_100'),
  company_percentage: z.number().min(0).max(100).default(100),
  justification: z.string().min(50, 'Justification must be at least 50 characters'),
  competency_gaps: z.string().optional(),
  target_role: z.string().optional(),
  career_path_notes: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

const PROGRAM_TYPES = [
  { value: 'degree_bsc', label: "Bachelor's Degree (BSc)" },
  { value: 'degree_msc', label: "Master's Degree (MSc)" },
  { value: 'degree_phd', label: 'Doctorate (PhD)' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'professional_certification', label: 'Professional Certification' },
  { value: 'long_term_technical', label: 'Long-term Technical Program' },
];

const STUDY_MODES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'distance', label: 'Distance Learning' },
  { value: 'blended', label: 'Blended' },
];

const FUNDING_SOURCES = [
  { value: 'company_100', label: 'Company 100%' },
  { value: 'company_partial', label: 'Company Partial' },
  { value: 'self_funded', label: 'Self-funded' },
  { value: 'external_sponsor', label: 'External Sponsor' },
];

const COUNTRIES = [
  'Libya', 'Tunisia', 'Egypt', 'Morocco', 'Algeria',
  'United Kingdom', 'United States', 'Germany', 'France', 'Canada',
  'Australia', 'Malaysia', 'Turkey', 'UAE', 'Saudi Arabia', 'Other'
];

export default function ScholarshipApplication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  const { data: existingApplication, isLoading: loadingApplication } = useScholarshipApplication(id || null);
  const { data: documents } = useScholarshipDocuments(id || null);
  const { data: programs } = useScholarshipPrograms();
  const mutation = useScholarshipApplicationMutation();
  const submitMutation = useSubmitScholarshipApplication();
  
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      program_type: '',
      program_name_custom: '',
      institution_custom: '',
      country: '',
      city: '',
      study_mode: 'full_time',
      currency: 'LYD',
      funding_source: 'company_100',
      company_percentage: 100,
      justification: '',
    },
  });
  
  useEffect(() => {
    if (existingApplication) {
      form.reset({
        program_type: existingApplication.program_type || '',
        program_name_custom: existingApplication.program_name_custom || '',
        institution_custom: existingApplication.institution_custom || '',
        country: existingApplication.country || '',
        city: existingApplication.city || '',
        study_mode: existingApplication.study_mode || 'full_time',
        start_date: existingApplication.start_date || '',
        end_date: existingApplication.end_date || '',
        duration_months: existingApplication.duration_months || undefined,
        tuition_per_year: existingApplication.tuition_per_year || undefined,
        tuition_total: existingApplication.tuition_total || undefined,
        living_allowance: existingApplication.living_allowance || undefined,
        travel_cost: existingApplication.travel_cost || undefined,
        visa_insurance_cost: existingApplication.visa_insurance_cost || undefined,
        currency: existingApplication.currency || 'LYD',
        funding_source: existingApplication.funding_source || 'company_100',
        company_percentage: existingApplication.company_percentage || 100,
        justification: existingApplication.justification || '',
        competency_gaps: existingApplication.competency_gaps || '',
        target_role: existingApplication.target_role || '',
        career_path_notes: existingApplication.career_path_notes || '',
      });
    }
  }, [existingApplication, form]);
  
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;
  
  const calculateTotalCost = () => {
    const values = form.getValues();
    return (values.tuition_total || 0) + 
           (values.living_allowance || 0) + 
           (values.travel_cost || 0) + 
           (values.visa_insurance_cost || 0);
  };
  
  const handleSaveDraft = async () => {
    const values = form.getValues();
    const totalCost = calculateTotalCost();
    
    try {
      const appId = await mutation.mutateAsync({
        ...values,
        id: id || existingApplication?.id,
        total_estimated_cost: totalCost,
      });
      
      if (!id && appId) {
        navigate(`/scholarship/apply/${appId}`, { replace: true });
      }
      toast.success('Draft saved successfully');
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleSubmit = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // First save
    const values = form.getValues();
    const totalCost = calculateTotalCost();
    
    try {
      let appId = id || existingApplication?.id;
      
      if (!appId) {
        appId = await mutation.mutateAsync({
          ...values,
          total_estimated_cost: totalCost,
        });
      } else {
        await mutation.mutateAsync({
          ...values,
          id: appId,
          total_estimated_cost: totalCost,
        });
      }
      
      // Then submit
      await submitMutation.mutateAsync(appId);
      navigate('/scholarship/my-applications');
    } catch (error) {
      // Error handled by mutations
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }
    
    const appId = id || existingApplication?.id;
    if (!appId) {
      toast.error('Please save the application first before uploading documents');
      return;
    }
    
    try {
      const filePath = `${user?.id}/${appId}/${docType}_${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('scholarship-documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      await supabase.from('scholarship_documents').insert({
        application_id: appId,
        document_type: docType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id,
      });
      
      toast.success('Document uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload document: ' + error.message);
    }
  };
  
  const isReadOnly = existingApplication && !['draft', 'returned_to_employee'].includes(existingApplication.status);
  
  if (loadingApplication && id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {id ? 'Edit Scholarship Application' : 'New Scholarship Application'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Apply for long-term programs, degrees, or scholarships
            </p>
          </div>
          {existingApplication && (
            <Badge variant={existingApplication.status === 'draft' ? 'secondary' : 'default'}>
              {existingApplication.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          )}
        </div>
        
        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span className={currentStep >= 1 ? 'text-primary font-medium' : ''}>Program Details</span>
                <span className={currentStep >= 2 ? 'text-primary font-medium' : ''}>Cost & Funding</span>
                <span className={currentStep >= 3 ? 'text-primary font-medium' : ''}>Justification</span>
                <span className={currentStep >= 4 ? 'text-primary font-medium' : ''}>Documents & Review</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Form {...form}>
          <form className="space-y-6">
            {/* Step 1: Program Details */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Program Details
                  </CardTitle>
                  <CardDescription>
                    Provide information about the program you're applying for
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="program_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select program type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROGRAM_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="study_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Study Mode *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select study mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STUDY_MODES.map(mode => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  {mode.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="program_name_custom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., MSc in Petroleum Engineering" {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="institution_custom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution / University *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Imperial College London" {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COUNTRIES.map(country => (
                                <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., London" {...field} disabled={isReadOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isReadOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isReadOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="duration_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Months)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 24" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Step 2: Cost & Funding */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cost & Funding
                  </CardTitle>
                  <CardDescription>
                    Provide estimated costs and funding details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tuition_per_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tuition Per Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tuition_total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Tuition</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="living_allowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Living Allowance (Total)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="travel_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Cost</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="visa_insurance_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visa & Insurance</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Estimated Cost:</span>
                        <span className="text-2xl font-bold text-primary">
                          {calculateTotalCost().toLocaleString()} {form.watch('currency')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LYD">LYD</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="funding_source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Funding Source</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FUNDING_SOURCES.map(source => (
                                <SelectItem key={source.value} value={source.value}>
                                  {source.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="company_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Contribution %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Step 3: Justification */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Justification & Development Rationale
                  </CardTitle>
                  <CardDescription>
                    Explain why this program is important for your development
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="justification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Justification *</FormLabel>
                        <FormDescription>
                          Explain why you want to pursue this program and how it aligns with your career goals (minimum 50 characters)
                        </FormDescription>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your motivation, career objectives, and how this program will benefit both you and the organization..."
                            className="min-h-[150px]"
                            {...field}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="competency_gaps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competency Gaps to Address</FormLabel>
                        <FormDescription>
                          What skills or knowledge gaps will this program help you address?
                        </FormDescription>
                        <FormControl>
                          <Textarea 
                            placeholder="List the specific competencies or skills you aim to develop..."
                            className="min-h-[100px]"
                            {...field}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="target_role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Role (if applicable)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Senior Engineer, Department Manager"
                              {...field}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="career_path_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Career Path Notes</FormLabel>
                        <FormDescription>
                          How does this program fit into your long-term career plan?
                        </FormDescription>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your career aspirations and how this program supports them..."
                            className="min-h-[100px]"
                            {...field}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Step 4: Documents & Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Required Documents
                    </CardTitle>
                    <CardDescription>
                      Upload the required documents (PDF, DOCX, max 20MB each)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isReadOnly && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { type: 'cv', label: 'CV / Resume', required: true },
                          { type: 'transcript', label: 'Academic Transcripts', required: true },
                          { type: 'admission_letter', label: 'Admission Letter', required: false },
                          { type: 'language_certificate', label: 'Language Certificate (IELTS/TOEFL)', required: false },
                          { type: 'recommendation', label: 'Recommendation Letters', required: false },
                          { type: 'other', label: 'Other Documents', required: false },
                        ].map(doc => (
                          <div key={doc.type} className="space-y-2">
                            <Label>
                              {doc.label} {doc.required && <span className="text-destructive">*</span>}
                            </Label>
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, doc.type)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {documents && documents.length > 0 && (
                      <div className="mt-4">
                        <Label>Uploaded Documents</Label>
                        <div className="mt-2 space-y-2">
                          {documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{doc.file_name}</span>
                                <Badge variant="outline">{doc.document_type}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Check className="h-5 w-5" />
                      Application Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-muted-foreground">Applicant</Label>
                          <p className="font-medium">{profile?.first_name_en} {profile?.last_name_en}</p>
                          <p className="text-sm text-muted-foreground">{profile?.job_title_en}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Program</Label>
                          <p className="font-medium">{form.watch('program_name_custom') || 'Not specified'}</p>
                          <p className="text-sm text-muted-foreground">{form.watch('institution_custom')}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Location</Label>
                          <p className="font-medium">{form.watch('city')}, {form.watch('country')}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-muted-foreground">Program Type</Label>
                          <p className="font-medium">
                            {PROGRAM_TYPES.find(t => t.value === form.watch('program_type'))?.label || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Duration</Label>
                          <p className="font-medium">{form.watch('duration_months') || 'Not specified'} months</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Total Estimated Cost</Label>
                          <p className="font-medium text-primary">
                            {calculateTotalCost().toLocaleString()} {form.watch('currency')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">Service Commitment</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Upon approval, you will be required to commit to a service period of approximately 
                            <strong> 3 years </strong> after completing the program, based on company policy.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex gap-2">
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={mutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                )}
                
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : !isReadOnly ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
