import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Clock,
  MapPin,
  Users,
  Building,
  Monitor,
  Globe,
  FileText,
  Upload,
  BarChart3,
  Grid3X3,
  List,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CatalogueBulkImport } from '@/components/catalogue/CatalogueBulkImport';
import { CatalogueReports } from '@/components/catalogue/CatalogueReports';

type CatalogueStatus = 'draft' | 'pending_approval' | 'active' | 'retired';
type ViewMode = 'grid' | 'table';

const statusConfig: Record<CatalogueStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'bg-warning/10 text-warning', icon: Clock },
  active: { label: 'Active', color: 'bg-success/10 text-success', icon: CheckCircle },
  retired: { label: 'Retired', color: 'bg-destructive/10 text-destructive', icon: XCircle },
};

const deliveryModeLabels: Record<string, string> = {
  classroom: 'Classroom (ILT)',
  online: 'Online (e-Learning)',
  blended: 'Blended',
  on_the_job: 'On-the-Job (OJT)',
  vilt: 'Virtual ILT',
};

export default function CatalogueAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeTab, setActiveTab] = useState('catalogue');

  // Fetch courses with all relations
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['catalogue-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          category:course_categories(id, name_en, name_ar),
          provider:training_providers(id, name_en, name_ar, country, city)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
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

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ courseId, newStatus }: { courseId: string; newStatus: CatalogueStatus }) => {
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
        .eq('id', courseId);

      if (error) throw error;

      // Log the audit
      await supabase.from('catalogue_audit_log').insert({
        course_id: courseId,
        action: 'status_change',
        new_status: newStatus,
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-courses'] });
      toast.success('Course status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // Filter courses
  const filteredCourses = courses?.filter((course) => {
    const matchesSearch =
      course.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      course.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
      course.code?.toLowerCase().includes(search.toLowerCase()) ||
      course.description_en?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category_id === categoryFilter;
    const matchesMode = modeFilter === 'all' || course.delivery_mode === modeFilter;
    const matchesStatus = statusFilter === 'all' || course.catalogue_status === statusFilter;
    const matchesLocation = locationFilter === 'all' || course.training_location === locationFilter;
    const matchesProvider = providerFilter === 'all' || course.provider_id === providerFilter;
    const matchesLanguage = languageFilter === 'all' || 
      (course.delivery_languages as string[] || []).includes(languageFilter);

    return matchesSearch && matchesCategory && matchesMode && matchesStatus && 
           matchesLocation && matchesProvider && matchesLanguage;
  });

  // Stats
  const stats = {
    total: courses?.length || 0,
    draft: courses?.filter(c => c.catalogue_status === 'draft').length || 0,
    pending: courses?.filter(c => c.catalogue_status === 'pending_approval').length || 0,
    active: courses?.filter(c => c.catalogue_status === 'active').length || 0,
    retired: courses?.filter(c => c.catalogue_status === 'retired').length || 0,
  };

  const renderStatusBadge = (status: CatalogueStatus) => {
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const renderCourseActions = (course: typeof courses[0]) => {
    const status = course.catalogue_status as CatalogueStatus;
    
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/catalogue/${course.id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/catalogue/${course.id}/edit`)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        {status === 'draft' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => statusMutation.mutate({ courseId: course.id, newStatus: 'pending_approval' })}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
        {status === 'pending_approval' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-success"
            onClick={() => statusMutation.mutate({ courseId: course.id, newStatus: 'active' })}
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Learning Catalogue</h1>
            <p className="text-muted-foreground mt-1">
              Manage courses, programs, and certifications
            </p>
          </div>
          <Button onClick={() => navigate('/catalogue/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Course/Program
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-muted-foreground">{stats.draft}</div>
              <p className="text-sm text-muted-foreground">Draft</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-success">{stats.active}</div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.retired}</div>
              <p className="text-sm text-muted-foreground">Retired</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="catalogue" className="gap-2">
              <FileText className="h-4 w-4" />
              Catalogue
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalogue" className="space-y-4">
            {/* Filters */}
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by title, code, description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('table')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={modeFilter} onValueChange={setModeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Delivery Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        <SelectItem value="classroom">Classroom (ILT)</SelectItem>
                        <SelectItem value="vilt">Virtual ILT</SelectItem>
                        <SelectItem value="online">e-Learning</SelectItem>
                        <SelectItem value="blended">Blended</SelectItem>
                        <SelectItem value="on_the_job">OJT</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="local">Local (Libya)</SelectItem>
                        <SelectItem value="abroad">Abroad</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Providers</SelectItem>
                        {providers?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={languageFilter} onValueChange={setLanguageFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              {filteredCourses?.length || 0} items found
            </div>

            {/* Content */}
            {coursesLoading ? (
              <Card className="card-shadow">
                <CardContent className="py-8">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === 'table' ? (
              <Card className="card-shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code / ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Delivery Mode</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses?.map((course) => (
                      <TableRow 
                        key={course.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/catalogue/${course.id}`)}
                      >
                        <TableCell className="font-mono text-sm">
                          {course.code || course.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{course.name_en}</p>
                            {course.name_ar && (
                              <p className="text-sm text-muted-foreground" dir="rtl">
                                {course.name_ar}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{course.category?.name_en || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {deliveryModeLabels[course.delivery_mode] || course.delivery_mode}
                          </Badge>
                        </TableCell>
                        <TableCell>{course.provider?.name_en || 'TBD'}</TableCell>
                        <TableCell>
                          {course.duration_days ? `${course.duration_days} days` : '-'}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(course.catalogue_status as CatalogueStatus)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {course.updated_at ? format(new Date(course.updated_at), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {renderCourseActions(course)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourses?.map((course) => (
                  <Card
                    key={course.id}
                    className="card-shadow hover:card-shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/catalogue/${course.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">
                            {course.name_en}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {course.code || course.category?.name_en || 'Uncategorized'}
                          </CardDescription>
                        </div>
                        {renderStatusBadge(course.catalogue_status as CatalogueStatus)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description_en || 'No description available'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1">
                          {course.delivery_mode === 'online' ? (
                            <Monitor className="h-3 w-3" />
                          ) : (
                            <Building className="h-3 w-3" />
                          )}
                          {deliveryModeLabels[course.delivery_mode] || course.delivery_mode}
                        </Badge>
                        {course.duration_days && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {course.duration_days} days
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          {course.training_location === 'abroad' ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {course.training_location || 'Local'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          {course.provider?.name_en || 'No provider'}
                        </span>
                        <div onClick={(e) => e.stopPropagation()}>
                          {renderCourseActions(course)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!coursesLoading && filteredCourses?.length === 0 && (
              <Card className="card-shadow">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No courses found</h3>
                  <p className="text-muted-foreground mt-1">
                    Try adjusting your search or filters
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="import">
            <CatalogueBulkImport />
          </TabsContent>

          <TabsContent value="reports">
            <CatalogueReports />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
