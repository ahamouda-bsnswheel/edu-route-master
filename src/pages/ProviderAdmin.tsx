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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
            <h1 className="text-3xl font-bold tracking-tight">Provider Registry</h1>
            <p className="text-muted-foreground">Manage training providers (local & international)</p>
          </div>
          <Button onClick={() => navigate('/providers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Provider
          </Button>
        </div>

        {/* Status Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{config?.label || status}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <Icon className="h-8 w-8 text-muted-foreground/50" />
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
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider Name</TableHead>
                      <TableHead>Country / City</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading providers...
                        </TableCell>
                      </TableRow>
                    ) : filteredProviders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No providers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProviders.map((provider) => {
                        const status = (provider.provider_status || 'draft') as ProviderStatus;
                        const config = statusConfig[status];
                        const StatusIcon = config.icon;
                        return (
                          <TableRow 
                            key={provider.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/providers/${provider.id}`)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{provider.name_en}</p>
                                {provider.name_ar && (
                                  <p className="text-sm text-muted-foreground">{provider.name_ar}</p>
                                )}
                                {provider.vendor_code && (
                                  <p className="text-xs text-muted-foreground">Code: {provider.vendor_code}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {provider.is_local ? (
                                  <Badge variant="outline" className="text-xs">Local</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Int'l</Badge>
                                )}
                                <span>{provider.country || 'N/A'}</span>
                              </div>
                              {provider.city && (
                                <p className="text-sm text-muted-foreground">{provider.city}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {((provider.categories as string[]) || []).slice(0, 2).map(cat => (
                                  <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                                ))}
                                {((provider.categories as string[]) || []).length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{((provider.categories as string[]) || []).length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{provider.contact_email || '-'}</p>
                                {provider.contact_phone && (
                                  <p className="text-muted-foreground">{provider.contact_phone}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={config.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {provider.updated_at ? format(new Date(provider.updated_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/providers/${provider.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/providers/${provider.id}/edit`);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
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
