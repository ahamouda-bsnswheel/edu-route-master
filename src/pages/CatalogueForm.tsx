import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  X,
  FileText,
  MapPin,
  DollarSign,
  Target,
  Settings,
} from 'lucide-react';
import { CompetencySelector } from '@/components/catalogue/CompetencySelector';
import { JobRoleSelector } from '@/components/catalogue/JobRoleSelector';
import { ProviderSelector } from '@/components/providers/ProviderSelector';

interface CourseFormData {
  code: string;
  name_en: string;
  name_ar: string;
  category_id: string;
  delivery_mode: string;
  duration_days: number | null;
  duration_hours: number | null;
  description_en: string;
  description_ar: string;
  objectives: string;
  target_audience: string;
  prerequisites: string[];
  delivery_languages: string[];
  training_location: string;
  abroad_country: string;
  abroad_city: string;
  local_site: string;
  provider_id: string;
  cost_amount: number | null;
  cost_currency: string;
  cost_unit_type: string;
  contracted_rate: number | null;
  cost_level: string;
  min_participants: number | null;
  max_participants: number | null;
  typical_frequency: string;
  is_mandatory: boolean;
  has_assessment: boolean;
  pass_score: number | null;
  min_attendance_percent: number | null;
  validity_months: number | null;
}

const initialFormData: CourseFormData = {
  code: '',
  name_en: '',
  name_ar: '',
  category_id: '',
  delivery_mode: 'classroom',
  duration_days: null,
  duration_hours: null,
  description_en: '',
  description_ar: '',
  objectives: '',
  target_audience: '',
  prerequisites: [],
  delivery_languages: ['en'],
  training_location: 'local',
  abroad_country: '',
  abroad_city: '',
  local_site: '',
  provider_id: '',
  cost_amount: null,
  cost_currency: 'LYD',
  cost_unit_type: 'per_participant',
  contracted_rate: null,
  cost_level: '',
  min_participants: 1,
  max_participants: null,
  typical_frequency: '',
  is_mandatory: false,
  has_assessment: false,
  pass_score: null,
  min_attendance_percent: 80,
  validity_months: null,
};

