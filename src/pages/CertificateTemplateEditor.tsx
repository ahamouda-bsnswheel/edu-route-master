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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  Eye,
  CheckCircle,
  FileText,
  Palette,
  Layout,
  Loader2,
} from 'lucide-react';

interface TemplateForm {
  name: string;
  description: string;
  language: string;
  page_size: string;
  orientation: string;
  background_url: string;
  header_logo_url: string;
  footer_logo_url: string;
  signature_image_url: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  custom_css: string;
  is_default: boolean;
}

const defaultForm: TemplateForm = {
  name: '',
  description: '',
  language: 'en',
  page_size: 'A4',
  orientation: 'landscape',
  background_url: '',
  header_logo_url: '',
  footer_logo_url: '',
  signature_image_url: '',
  primary_color: '#1a365d',
  secondary_color: '#d4af37',
  font_family: 'Arial',
  custom_css: '',
  is_default: false,
};

export default function CertificateTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNew = id === 'new';
  const canManage = hasRole('l_and_d') || hasRole('admin');

  const [form, setForm] = useState<TemplateForm>(defaultForm);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch template if editing
  const { data: template, isLoading } = useQuery({
    queryKey: ['certificate-template', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && canManage,
  });

  // Populate form when template loads
  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || '',
        description: template.description || '',
        language: template.language || 'en',
        page_size: template.page_size || 'A4',
        orientation: template.orientation || 'landscape',
        background_url: template.background_url || '',
        header_logo_url: template.header_logo_url || '',
        footer_logo_url: template.footer_logo_url || '',
        signature_image_url: template.signature_image_url || '',
        primary_color: template.primary_color || '#1a365d',
        secondary_color: template.secondary_color || '#d4af37',
        font_family: template.font_family || 'Arial',
        custom_css: template.custom_css || '',
        is_default: template.is_default || false,
      });
    }
  }, [template]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TemplateForm) => {
      const payload = {
        ...data,
        created_by: user?.id,
        status: 'draft',
      };

      if (isNew) {
        const { error } = await supabase
          .from('certificate_templates')
          .insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('certificate_templates')
          .update({ ...payload, version: (template?.version || 1) + 1 })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Template Saved', description: 'Certificate template has been saved.' });
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      navigate('/certificate-admin');
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('certificate_templates')
        .update({
          status: 'approved',
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      // Log audit
      await supabase.from('certificate_audit_log').insert({
        template_id: id,
        action: 'template_approved',
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      toast({ title: 'Template Approved', description: 'The template is now available for use.' });
      queryClient.invalidateQueries({ queryKey: ['certificate-template', id] });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Generate preview
  const generatePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: {
          preview: true,
          previewData: {
            template: {
              language: form.language,
              pageSize: form.page_size,
              orientation: form.orientation,
              backgroundUrl: form.background_url,
              headerLogoUrl: form.header_logo_url,
              footerLogoUrl: form.footer_logo_url,
              signatureImageUrl: form.signature_image_url,
              primaryColor: form.primary_color,
              secondaryColor: form.secondary_color,
              fontFamily: form.font_family,
              customCss: form.custom_css,
            },
          },
        },
      });

      if (error) throw error;
      
      if (data?.html) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(data.html);
          newWindow.document.close();
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Preview Error', description: error.message });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const updateForm = (field: keyof TemplateForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!canManage) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading && !isNew) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/certificate-admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              {isNew ? 'Create Certificate Template' : 'Edit Certificate Template'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Design and configure your certificate layout
            </p>
          </div>
          {!isNew && template?.status === 'draft' && (
            <Button
              variant="outline"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Template
            </Button>
          )}
          {!isNew && template?.status === 'approved' && (
            <Badge className="bg-success text-success-foreground">Approved</Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Basic Info */}
          <Card className="card-shadow lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Template Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g., Standard Course Certificate"
                  />
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={form.language} onValueChange={(v) => updateForm('language', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="bilingual">Bilingual (EN/AR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="Describe when this template should be used..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(v) => updateForm('is_default', v)}
                />
                <Label>Set as default template</Label>
              </div>
            </CardContent>
          </Card>

          {/* Layout */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Page Size</Label>
                <Select value={form.page_size} onValueChange={(v) => updateForm('page_size', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Orientation</Label>
                <Select value={form.orientation} onValueChange={(v) => updateForm('orientation', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Font Family</Label>
                <Select value={form.font_family} onValueChange={(v) => updateForm('font_family', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Colors & Branding */}
          <Card className="card-shadow lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colors & Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => updateForm('primary_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={(e) => updateForm('primary_color', e.target.value)}
                      placeholder="#1a365d"
                    />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color (Accent)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => updateForm('secondary_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={form.secondary_color}
                      onChange={(e) => updateForm('secondary_color', e.target.value)}
                      placeholder="#d4af37"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Header Logo URL</Label>
                  <Input
                    value={form.header_logo_url}
                    onChange={(e) => updateForm('header_logo_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Signature Image URL</Label>
                  <Input
                    value={form.signature_image_url}
                    onChange={(e) => updateForm('signature_image_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <Label>Background Image URL</Label>
                <Input
                  value={form.background_url}
                  onChange={(e) => updateForm('background_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Advanced styling customization</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.custom_css}
                onChange={(e) => updateForm('custom_css', e.target.value)}
                placeholder=".title { font-size: 48px; }"
                className="font-mono text-sm h-32"
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/certificate-admin')}>
            Cancel
          </Button>
          <Button variant="outline" onClick={generatePreview} disabled={isPreviewLoading}>
            {isPreviewLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.name || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Template
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
