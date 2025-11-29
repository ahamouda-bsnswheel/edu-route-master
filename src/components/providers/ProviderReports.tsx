import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Building2, Globe, MapPin, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Provider {
  id: string;
  name_en: string;
  country: string | null;
  city: string | null;
  is_local: boolean | null;
  provider_status: string | null;
  categories: string[] | null;
  internal_rating: number | null;
  created_at: string | null;
}

interface ProviderReportsProps {
  providers: Provider[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function ProviderReports({ providers }: ProviderReportsProps) {
  // Calculate statistics
  const totalProviders = providers.length;
  const activeProviders = providers.filter(p => p.provider_status === 'active').length;
  const localProviders = providers.filter(p => p.is_local).length;
  const internationalProviders = providers.filter(p => !p.is_local).length;

  // Status distribution
  const statusData = [
    { name: 'Active', value: providers.filter(p => p.provider_status === 'active').length },
    { name: 'Draft', value: providers.filter(p => p.provider_status === 'draft').length },
    { name: 'Pending', value: providers.filter(p => p.provider_status === 'pending_approval').length },
    { name: 'Inactive', value: providers.filter(p => p.provider_status === 'inactive').length },
    { name: 'Blocked', value: providers.filter(p => p.provider_status === 'blocked').length },
  ].filter(d => d.value > 0);

  // Local vs International
  const locationData = [
    { name: 'Local (Libya)', value: localProviders },
    { name: 'International', value: internationalProviders },
  ];

  // Category distribution
  const categoryCount: Record<string, number> = {};
  providers.forEach(provider => {
    ((provider.categories as string[]) || []).forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
  });
  const categoryData = Object.entries(categoryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Country distribution
  const countryCount: Record<string, number> = {};
  providers.forEach(provider => {
    if (provider.country) {
      countryCount[provider.country] = (countryCount[provider.country] || 0) + 1;
    }
  });
  const countryData = Object.entries(countryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Export function
  const exportProviders = () => {
    const headers = ['Name', 'Country', 'City', 'Local/International', 'Status', 'Categories', 'Rating'];
    const rows = providers.map(p => [
      p.name_en,
      p.country || '',
      p.city || '',
      p.is_local ? 'Local' : 'International',
      p.provider_status || '',
      ((p.categories as string[]) || []).join('; '),
      p.internal_rating?.toString() || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `providers_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Provider data exported');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <p className="text-2xl font-bold">{totalProviders}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeProviders}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Local (Libya)</p>
                <p className="text-2xl font-bold">{localProviders}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">International</p>
                <p className="text-2xl font-bold">{internationalProviders}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Status</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Local vs International */}
        <Card>
          <CardHeader>
            <CardTitle>Local vs International</CardTitle>
            <CardDescription>Geographic distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={locationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {locationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Providers by Category</CardTitle>
          <CardDescription>Number of providers per training category</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No category data available</p>
          )}
        </CardContent>
      </Card>

      {/* Country Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Providers by Country</CardTitle>
          <CardDescription>Top countries by number of providers</CardDescription>
        </CardHeader>
        <CardContent>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No country data available</p>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export Provider Data</CardTitle>
          <CardDescription>Download provider information for offline analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportProviders}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