export default function CatalogueForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== 'new';

  const [formData, setFormData] = useState<CourseFormData>(initialFormData);
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>([]);

  // Fetch existing course if editing
  const { data: existingCourse, isLoading: courseLoading } = useQuery({
    queryKey: ['catalogue-course', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['course-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  // Fetch providers
  const { data: providers } = useQuery({
    queryKey: ['training-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_providers')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  // Fetch training sites
  const { data: sites } = useQuery({
    queryKey: ['training-sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sites')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing competency mappings if editing
  const { data: existingCompetencies } = useQuery({
    queryKey: ['course-competencies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_competencies')
        .select('competency_id')
        .eq('course_id', id);

      if (error) throw error;
      return data?.map(c => c.competency_id) || [];
    },
    enabled: isEditing,
  });

  // Fetch existing job role mappings if editing
  const { data: existingJobRoles } = useQuery({
    queryKey: ['course-job-roles', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_job_roles')
        .select('job_role_id')
        .eq('course_id', id);

      if (error) throw error;
      return data?.map(j => j.job_role_id) || [];
    },
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingCourse) {
      setFormData({
        code: existingCourse.code || '',
        name_en: existingCourse.name_en || '',
        name_ar: existingCourse.name_ar || '',
        category_id: existingCourse.category_id || '',
        delivery_mode: existingCourse.delivery_mode || 'classroom',
        duration_days: existingCourse.duration_days,
        duration_hours: existingCourse.duration_hours,
        description_en: existingCourse.description_en || '',
        description_ar: existingCourse.description_ar || '',
        objectives: existingCourse.objectives || '',
        target_audience: existingCourse.target_audience || '',
        prerequisites: existingCourse.prerequisites || [],
        delivery_languages: existingCourse.delivery_languages || ['en'],
        training_location: existingCourse.training_location || 'local',
        abroad_country: existingCourse.abroad_country || '',
        abroad_city: existingCourse.abroad_city || '',
        local_site: existingCourse.local_site || '',
        provider_id: existingCourse.provider_id || '',
        cost_amount: existingCourse.cost_amount,
        cost_currency: existingCourse.cost_currency || 'LYD',
        cost_unit_type: existingCourse.cost_unit_type || 'per_participant',
        contracted_rate: existingCourse.contracted_rate,
        cost_level: existingCourse.cost_level || '',
        min_participants: existingCourse.min_participants,
        max_participants: existingCourse.max_participants,
        typical_frequency: existingCourse.typical_frequency || '',
        is_mandatory: existingCourse.is_mandatory || false,
        has_assessment: existingCourse.has_assessment || false,
        pass_score: existingCourse.pass_score,
        min_attendance_percent: existingCourse.min_attendance_percent || 80,
        validity_months: existingCourse.validity_months,
      });
    }
  }, [existingCourse]);

  useEffect(() => {
    if (existingCompetencies) {
      setSelectedCompetencies(existingCompetencies);
    }
  }, [existingCompetencies]);

  useEffect(() => {
    if (existingJobRoles) {
      setSelectedJobRoles(existingJobRoles);
    }
  }, [existingJobRoles]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (submitForApproval: boolean) => {
      // Convert empty strings to null for UUID and optional fields
      const courseData = {
        code: formData.code || null,
        name_en: formData.name_en,
        name_ar: formData.name_ar || null,
        category_id: formData.category_id || null,
        delivery_mode: formData.delivery_mode as 'classroom' | 'online' | 'blended' | 'on_the_job',
        duration_days: formData.duration_days,
        duration_hours: formData.duration_hours,
        description_en: formData.description_en || null,
        description_ar: formData.description_ar || null,
        objectives: formData.objectives || null,
        target_audience: formData.target_audience || null,
        prerequisites: formData.prerequisites.length > 0 ? formData.prerequisites : null,
        delivery_languages: formData.delivery_languages,
        training_location: (formData.training_location || null) as 'local' | 'abroad' | null,
        abroad_country: formData.abroad_country || null,
        abroad_city: formData.abroad_city || null,
        local_site: formData.local_site || null,
        provider_id: formData.provider_id || null,
        cost_amount: formData.cost_amount,
        cost_currency: formData.cost_currency || 'LYD',
        cost_unit_type: (formData.cost_unit_type || null) as 'per_participant' | 'per_session' | null,
        contracted_rate: formData.contracted_rate,
        cost_level: (formData.cost_level || null) as 'low' | 'medium' | 'high' | null,
        min_participants: formData.min_participants,
        max_participants: formData.max_participants,
        typical_frequency: formData.typical_frequency || null,
        is_mandatory: formData.is_mandatory,
        has_assessment: formData.has_assessment,
        pass_score: formData.pass_score,
        min_attendance_percent: formData.min_attendance_percent,
        validity_months: formData.validity_months,
        catalogue_status: (submitForApproval ? 'pending_approval' : 'draft') as 'draft' | 'pending_approval' | 'active' | 'retired',
        submitted_by: submitForApproval ? user?.id : null,
        submitted_at: submitForApproval ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      let courseId = id;

      if (isEditing) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData)
          .select('id')
          .single();

        if (error) throw error;
        courseId = data.id;
      }

      // Update competency mappings
      if (courseId) {
        // Delete existing mappings
        await supabase
          .from('course_competencies')
          .delete()
          .eq('course_id', courseId);

        // Insert new mappings
        if (selectedCompetencies.length > 0) {
          await supabase
            .from('course_competencies')
            .insert(
              selectedCompetencies.map(competencyId => ({
                course_id: courseId,
                competency_id: competencyId,
              }))
            );
        }

        // Delete existing job role mappings
        await supabase
          .from('course_job_roles')
          .delete()
          .eq('course_id', courseId);

        // Insert new job role mappings
        if (selectedJobRoles.length > 0) {
          await supabase
            .from('course_job_roles')
            .insert(
              selectedJobRoles.map(jobRoleId => ({
                course_id: courseId,
                job_role_id: jobRoleId,
              }))
            );
        }

        // Log audit
        await supabase.from('catalogue_audit_log').insert({
          course_id: courseId,
          action: isEditing ? 'update' : 'create',
          actor_id: user?.id,
        });
      }

      return courseId;
    },
    onSuccess: (courseId) => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-courses'] });
      toast.success(isEditing ? 'Course updated' : 'Course created');
      navigate(`/catalogue/${courseId}`);
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Failed to save course');
    },
  });

  const handleAddPrerequisite = () => {
    if (newPrerequisite.trim()) {
      setFormData(prev => ({
        ...prev,
        prerequisites: [...prev.prerequisites, newPrerequisite.trim()],
      }));
      setNewPrerequisite('');
    }
  };

  const handleRemovePrerequisite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.filter((_, i) => i !== index),
    }));
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      delivery_languages: prev.delivery_languages.includes(lang)
        ? prev.delivery_languages.filter(l => l !== lang)
        : [...prev.delivery_languages, lang],
    }));
  };

  if (courseLoading) {
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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/catalogue')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing ? 'Edit Course/Program' : 'New Course/Program'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Update catalogue item details' : 'Add a new item to the learning catalogue'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button
              onClick={() => saveMutation.mutate(true)}
              disabled={saveMutation.isPending || !formData.name_en || !formData.category_id}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </Button>
          </div>
        </div>

        {/* Form Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="location" className="gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </TabsTrigger>
            <TabsTrigger value="cost" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Cost & Provider
            </TabsTrigger>
            <TabsTrigger value="competencies" className="gap-2">
              <Target className="h-4 w-4" />
              Competencies
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Core details about the course or program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Course Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="e.g., HSE-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_en">Title (English) *</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                      placeholder="Course title in English"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">Title (Arabic)</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                      placeholder="عنوان الدورة بالعربية"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description_en">Description (English)</Label>
                    <Textarea
                      id="description_en"
                      value={formData.description_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                      placeholder="Course description..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_ar">Description (Arabic)</Label>
                    <Textarea
                      id="description_ar"
                      value={formData.description_ar}
                      onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                      placeholder="وصف الدورة..."
                      dir="rtl"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Learning Objectives</Label>
                  <Textarea
                    id="objectives"
                    value={formData.objectives}
                    onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
                    placeholder="List the key learning objectives..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Textarea
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                    placeholder="Who is this course designed for?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prerequisites</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPrerequisite}
                      onChange={(e) => setNewPrerequisite(e.target.value)}
                      placeholder="Add a prerequisite"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPrerequisite()}
                    />
                    <Button type="button" onClick={handleAddPrerequisite} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.prerequisites.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.prerequisites.map((prereq, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {prereq}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemovePrerequisite(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Delivery Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Delivery Mode *</Label>
                    <Select
                      value={formData.delivery_mode}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_mode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classroom">Classroom (ILT)</SelectItem>
                        <SelectItem value="vilt">Virtual ILT</SelectItem>
                        <SelectItem value="online">e-Learning</SelectItem>
                        <SelectItem value="blended">Blended</SelectItem>
                        <SelectItem value="on_the_job">On-the-Job (OJT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_days">Duration (Days)</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      value={formData.duration_days || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_days: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_hours">Duration (Hours)</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      value={formData.duration_hours || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g., 40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Delivery Languages</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.delivery_languages.includes('en')}
                        onCheckedChange={() => toggleLanguage('en')}
                      />
                      <span>English</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.delivery_languages.includes('ar')}
                        onCheckedChange={() => toggleLanguage('ar')}
                      />
                      <span>Arabic</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Training Location</CardTitle>
                <CardDescription>
                  Specify where this training typically takes place
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Location Type</Label>
                  <Select
                    value={formData.training_location}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, training_location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local (Libya)</SelectItem>
                      <SelectItem value="abroad">Abroad (International)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.training_location === 'abroad' && (
                  <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="abroad_country">Country</Label>
                      <Input
                        id="abroad_country"
                        value={formData.abroad_country}
                        onChange={(e) => setFormData(prev => ({ ...prev, abroad_country: e.target.value }))}
                        placeholder="e.g., United Kingdom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="abroad_city">City</Label>
                      <Input
                        id="abroad_city"
                        value={formData.abroad_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, abroad_city: e.target.value }))}
                        placeholder="e.g., London"
                      />
                    </div>
                  </div>
                )}

                {formData.training_location === 'local' && (
                  <div className="space-y-2">
                    <Label>Site / Location</Label>
                    <Select
                      value={formData.local_site}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, local_site: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites?.map((site) => (
                          <SelectItem key={site.id} value={site.code}>
                            {site.name_en}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_participants">Min Participants</Label>
                    <Input
                      id="min_participants"
                      type="number"
                      value={formData.min_participants || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_participants: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Max Participants</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      value={formData.max_participants || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_participants: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g., 20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="typical_frequency">Typical Frequency</Label>
                    <Input
                      id="typical_frequency"
                      value={formData.typical_frequency}
                      onChange={(e) => setFormData(prev => ({ ...prev, typical_frequency: e.target.value }))}
                      placeholder="e.g., 2-3 times per year"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost & Provider Tab */}
          <TabsContent value="cost" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Training Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <ProviderSelector
                    value={formData.provider_id || null}
                    onChange={(providerId) => setFormData(prev => ({ ...prev, provider_id: providerId || '' }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select from active providers in the registry. Only approved providers are shown.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Cost information (visible only to L&D, HRBP, Finance, and senior HR roles)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_amount">Standard Cost</Label>
                    <Input
                      id="cost_amount"
                      type="number"
                      value={formData.cost_amount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_amount: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="e.g., 5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.cost_currency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cost_currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LYD">LYD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Unit Type</Label>
                    <Select
                      value={formData.cost_unit_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cost_unit_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_participant">Per Participant</SelectItem>
                        <SelectItem value="per_session">Per Session</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contracted_rate">Contracted Rate (NOC)</Label>
                    <Input
                      id="contracted_rate"
                      type="number"
                      value={formData.contracted_rate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, contracted_rate: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="Optional negotiated rate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Level (for ESS/MSS display)</Label>
                    <Select
                      value={formData.cost_level}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cost_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competencies Tab */}
          <TabsContent value="competencies" className="space-y-4">
            <CompetencySelector
              selectedCompetencies={selectedCompetencies}
              onSelectionChange={setSelectedCompetencies}
            />

            <JobRoleSelector
              selectedRoles={selectedJobRoles}
              onSelectionChange={setSelectedJobRoles}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Compliance Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mandatory Training</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark this as a mandatory/required course
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_mandatory: checked }))}
                  />
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validity_months">Certificate Validity (Months)</Label>
                    <Input
                      id="validity_months"
                      type="number"
                      value={formData.validity_months || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, validity_months: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g., 12 (leave empty for no expiry)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_attendance_percent">Min Attendance %</Label>
                    <Input
                      id="min_attendance_percent"
                      type="number"
                      value={formData.min_attendance_percent || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_attendance_percent: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g., 80"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Assessment Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Has Assessment</Label>
                    <p className="text-sm text-muted-foreground">
                      Course requires an assessment for completion
                    </p>
                  </div>
                  <Switch
                    checked={formData.has_assessment}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_assessment: checked }))}
                  />
                </div>

                {formData.has_assessment && (
                  <div className="space-y-2">
                    <Label htmlFor="pass_score">Pass Score (%)</Label>
                    <Input
                      id="pass_score"
                      type="number"
                      value={formData.pass_score || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, pass_score: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g., 70"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
