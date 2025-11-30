import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  AlertTriangle,
  Search,
  Download,
  Eye,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { useSessionItineraries, TravelItinerary, itineraryStatusLabels } from '@/hooks/useItinerary';
import { ItineraryViewPanel } from './ItineraryViewPanel';
import { ItineraryFormDialog } from './ItineraryFormDialog';

interface SessionItineraryTabProps {
  sessionId: string;
  participants: Array<{
    id: string;
    employee_id: string;
    employee_name?: string;
    entity?: string;
    site?: string;
  }>;
}

export function SessionItineraryTab({ sessionId, participants }: SessionItineraryTabProps) {
  const { data: itineraries, isLoading } = useSessionItineraries(sessionId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItinerary, setSelectedItinerary] = useState<TravelItinerary | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

  // Create a map of employee_id to itinerary
  const itineraryMap = new Map<string, TravelItinerary>();
  itineraries?.forEach(it => {
    itineraryMap.set(it.employee_id, it);
  });

  // Combine participants with their itineraries
  const participantsWithItineraries = participants.map(p => ({
    ...p,
    itinerary: itineraryMap.get(p.employee_id),
  }));

  // Filter
  const filteredParticipants = participantsWithItineraries.filter(p => {
    const matchesSearch = !searchTerm || 
      p.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'missing' && !p.itinerary) ||
      (statusFilter !== 'missing' && p.itinerary?.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalParticipants = participants.length;
  const confirmedCount = participantsWithItineraries.filter(p => p.itinerary?.status === 'confirmed').length;
  const missingCount = participantsWithItineraries.filter(p => !p.itinerary).length;

  const getArrivalTime = (itinerary?: TravelItinerary) => {
    const outbound = itinerary?.flight_segments?.find(f => f.segment_type === 'outbound');
    return outbound?.arrival_datetime;
  };

  const getDepartureTime = (itinerary?: TravelItinerary) => {
    const returnFlight = itinerary?.flight_segments?.find(f => f.segment_type === 'return');
    return returnFlight?.departure_datetime;
  };

  const getHotelName = (itinerary?: TravelItinerary) => {
    return itinerary?.accommodations?.[0]?.hotel_name;
  };

  const handleExport = () => {
    // Create CSV data
    const headers = ['Name', 'Entity', 'Arrival', 'Departure', 'Hotel', 'Status'];
    const rows = filteredParticipants.map(p => [
      p.employee_name || '',
      p.entity || '',
      getArrivalTime(p.itinerary) ? format(new Date(getArrivalTime(p.itinerary)!), 'dd MMM HH:mm') : '',
      getDepartureTime(p.itinerary) ? format(new Date(getDepartureTime(p.itinerary)!), 'dd MMM HH:mm') : '',
      getHotelName(p.itinerary) || '',
      p.itinerary ? itineraryStatusLabels[p.itinerary.status] : 'No Itinerary',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-itineraries-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold">{totalParticipants}</p>
              </div>
              <Plane className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed Itineraries</p>
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
                <p className="text-sm text-muted-foreground">Missing Itineraries</p>
                <p className="text-2xl font-bold text-amber-600">{missingCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Participant Itineraries</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Entity/Site</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">
                    {participant.employee_name || participant.employee_id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {participant.entity}
                    {participant.site && ` / ${participant.site}`}
                  </TableCell>
                  <TableCell>
                    {getArrivalTime(participant.itinerary) ? (
                      format(new Date(getArrivalTime(participant.itinerary)!), 'dd MMM HH:mm')
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getDepartureTime(participant.itinerary) ? (
                      format(new Date(getDepartureTime(participant.itinerary)!), 'dd MMM HH:mm')
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getHotelName(participant.itinerary) || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {participant.itinerary ? (
                      <Badge 
                        variant={participant.itinerary.status === 'confirmed' ? 'default' : 'secondary'}
                      >
                        {itineraryStatusLabels[participant.itinerary.status]}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">No Itinerary</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {participant.itinerary ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItinerary(participant.itinerary!)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedParticipant(participant);
                            setShowCreateDialog(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      {/* Create Itinerary Dialog */}
      <ItineraryFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        sessionId={sessionId}
        employeeId={selectedParticipant?.employee_id}
        employeeName={selectedParticipant?.employee_name}
      />
    </div>
  );
}
