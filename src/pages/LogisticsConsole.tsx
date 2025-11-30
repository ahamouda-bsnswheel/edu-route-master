import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plane,
  Hotel,
  MapPin,
  Search,
  Download,
  Eye,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TravelItinerary, itineraryStatusLabels } from '@/hooks/useItinerary';
import { ItineraryViewPanel } from '@/components/itinerary/ItineraryViewPanel';

export default function LogisticsConsole() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [selectedItinerary, setSelectedItinerary] = useState<TravelItinerary | null>(null);

  // Fetch all itineraries with profiles
  const { data: itineraries, isLoading, refetch } = useQuery({
    queryKey: ['logistics-itineraries', statusFilter, countryFilter],
    queryFn: async () => {
      let query = supabase
        .from('travel_itineraries')
        .select(`
          *,
          flight_segments:itinerary_flight_segments(*),
          accommodations:itinerary_accommodations(*),
          ground_transport:itinerary_ground_transport(*)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (countryFilter) {
        query = query.eq('destination_country', countryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TravelItinerary[];
    },
  });

  // Get unique countries for filter
  const countries = [...new Set(itineraries?.map(i => i.destination_country) || [])].sort();

  // Filter by search
  const filteredItineraries = itineraries?.filter(it => {
    if (!searchTerm) return true;
    return (
      it.destination_country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.destination_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  // Stats
  const totalCount = filteredItineraries.length;
  const confirmedCount = filteredItineraries.filter(i => i.status === 'confirmed').length;
  const draftCount = filteredItineraries.filter(i => i.status === 'draft').length;

  const getArrivalTime = (itinerary: TravelItinerary) => {
    const outbound = itinerary.flight_segments?.find(f => f.segment_type === 'outbound');
    return outbound?.arrival_datetime;
  };

  const getHotelName = (itinerary: TravelItinerary) => {
    return itinerary.accommodations?.[0]?.hotel_name;
  };

  const handleExport = () => {
    const headers = ['Employee ID', 'Country', 'City', 'Status', 'Arrival', 'Hotel', 'Venue'];
    const rows = filteredItineraries.map(it => [
      it.employee_id,
      it.destination_country,
      it.destination_city || '',
      it.status,
      getArrivalTime(it) ? format(new Date(getArrivalTime(it)!), 'dd MMM yyyy HH:mm') : '',
      getHotelName(it) || '',
      it.training_venue_name || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itineraries-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Logistics Console</h1>
            <p className="text-muted-foreground">
              Manage training travel itineraries and logistics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Itineraries</p>
                  <p className="text-2xl font-bold">{totalCount}</p>
                </div>
                <Plane className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
                </div>
                <Hotel className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Countries</p>
                  <p className="text-2xl font-bold">{countries.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Itinerary Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by destination, employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Itineraries Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredItineraries.length === 0 ? (
              <div className="p-12 text-center">
                <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Itineraries Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search criteria.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItineraries.map((itinerary) => (
                    <TableRow key={itinerary.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {itinerary.destination_city && `${itinerary.destination_city}, `}
                              {itinerary.destination_country}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {itinerary.employee_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {getArrivalTime(itinerary) ? (
                          format(new Date(getArrivalTime(itinerary)!), 'dd MMM HH:mm')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getHotelName(itinerary) || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {itinerary.training_venue_name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={itinerary.status === 'confirmed' ? 'default' : 'secondary'}
                        >
                          {itineraryStatusLabels[itinerary.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {itinerary.data_source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItinerary(itinerary)}
                        >
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

        {/* View Itinerary Dialog */}
        <Dialog open={!!selectedItinerary} onOpenChange={() => setSelectedItinerary(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Itinerary Details</DialogTitle>
            </DialogHeader>
            <ItineraryViewPanel 
              itinerary={selectedItinerary} 
              showSensitiveFields={true}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
