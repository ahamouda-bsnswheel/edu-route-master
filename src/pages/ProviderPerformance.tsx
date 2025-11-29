import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, subYears, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building,
  Globe,
  Filter,
  Download,
  Settings,
  BarChart3,
  Shield,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { ProviderKPIConfig } from '@/components/providers/ProviderKPIConfig';
import { ProviderPerformanceImport } from '@/components/providers/ProviderPerformanceImport';

type SortField = 'name' | 'avg_rating' | 'completion_rate' | 'cancellation_rate' | 'total_cost' | 'cost_per_participant';
type SortDirection = 'asc' | 'desc';
type TimePeriod = 'year' | 'quarter' | 'custom';

interface KPIThreshold {
  kpi_name: string;
  good_threshold: number;
  warning_threshold: number;
  comparison_operator: string;
}

export default function ProviderPerformance() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const canViewCost = hasRole('l_and_d') || hasRole('admin') || hasRole('hrbp') || hasRole('chro');
  const canManageConfig = hasRole('l_and_d') || hasRole('admin');
  
  const [search, setSearch] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('avg_rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    if (timePeriod === 'year') {
      return {
        start: startOfYear(new Date(selectedYear, 0, 1)),
        end: endOfYear(new Date(selectedYear, 0, 1)),
      };
    } else if (timePeriod === 'quarter') {
      const quarterStart = new Date(selectedYear, (selectedQuarter - 1) * 3, 1);
      return {
        start: startOfQuarter(quarterStart),
        end: endOfQuarter(quarterStart),
      };
    }
    return { start: subYears(now, 1), end: now };
  }, [timePeriod, selectedYear, selectedQuarter]);

  // Fetch KPI thresholds
  const { data: thresholds } = useQuery({
    queryKey: ['provider-kpi-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_kpi_thresholds')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as KPIThreshold[];
    },
  });

  // Fetch providers with performance data
  const { data: providers, isLoading } = useQuery({
    queryKey: ['provider-performance', dateRange],
    queryFn: async () => {
      // Get providers
      const { data: providerData, error: providerError } = await supabase
        .from('training_providers')
        .select('*')
        .eq('is_active', true);
      if (providerError) throw providerError;

      // Get sessions in date range with enrollments
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          course_id,
          start_date,
          status,
          courses(
            provider_id,
            category_id,
            is_mandatory,
            course_categories(name_en)
          )
        `)
        .gte('start_date', dateRange.start.toISOString())
        .lte('start_date', dateRange.end.toISOString());
      if (sessionError) throw sessionError;

      // Get enrollments for these sessions
      const sessionIds = sessionData?.map(s => s.id) || [];
      const { data: enrollmentData } = await supabase
        .from('session_enrollments')
        .select('session_id, status, completion_status, assessment_score')
        .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      // Get provider flags
      const { data: flagData } = await supabase
        .from('provider_flags')
        .select('*')
        .eq('is_active', true);

      // Calculate metrics per provider
      const providerMetrics = providerData?.map(provider => {
        const providerSessions = sessionData?.filter(s => s.courses?.provider_id === provider.id) || [];
        const providerEnrollments = enrollmentData?.filter(e => 
          providerSessions.some(s => s.id === e.session_id)
        ) || [];

        const totalSessions = providerSessions.length;
        const completedSessions = providerSessions.filter(s => s.status === 'completed').length;
        const cancelledSessions = providerSessions.filter(s => s.status === 'cancelled').length;
        const totalParticipants = providerEnrollments.length;
        const completedParticipants = providerEnrollments.filter(e => e.completion_status === 'completed').length;
        
        // Use assessment_score as a proxy for rating (0-100 scale to 1-5)
        const scores = providerEnrollments
          .filter(e => e.assessment_score)
          .map(e => (e.assessment_score as number) / 20); // Convert 0-100 to 0-5
        const avgRating = scores.length > 0 
          ? scores.reduce((a, b) => a + b, 0) / scores.length 
          : null;

        const completionRate = totalParticipants > 0 
          ? (completedParticipants / totalParticipants) * 100 
          : null;
        const cancellationRate = totalSessions > 0 
          ? (cancelledSessions / totalSessions) * 100 
          : 0;

        // HSE metrics
        const hseSessions = providerSessions.filter(s => 
          s.courses?.course_categories?.name_en?.toLowerCase().includes('hse') ||
          s.courses?.is_mandatory
        );
        const hseEnrollments = enrollmentData?.filter(e => 
          hseSessions.some(s => s.id === e.session_id)
        ) || [];
        const hseCompletedParticipants = hseEnrollments.filter(e => e.completion_status === 'completed').length;
        const hseCompletionRate = hseEnrollments.length > 0
          ? (hseCompletedParticipants / hseEnrollments.length) * 100
          : null;

        const flags = flagData?.filter(f => f.provider_id === provider.id) || [];
        const activeFlag = flags.find(f => f.is_active);

        return {
          ...provider,
          total_sessions: totalSessions,
          total_participants: totalParticipants,
          completed_sessions: completedSessions,
          cancelled_sessions: cancelledSessions,
          avg_rating: avgRating,
          completion_rate: completionRate,
          cancellation_rate: cancellationRate,
          hse_sessions: hseSessions.length,
          hse_completion_rate: hseCompletionRate,
          total_cost: null,
          cost_per_participant: null,
          flag: activeFlag,
        };
      });

      return providerMetrics;
    },
  });

  // Calculate global KPIs
  const globalKPIs = useMemo(() => {
    if (!providers) return null;
    
    const withRating = providers.filter(p => p.avg_rating !== null);
    const withCompletion = providers.filter(p => p.completion_rate !== null);
    
    return {
      avgSatisfaction: withRating.length > 0
        ? withRating.reduce((sum, p) => sum + (p.avg_rating || 0), 0) / withRating.length
        : 0,
      avgCompletionRate: withCompletion.length > 0
        ? withCompletion.reduce((sum, p) => sum + (p.completion_rate || 0), 0) / withCompletion.length
        : 0,
      totalSessions: providers.reduce((sum, p) => sum + p.total_sessions, 0),
      totalParticipants: providers.reduce((sum, p) => sum + p.total_participants, 0),
      hseOnTimeRate: 95, // Placeholder
    };
  }, [providers]);

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    
    let filtered = providers.filter(p => {
      const matchesSearch = p.name_en?.toLowerCase().includes(search.toLowerCase()) ||
        p.name_ar?.toLowerCase().includes(search.toLowerCase());
      const matchesLocation = locationFilter === 'all' || 
        (locationFilter === 'local' && p.is_local) ||
        (locationFilter === 'international' && !p.is_local);
      const matchesStatus = statusFilter === 'all' || p.provider_status === statusFilter;
      return matchesSearch && matchesLocation && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name':
          aVal = a.name_en || '';
          bVal = b.name_en || '';
          break;
        case 'avg_rating':
          aVal = a.avg_rating ?? -1;
          bVal = b.avg_rating ?? -1;
          break;
        case 'completion_rate':
          aVal = a.completion_rate ?? -1;
          bVal = b.completion_rate ?? -1;
          break;
        case 'cancellation_rate':
          aVal = a.cancellation_rate ?? 999;
          bVal = b.cancellation_rate ?? 999;
          break;
        default:
          aVal = a[sortField] ?? 0;
          bVal = b[sortField] ?? 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [providers, search, locationFilter, statusFilter, sortField, sortDirection]);

  // Get KPI status color
  const getKPIStatus = (kpiName: string, value: number | null): 'good' | 'warning' | 'bad' | 'neutral' => {
    if (value === null) return 'neutral';
    const threshold = thresholds?.find(t => t.kpi_name === kpiName);
    if (!threshold) return 'neutral';

    if (threshold.comparison_operator === 'gte') {
      if (value >= threshold.good_threshold) return 'good';
      if (value >= threshold.warning_threshold) return 'warning';
      return 'bad';
    } else {
      if (value <= threshold.good_threshold) return 'good';
      if (value <= threshold.warning_threshold) return 'warning';
      return 'bad';
    }
  };

  const statusColors = {
    good: 'text-green-600 bg-green-50 dark:bg-green-950',
    warning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
    bad: 'text-red-600 bg-red-50 dark:bg-red-950',
    neutral: 'text-muted-foreground bg-muted',
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      // Log export
      await supabase.from('provider_performance_audit_log').insert([{
        action: 'export',
        entity_type: 'performance_data',
        filter_context: { search, locationFilter, statusFilter, dateRange: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() } },
      }]);

      // Generate CSV
      const headers = ['Provider Name', 'Country', 'Type', 'Sessions', 'Participants', 
        'Avg Rating', 'Completion Rate', 'Cancellation Rate'];
      if (canViewCost) {
        headers.push('Total Cost', 'Cost/Participant');
      }
      
      const rows = filteredProviders.map(p => {
        const row = [
          p.name_en,
          p.country,
          p.is_local ? 'Local' : 'International',
          p.total_sessions,
          p.total_participants,
          p.avg_rating?.toFixed(2) || 'N/A',
          p.completion_rate?.toFixed(1) + '%' || 'N/A',
          p.cancellation_rate?.toFixed(1) + '%' || '0%',
        ];
        if (canViewCost) {
          row.push(p.total_cost?.toString() || 'N/A', p.cost_per_participant?.toString() || 'N/A');
        }
        return row;
      });

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `provider-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    },
    onSuccess: () => toast.success('Export completed'),
    onError: () => toast.error('Export failed'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Provider Performance</h1>
            <p className="text-muted-foreground mt-1">
              Analyze training provider quality, reliability, and cost-effectiveness
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportMutation.mutate()}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            {canManageConfig && (
              <>
                <TabsTrigger value="config" className="gap-2">
                  <Settings className="h-4 w-4" />
                  KPI Config
                </TabsTrigger>
                <TabsTrigger value="import" className="gap-2">
                  <Download className="h-4 w-4" />
                  Import History
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Time Period Selector */}
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Period:</span>
                    <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Year</SelectItem>
                        <SelectItem value="quarter">Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2023, 2022, 2021, 2020].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {timePeriod === 'quarter' && (
                    <Select value={selectedQuarter.toString()} onValueChange={(v) => setSelectedQuarter(parseInt(v))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <span className="text-sm text-muted-foreground">
                    {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Global KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">
                      {globalKPIs?.avgSatisfaction.toFixed(2) || '-'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Satisfaction</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">
                      {globalKPIs?.avgCompletionRate.toFixed(1) || '-'}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">
                      {globalKPIs?.totalParticipants || 0}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">
                      {globalKPIs?.totalSessions || 0}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">
                      {globalKPIs?.hseOnTimeRate || '-'}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">HSE On-time</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search providers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="local">Local (Libya)</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Provider Performance Table */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Provider Performance</CardTitle>
                <CardDescription>
                  {filteredProviders.length} providers found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Provider
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted text-right"
                          onClick={() => handleSort('avg_rating')}
                        >
                          <div className="flex items-center gap-1 justify-end">
                            Rating
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted text-right"
                          onClick={() => handleSort('completion_rate')}
                        >
                          <div className="flex items-center gap-1 justify-end">
                            Completion
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted text-right"
                          onClick={() => handleSort('cancellation_rate')}
                        >
                          <div className="flex items-center gap-1 justify-end">
                            Cancellation
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">HSE</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProviders.map((provider) => (
                        <TableRow 
                          key={provider.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/providers/${provider.id}/performance`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{provider.name_en}</p>
                              <p className="text-xs text-muted-foreground">{provider.country}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              {provider.is_local ? (
                                <><Building className="h-3 w-3" /> Local</>
                              ) : (
                                <><Globe className="h-3 w-3" /> International</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded text-sm ${statusColors[getKPIStatus('avg_rating', provider.avg_rating)]}`}>
                              {provider.avg_rating?.toFixed(2) || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded text-sm ${statusColors[getKPIStatus('completion_rate', provider.completion_rate)]}`}>
                              {provider.completion_rate?.toFixed(1) || '-'}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded text-sm ${statusColors[getKPIStatus('cancellation_rate', provider.cancellation_rate)]}`}>
                              {provider.cancellation_rate?.toFixed(1) || '0'}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{provider.total_sessions}</TableCell>
                          <TableCell className="text-right">
                            {provider.hse_sessions > 0 && (
                              <Badge variant={getKPIStatus('hse_completion_rate', provider.hse_completion_rate) === 'good' ? 'default' : 'destructive'}>
                                {provider.hse_sessions}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {provider.flag && (
                              <Badge 
                                variant={provider.flag.flag_type === 'preferred_partner' ? 'default' : 
                                  provider.flag.flag_type === 'under_review' ? 'secondary' : 'destructive'}
                              >
                                {provider.flag.flag_type.replace('_', ' ')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canManageConfig && (
            <>
              <TabsContent value="config">
                <ProviderKPIConfig />
              </TabsContent>
              <TabsContent value="import">
                <ProviderPerformanceImport />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}