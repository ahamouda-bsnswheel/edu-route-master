import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Building2, Globe, MapPin, Filter, 
  FileSpreadsheet, BarChart3, Eye, Edit, CheckCircle, XCircle, Clock 
} from 'lucide-react';
import { format } from 'date-fns';
import { ProviderBulkImport } from '@/components/providers/ProviderBulkImport';
import { ProviderReports } from '@/components/providers/ProviderReports';

type ProviderStatus = 'draft' | 'pending_approval' | 'active' | 'inactive' | 'blocked';

const statusConfig: Record<ProviderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Edit },
  pending_approval: { label: 'Pending Approval', variant: 'outline', icon: Clock },
  active: { label: 'Active', variant: 'default', icon: CheckCircle },
  inactive: { label: 'Inactive', variant: 'secondary', icon: XCircle },
  blocked: { label: 'Blocked', variant: 'destructive', icon: XCircle },
};

const providerCategories = [
  'HSE', 'Technical', 'Leadership', 'Behavioural', 'IT', 'University', 
  'Language', 'Professional', 'Compliance', 'Soft Skills', 'Other'
];

export default function ProviderAdmin() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [localFilter, setLocalFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('list');

  // Fetch providers
  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_providers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get unique countries
  const countries = [...new Set(providers?.map(p => p.country).filter(Boolean) || [])].sort();

  // Filter providers
  const filteredProviders = providers?.filter(provider => {
    const matchesSearch = !searchQuery || 
      provider.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.vendor_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || provider.provider_status === statusFilter;
    const matchesCountry = countryFilter === 'all' || provider.country === countryFilter;
    const matchesLocal = localFilter === 'all' || 
      (localFilter === 'local' && provider.is_local) || 
      (localFilter === 'international' && !provider.is_local);
    const matchesCategory = categoryFilter === 'all' || 
      (provider.categories as string[] || []).includes(categoryFilter);

    return matchesSearch && matchesStatus && matchesCountry && matchesLocal && matchesCategory;
  }) || [];

  // Status counts
  const statusCounts = {
    all: providers?.length || 0,
    draft: providers?.filter(p => p.provider_status === 'draft').length || 0,
    pending_approval: providers?.filter(p => p.provider_status === 'pending_approval').length || 0,
    active: providers?.filter(p => p.provider_status === 'active').length || 0,
    inactive: providers?.filter(p => p.provider_status === 'inactive').length || 0,
    blocked: providers?.filter(p => p.provider_status === 'blocked').length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Provider Registry</h1>
            <p className="text-muted-foreground">Manage training providers (local & international)</p>
          </div>
          <Button onClick={() => navigate('/providers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Provider
          </Button>
        </div>

        {/* Status Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
          {Object.entries(statusCounts).map(([status, count]) => {
            const config = status === 'all' 
              ? { label: 'Total', variant: 'outline' as const, icon: Building2 }
              : statusConfig[status as ProviderStatus];
            const Icon = config?.icon || Building2;
            return (
              <Card 
                key={status} 
                className={`cursor-pointer transition-colors ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                <CardContent className="p-2 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1">
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-muted-foreground">{config?.label || status}</p>
                      <p className="text-lg sm:text-2xl font-bold">{count}</p>
                    </div>
                    <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground/50 hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">
              <Building2 className="h-4 w-4 mr-2" />
              Provider List
            </TabsTrigger>
            <TabsTrigger value="import">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Import
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search providers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={localFilter} onValueChange={setLocalFilter}>
                    <SelectTrigger className="w-40">
                      <Globe className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="local">Local (Libya)</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-40">
                      <MapPin className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map(country => (
                        <SelectItem key={country} value={country!}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {providerCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Provider List */}
            <Card>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="text-center py-8">Loading providers...</div>
                ) : filteredProviders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No providers found</div>
                ) : (
                  <div className="space-y-3">
                    {filteredProviders.map((provider) => {
                      const status = (provider.provider_status || 'draft') as ProviderStatus;
                      const config = statusConfig[status];
                      const StatusIcon = config.icon;
                      return (
                        <div
                          key={provider.id}
                          className="border rounded-lg p-3 space-y-2 bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/providers/${provider.id}`)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{provider.name_en}</p>
                              {provider.vendor_code && (
                                <p className="text-xs text-muted-foreground">Code: {provider.vendor_code}</p>
                              )}
                            </div>
                            <Badge variant={config.variant} className="gap-1 shrink-0 text-xs">
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {provider.is_local ? (
                                <Badge variant="outline" className="text-xs">Local</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Int'l</Badge>
                              )}
                              <span>{provider.country || 'N/A'}</span>
                            </div>
                            <span>{provider.updated_at ? format(new Date(provider.updated_at), 'MMM d') : '-'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {((provider.categories as string[]) || []).slice(0, 3).map(cat => (
                              <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                            ))}
                            {((provider.categories as string[]) || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{((provider.categories as string[]) || []).length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <ProviderBulkImport />
          </TabsContent>

          <TabsContent value="reports">
            <ProviderReports providers={providers || []} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
