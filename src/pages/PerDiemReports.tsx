import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePerDiemCalculations } from '@/hooks/usePerDiem';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  Download, 
  Search, 
  Filter, 
  TrendingUp,
  Globe,
  Users,
  Calculator,
} from 'lucide-react';
import { format } from 'date-fns';

export default function PerDiemReports() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data: calculations, isLoading } = usePerDiemCalculations();

  // Get unique countries for filter
  const countries = useMemo(() => {
    if (!calculations) return [];
    const unique = [...new Set(calculations.map(c => c.destination_country))];
    return unique.sort();
  }, [calculations]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!calculations) return [];
    
    return calculations.filter(calc => {
      if (statusFilter !== 'all' && calc.status !== statusFilter) return false;
      if (countryFilter !== 'all' && calc.destination_country !== countryFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          calc.destination_country.toLowerCase().includes(searchLower) ||
          calc.destination_city?.toLowerCase().includes(searchLower) ||
          calc.employee_id.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [calculations, statusFilter, countryFilter, search]);

  // Calculate statistics
  const stats = useMemo(() => {
    const data = filteredData;
    return {
      totalRecords: data.length,
      totalEstimated: data.reduce((sum, c) => sum + (c.estimated_amount || 0), 0),
      totalFinal: data.reduce((sum, c) => sum + (c.final_amount || 0), 0),
      pendingCount: data.filter(c => c.status === 'pending').length,
      calculatedCount: data.filter(c => c.status === 'calculated').length,
      paidCount: data.filter(c => c.payment_status === 'paid').length,
      avgPerDiem: data.length > 0 
        ? data.reduce((sum, c) => sum + (c.estimated_amount || 0), 0) / data.length 
        : 0,
    };
  }, [filteredData]);

  // Export to CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = [
        'Employee ID',
        'Destination Country',
        'Destination City',
        'Band',
        'Planned Start',
        'Planned End',
        'Actual Start',
        'Actual End',
        'Daily Rate',
        'Currency',
        'Eligible Days',
        'Estimated Amount',
        'Final Amount',
        'Status',
        'Payment Status',
      ];

      const rows = filteredData.map(calc => [
        calc.employee_id,
        calc.destination_country,
        calc.destination_city || '',
        calc.destination_band || '',
        calc.planned_start_date || '',
        calc.planned_end_date || '',
        calc.actual_start_date || '',
        calc.actual_end_date || '',
        calc.daily_rate,
        calc.currency,
        calc.total_eligible_days,
        calc.estimated_amount || 0,
        calc.final_amount || 0,
        calc.status,
        calc.payment_status,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `per-diem-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      // Log export
      await supabase.from('per_diem_audit_log').insert({
        entity_type: 'report',
        action: 'export',
        details: { rows_exported: filteredData.length, filters: { statusFilter, countryFilter } },
      });

      toast({ title: 'Export complete', description: `${filteredData.length} records exported` });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Per Diem Analytics</h1>
            <p className="text-muted-foreground">
              Analyze per diem costs by destination, provider, and program
            </p>
          </div>
          <Button onClick={handleExport} disabled={isExporting || filteredData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingCount} pending, {stats.calculatedCount} calculated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estimated</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all filtered records
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Final</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.paidCount} paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Per Diem</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.avgPerDiem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Per trip average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by destination or employee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Per Diem Records</CardTitle>
            <CardDescription>
              {filteredData.length} records found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead>
                    <TableHead>Band</TableHead>
                    <TableHead>Travel Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Estimated</TableHead>
                    <TableHead>Final</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((calc) => (
                    <TableRow key={calc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{calc.destination_country}</p>
                            {calc.destination_city && (
                              <p className="text-xs text-muted-foreground">{calc.destination_city}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={calc.destination_band === 'A' ? 'default' : 'secondary'}>
                          Band {calc.destination_band || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {calc.planned_start_date && calc.planned_end_date ? (
                          <span className="text-sm">
                            {format(new Date(calc.planned_start_date), 'MMM d')} - {format(new Date(calc.planned_end_date), 'MMM d, yyyy')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{calc.total_eligible_days}</TableCell>
                      <TableCell>{calc.currency} {calc.daily_rate?.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        {calc.currency} {calc.estimated_amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {calc.final_amount 
                          ? `${calc.currency} ${calc.final_amount.toFixed(2)}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={calc.status === 'calculated' ? 'default' : 'secondary'}
                          className={calc.config_missing ? 'bg-amber-100 text-amber-800' : ''}
                        >
                          {calc.config_missing ? 'Config Missing' : calc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            calc.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            calc.payment_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            ''
                          }
                        >
                          {calc.payment_status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No per diem records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
