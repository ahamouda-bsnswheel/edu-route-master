import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  Clock,
  MapPin,
  Users,
  Calendar,
  Building,
  Monitor,
  Globe,
  CheckCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  Target,
  Briefcase,
  History,
  Send,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AITaggingPanel } from '@/components/catalogue/AITaggingPanel';

type CatalogueStatus = 'draft' | 'pending_approval' | 'active' | 'retired';

const statusConfig: Record<CatalogueStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'bg-warning/10 text-warning', icon: Clock },
  active: { label: 'Active', color: 'bg-success/10 text-success', icon: CheckCircle },
  retired: { label: 'Retired', color: 'bg-destructive/10 text-destructive', icon: XCircle },
};

export default function CatalogueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = hasRole('l_and_d') || hasRole('admin');
  const canApprove = hasRole('l_and_d') || hasRole('admin') || hasRole('chro');
  const canViewCost = hasRole('l_and_d') || hasRole('admin') || hasRole('hrbp') || hasRole('chro');

  // Fetch course details
  const { data: course, isLoading } = useQuery({
    queryKey: ['catalogue-course', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          category:course_categories(id, name_en, name_ar, description_en),
          provider:training_providers(id, name_en, name_ar, country, city, website, contact_email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch competencies linked to this course
  const { data: competencies } = useQuery({
    queryKey: ['course-competencies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_competencies')
        .select(`
          *,
          competency:competencies(id, code, name_en, name_ar, category)
        `)
        .eq('course_id', id);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch job roles linked to this course
  const { data: jobRoles } = useQuery({
    queryKey: ['course-job-roles', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_job_roles')
        .select(`
          *,
          job_role:job_roles(id, code, name_en, name_ar, job_family)
        `)
        .eq('course_id', id);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['catalogue-audit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogue_audit_log')
        .select('*')
        .eq('course_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!id && canEdit,
  });

  // Fetch upcoming sessions
  const { data: sessions } = useQuery({
    queryKey: ['course-sessions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('course_id', id)
        .gte('start_date', new Date().toISOString())
        .order('start_date')
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ newStatus }: { newStatus: CatalogueStatus }) => {
      const updates: Record<string, unknown> = { 
        catalogue_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'pending_approval') {
        updates.submitted_by = user?.id;
        updates.submitted_at = new Date().toISOString();
      } else if (newStatus === 'active') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
        updates.is_active = true;
      } else if (newStatus === 'retired') {
        updates.is_active = false;
      }

      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await supabase.from('catalogue_audit_log').insert({
        course_id: id,
        action: 'status_change',
        old_status: course?.catalogue_status,
        new_status: newStatus,
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-course', id] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-audit', id] });
      toast.success('Status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Course not found</h2>
          <Button onClick={() => navigate('/catalogue')} className="mt-4">
            Back to Catalogue
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = course.catalogue_status as CatalogueStatus;
  const StatusIcon = statusConfig[status]?.icon || FileText;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back Button & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/catalogue')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Catalogue
          </Button>
          
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/catalogue/${id}/edit`)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {status === 'draft' && canEdit && (
              <Button
                onClick={() => statusMutation.mutate({ newStatus: 'pending_approval' })}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Submit for Approval
              </Button>
            )}
            {status === 'pending_approval' && canApprove && (
              <>
                <Button
                  variant="outline"
                  onClick={() => statusMutation.mutate({ newStatus: 'draft' })}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Return for Revision
                </Button>
                <Button
                  onClick={() => statusMutation.mutate({ newStatus: 'active' })}
                  className="gap-2 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve & Activate
                </Button>
              </>
            )}
            {status === 'active' && canEdit && (
              <Button
                variant="destructive"
                onClick={() => statusMutation.mutate({ newStatus: 'retired' })}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Retire
              </Button>
            )}
            {status === 'retired' && canEdit && (
              <Button
                onClick={() => statusMutation.mutate({ newStatus: 'active' })}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reactivate
              </Button>
            )}
          </div>
        </div>

        {/* Course Header */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {course.code && (
                    <Badge variant="outline" className="font-mono">
                      {course.code}
                    </Badge>
                  )}
                  <Badge className={statusConfig[status]?.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[status]?.label}
                  </Badge>
                  {course.is_mandatory && (
                    <Badge variant="destructive">Mandatory</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{course.name_en}</CardTitle>
                {course.name_ar && (
                  <CardDescription className="text-lg" dir="rtl">
                    {course.name_ar}
                  </CardDescription>
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Version {course.version || 1}</p>
                {course.updated_at && (
                  <p>Updated {format(new Date(course.updated_at), 'MMM dd, yyyy')}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            {canViewCost && <TabsTrigger value="cost">Cost & Provider</TabsTrigger>}
            <TabsTrigger value="competencies">Competencies</TabsTrigger>
            <TabsTrigger value="tags">AI Tags</TabsTrigger>
            {canEdit && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {course.description_en || 'No description available'}
                </p>
                {course.description_ar && (
                  <p className="text-muted-foreground" dir="rtl">
                    {course.description_ar}
                  </p>
                )}
              </CardContent>
            </Card>

            {course.objectives && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Learning Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {course.objectives}
                  </p>
                </CardContent>
              </Card>
            )}

            {course.target_audience && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Target Audience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{course.target_audience}</p>
                </CardContent>
              </Card>
            )}

            {course.prerequisites && course.prerequisites.length > 0 && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Prerequisites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {course.prerequisites.map((prereq: string, i: number) => (
                      <li key={i}>{prereq}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Logistics Tab */}
          <TabsContent value="logistics" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      {course.delivery_mode === 'online' ? (
                        <Monitor className="h-5 w-5 text-primary" />
                      ) : (
                        <Building className="h-5 w-5 text-primary" />
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Delivery Mode</p>
                        <p className="font-medium capitalize">
                          {course.delivery_mode?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {course.duration_days} days
                          {course.duration_hours && ` (${course.duration_hours}h)`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Delivery Languages</p>
                    <div className="flex gap-2">
                      {(course.delivery_languages as string[] || ['en']).map((lang: string) => (
                        <Badge key={lang} variant="secondary">
                          {lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {course.training_location === 'abroad' ? (
                      <Globe className="h-5 w-5 text-primary" />
                    ) : (
                      <MapPin className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Training Location</p>
                      <p className="font-medium capitalize">
                        {course.training_location === 'abroad' ? 'International' : 'Local (Libya)'}
                      </p>
                    </div>
                  </div>

                  {course.training_location === 'abroad' && (course.abroad_country || course.abroad_city) && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Typical Location</p>
                      <p className="font-medium">
                        {[course.abroad_city, course.abroad_country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}

                  {course.training_location === 'local' && course.local_site && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Site</p>
                      <p className="font-medium">{course.local_site}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Participants</p>
                      <p className="font-medium">
                        Min: {course.min_participants || 1} / Max: {course.max_participants || 'Unlimited'}
                      </p>
                    </div>
                  </div>
                  {course.typical_frequency && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Typical Frequency</p>
                      <p className="font-medium">{course.typical_frequency}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions && sessions.length > 0 ? (
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-3 bg-muted rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">
                              {format(new Date(session.start_date), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {session.location_en || 'TBD'}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {session.capacity ? `${session.capacity - (session.enrolled_count || 0)} seats` : 'Open'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No upcoming sessions scheduled
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cost & Provider Tab */}
          {canViewCost && (
            <TabsContent value="cost" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Training Provider
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.provider ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="font-semibold text-lg">{course.provider.name_en}</p>
                          {course.provider.name_ar && (
                            <p className="text-muted-foreground" dir="rtl">
                              {course.provider.name_ar}
                            </p>
                          )}
                          {(course.provider.city || course.provider.country) && (
                            <p className="text-sm text-muted-foreground mt-2">
                              📍 {[course.provider.city, course.provider.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {course.provider.website && (
                            <a
                              href={course.provider.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline mt-2 block"
                            >
                              Visit Website →
                            </a>
                          )}
                          {course.provider.contact_email && (
                            <p className="text-sm text-muted-foreground mt-1">
                              ✉️ {course.provider.contact_email}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Provider TBD</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {course.cost_amount ? (
                        <>
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Standard Rate</p>
                            <p className="text-2xl font-bold">
                              {course.cost_currency || 'LYD'} {course.cost_amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {course.cost_unit_type === 'per_session' ? 'Per Session' : 'Per Participant'}
                            </p>
                          </div>
                          {course.contracted_rate && (
                            <div className="p-4 bg-success/10 rounded-lg">
                              <p className="text-sm text-muted-foreground">Contracted Rate (NOC)</p>
                              <p className="text-xl font-bold text-success">
                                {course.cost_currency || 'LYD'} {course.contracted_rate.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Cost information not available</p>
                        </div>
                      )}
                      {course.cost_level && (
                        <Badge 
                          variant="outline" 
                          className={
                            course.cost_level === 'high' ? 'border-destructive text-destructive' :
                            course.cost_level === 'medium' ? 'border-warning text-warning' :
                            'border-success text-success'
                          }
                        >
                          {course.cost_level.toUpperCase()} COST
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Competencies Tab */}
          <TabsContent value="competencies" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Linked Competencies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {competencies && competencies.length > 0 ? (
                    <div className="space-y-3">
                      {competencies.map((cc) => (
                        <div
                          key={cc.id}
                          className="p-3 bg-muted rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{cc.competency?.name_en}</p>
                            <p className="text-sm text-muted-foreground">
                              {cc.competency?.category} • Levels {cc.level_from}-{cc.level_to}
                            </p>
                          </div>
                          {cc.is_primary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No competencies linked</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Target Job Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobRoles && jobRoles.length > 0 ? (
                    <div className="space-y-3">
                      {jobRoles.map((jr) => (
                        <div
                          key={jr.id}
                          className="p-3 bg-muted rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{jr.job_role?.name_en}</p>
                            <p className="text-sm text-muted-foreground">
                              {jr.job_role?.job_family}
                            </p>
                          </div>
                          {jr.is_mandatory && (
                            <Badge variant="destructive">Mandatory</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No job roles linked</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <AITaggingPanel courseId={id!} readOnly={!canEdit} />
          </TabsContent>

          {/* Admin Tab */}
          {canEdit && (
            <TabsContent value="admin" className="space-y-4">
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Audit History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditLog && auditLog.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Old Value</TableHead>
                          <TableHead>New Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLog.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>{log.field_changed || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.old_value || log.old_status || '-'}
                            </TableCell>
                            <TableCell>
                              {log.new_value || log.new_status || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No audit history available
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Administrative Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {course.created_at ? format(new Date(course.created_at), 'MMM dd, yyyy') : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {course.updated_at ? format(new Date(course.updated_at), 'MMM dd, yyyy') : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Version</p>
                      <p className="font-medium">{course.version || 1}</p>
                    </div>
                    {course.approved_at && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Approved</p>
                        <p className="font-medium">
                          {format(new Date(course.approved_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                    {course.migration_source && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Migration Source</p>
                        <p className="font-medium">{course.migration_source}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
