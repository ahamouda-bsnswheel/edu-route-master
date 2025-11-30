import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FileText, 
  Download, 
  Search, 
  Filter,
  Calendar as CalendarIcon,
  Loader2,
  Plane
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TravelVisaRequest,
  getTravelReadiness,
  travelStatusLabels,
  visaStatusLabels
} from '@/hooks/useTravelVisa';
import { TravelReadinessIndicator } from '@/components/travel/TravelReadinessIndicator';
import { format, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TravelVisaReports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [destinationFilter, setDestinationFilter] = useState<string>('all');
  const [travelStatusFilter, setTravelStatusFilter] = useState<string>('all');
  const [visaStatusFilter, setVisaStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all travel/visa data with related info
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['travel-visa-reports', dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('travel_visa_requests')
        .select(`
          *,
          profiles:employee_id (
            id,
            first_name_en,
            last_name_en,
            employee_number,
            department,
            job_title
          ),
          training_requests (
            id,
            request_number,
            courses (
              id,
              name_en,
              provider_id,
              providers:provider_id (
                name_en
              )
            )
          ),
          sessions (
            id,
            start_date,
            end_date
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Get unique destinations for filter
  const destinations = useMemo(() => {
    const unique = new Set<string>();
    reportData?.forEach(r => {
      if (r.destination_country) unique.add(r.destination_country);
    });
    return Array.from(unique).sort();
  }, [reportData]);

  // Filter data
  const filteredData = useMemo(() => {
    return reportData?.filter(item => {
      // Search filter
      if (searchQuery) {
        const profile = item.profiles as any;
        const name = `${profile?.first_name_en || ''} ${profile?.last_name_en || ''}`.toLowerCase();
        const empNum = profile?.employee_number?.toLowerCase() || '';
        const course = (item.training_requests as any)?.courses?.name_en?.toLowerCase() || '';
        
        if (!name.includes(searchQuery.toLowerCase()) && 
            !empNum.includes(searchQuery.toLowerCase()) &&
            !course.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      // Destination filter
      if (destinationFilter !== 'all' && item.destination_country !== destinationFilter) {
        return false;
      }

      // Travel status filter
      if (travelStatusFilter !== 'all' && item.travel_status !== travelStatusFilter) {
        return false;
      }

      // Visa status filter
      if (visaStatusFilter !== 'all' && item.visa_status !== visaStatusFilter) {
        return false;
      }

      return true;
    }) || [];
  }, [reportData, searchQuery, destinationFilter, travelStatusFilter, visaStatusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredData.length;
    const ready = filteredData.filter(r => getTravelReadiness(r as TravelVisaRequest) === 'ready').length;
    const pending = filteredData.filter(r => getTravelReadiness(r as TravelVisaRequest) === 'pending').length;
    const critical = filteredData.filter(r => getTravelReadiness(r as TravelVisaRequest) === 'critical').length;
    const totalCost = filteredData.reduce((sum, r) => sum + (r.total_travel_cost || 0), 0);

    return { total, ready, pending, critical, totalCost };
  }, [filteredData]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvData = filteredData.map(item => {
        const profile = item.profiles as any;
        const trainingReq = item.training_requests as any;
        
        return {
          'Employee ID': profile?.employee_number || '',
          'Employee Name': `${profile?.first_name_en || ''} ${profile?.last_name_en || ''}`,
          'Department': profile?.department || '',
          'Course': trainingReq?.courses?.name_en || '',
          'Provider': trainingReq?.courses?.providers?.name_en || '',
          'Destination': `${item.destination_city || ''}, ${item.destination_country}`,
          'Travel Start': item.travel_start_date || '',
          'Travel End': item.travel_end_date || '',
          'Travel Request ID': item.travel_request_id || '',
          'Travel Status': travelStatusLabels[item.travel_status],
          'Visa Request ID': item.visa_request_id || '',
          'Visa Status': visaStatusLabels[item.visa_status],
          'Readiness': getTravelReadiness(item as TravelVisaRequest).toUpperCase(),
          'Travel Cost': item.total_travel_cost || '',
          'Currency': item.travel_cost_currency || ''
        };
      });

      const headers = Object.keys(csvData[0] || {});
      const csv = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel-visa-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      // Log export
      await supabase.from('travel_visa_audit_log').insert([{
        action: 'export_report',
        new_value: {
          rowCount: filteredData.length,
          filters: { destinationFilter, travelStatusFilter, visaStatusFilter, dateFrom: dateFrom?.toISOString(), dateTo: dateTo?.toISOString() }
        }
      }]);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Travel & Visa Reports</h1>
            <p className="text-muted-foreground">
              Combined training and travel/visa status reporting
            </p>
          </div>
          <Button onClick={handleExport} disabled={isExporting || filteredData.length === 0}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
              <div className="text-sm text-muted-foreground">Ready</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {stats.totalCost.toLocaleString()} <span className="text-sm font-normal">SAR</span>
              </div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Destinations</SelectItem>
                  {destinations.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={travelStatusFilter} onValueChange={setTravelStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Travel Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Travel Status</SelectItem>
                  {Object.entries(travelStatusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={visaStatusFilter} onValueChange={setVisaStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Visa Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visa Status</SelectItem>
                  {Object.entries(visaStatusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(
                    "justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd MMM yyyy') : 'From date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-12 text-center">
                <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No travel records found matching your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Travel Dates</TableHead>
                    <TableHead>Travel Status</TableHead>
                    <TableHead>Visa Status</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const profile = item.profiles as any;
                    const trainingReq = item.training_requests as any;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {profile?.first_name_en} {profile?.last_name_en}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {profile?.employee_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {trainingReq?.courses?.name_en || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.destination_city && `${item.destination_city}, `}
                          {item.destination_country}
                        </TableCell>
                        <TableCell>
                          {item.travel_start_date 
                            ? `${format(new Date(item.travel_start_date), 'dd MMM')} - ${item.travel_end_date ? format(new Date(item.travel_end_date), 'dd MMM') : ''}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.travel_status === 'ticketed' ? 'default' : 'secondary'}>
                            {travelStatusLabels[item.travel_status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.visa_status === 'approved' || item.visa_status === 'not_required'
                              ? 'default'
                              : 'secondary'
                          }>
                            {visaStatusLabels[item.visa_status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TravelReadinessIndicator readiness={getTravelReadiness(item as TravelVisaRequest)} />
                        </TableCell>
                        <TableCell className="text-right">
                          {item.total_travel_cost 
                            ? `${item.travel_cost_currency || 'SAR'} ${item.total_travel_cost.toLocaleString()}`
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}