import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCreateItinerary, FlightSegment, Accommodation, GroundTransport } from '@/hooks/useItinerary';
import { Plane, Hotel, Car, MapPin, Plus, Trash2, Loader2 } from 'lucide-react';

interface ItineraryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  trainingRequestId?: string;
  employeeId?: string;
  employeeName?: string;
  destinationCountry?: string;
  destinationCity?: string;
}

export function ItineraryFormDialog({
  open,
  onOpenChange,
  sessionId,
  trainingRequestId,
  employeeId,
  employeeName,
  destinationCountry = '',
  destinationCity = '',
}: ItineraryFormDialogProps) {
  const { toast } = useToast();
  const createItinerary = useCreateItinerary();

  // Main itinerary state
  const [status, setStatus] = useState<string>('draft');
  const [destCountry, setDestCountry] = useState(destinationCountry);
  const [destCity, setDestCity] = useState(destinationCity);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueMapUrl, setVenueMapUrl] = useState('');
  const [venueContactName, setVenueContactName] = useState('');
  const [venueContactPhone, setVenueContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');

  // Flight segments
  const [flights, setFlights] = useState<Partial<FlightSegment>[]>([
    { segment_type: 'outbound', segment_order: 1 },
  ]);

  // Accommodations
  const [accommodations, setAccommodations] = useState<Partial<Accommodation>[]>([
    { hotel_name: '' },
  ]);

  // Ground transport
  const [transports, setTransports] = useState<Partial<GroundTransport>[]>([]);

  const addFlight = () => {
    setFlights([...flights, { segment_type: 'return', segment_order: flights.length + 1 }]);
  };

  const removeFlight = (index: number) => {
    setFlights(flights.filter((_, i) => i !== index));
  };

  const updateFlight = (index: number, field: string, value: any) => {
    const updated = [...flights];
    updated[index] = { ...updated[index], [field]: value };
    setFlights(updated);
  };

  const addAccommodation = () => {
    setAccommodations([...accommodations, { hotel_name: '' }]);
  };

  const removeAccommodation = (index: number) => {
    setAccommodations(accommodations.filter((_, i) => i !== index));
  };

  const updateAccommodation = (index: number, field: string, value: any) => {
    const updated = [...accommodations];
    updated[index] = { ...updated[index], [field]: value };
    setAccommodations(updated);
  };

  const addTransport = () => {
    setTransports([...transports, { transport_type: 'airport_pickup' }]);
  };

  const removeTransport = (index: number) => {
    setTransports(transports.filter((_, i) => i !== index));
  };

  const updateTransport = (index: number, field: string, value: any) => {
    const updated = [...transports];
    updated[index] = { ...updated[index], [field]: value };
    setTransports(updated);
  };

  const handleSubmit = async () => {
    if (!employeeId || !destCountry) {
      toast({
        title: 'Missing required fields',
        description: 'Employee and destination country are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createItinerary.mutateAsync({
        itinerary: {
          employee_id: employeeId,
          session_id: sessionId,
          training_request_id: trainingRequestId,
          destination_country: destCountry,
          destination_city: destCity || undefined,
          status: status as any,
          training_venue_name: venueName || undefined,
          training_venue_address: venueAddress || undefined,
          training_venue_map_url: venueMapUrl || undefined,
          training_venue_contact_name: venueContactName || undefined,
          training_venue_contact_phone: venueContactPhone || undefined,
          notes: notes || undefined,
          safety_notes: safetyNotes || undefined,
          data_source: 'manual',
        },
        flight_segments: flights.filter(f => f.from_city || f.to_city) as FlightSegment[],
        accommodations: accommodations.filter(a => a.hotel_name) as Accommodation[],
        ground_transport: transports.filter(t => t.pickup_location || t.dropoff_location) as GroundTransport[],
      });

      toast({
        title: 'Itinerary created',
        description: 'The itinerary has been saved successfully.',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create itinerary.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create Itinerary {employeeName && `for ${employeeName}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="flights">Flights</TabsTrigger>
            <TabsTrigger value="hotel">Hotel</TabsTrigger>
            <TabsTrigger value="transport">Transport</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destination Country *</Label>
                <Input
                  value={destCountry}
                  onChange={(e) => setDestCountry(e.target.value)}
                  placeholder="e.g., United Kingdom"
                />
              </div>
              <div className="space-y-2">
                <Label>Destination City</Label>
                <Input
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                  placeholder="e.g., London"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Training Venue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Venue Name</Label>
                  <Input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g., Training Center London"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="Full address"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Map URL</Label>
                  <Input
                    value={venueMapUrl}
                    onChange={(e) => setVenueMapUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={venueContactName}
                      onChange={(e) => setVenueContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      value={venueContactPhone}
                      onChange={(e) => setVenueContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Safety/HSE Notes</Label>
              <Textarea
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                placeholder="Emergency contacts, PPE requirements, etc."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>General Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </TabsContent>

          {/* Flights Tab */}
          <TabsContent value="flights" className="space-y-4">
            {flights.map((flight, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      {flight.segment_type === 'outbound' ? 'Outbound Flight' : 'Return Flight'}
                    </CardTitle>
                    {flights.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeFlight(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Segment Type</Label>
                      <Select
                        value={flight.segment_type}
                        onValueChange={(v) => updateFlight(index, 'segment_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outbound">Outbound</SelectItem>
                          <SelectItem value="return">Return</SelectItem>
                          <SelectItem value="connection">Connection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Flight Number</Label>
                      <Input
                        value={flight.flight_number || ''}
                        onChange={(e) => updateFlight(index, 'flight_number', e.target.value)}
                        placeholder="e.g., BA123"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From City</Label>
                      <Input
                        value={flight.from_city || ''}
                        onChange={(e) => updateFlight(index, 'from_city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To City</Label>
                      <Input
                        value={flight.to_city || ''}
                        onChange={(e) => updateFlight(index, 'to_city', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Departure Date/Time</Label>
                      <Input
                        type="datetime-local"
                        value={flight.departure_datetime?.slice(0, 16) || ''}
                        onChange={(e) => updateFlight(index, 'departure_datetime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Arrival Date/Time</Label>
                      <Input
                        type="datetime-local"
                        value={flight.arrival_datetime?.slice(0, 16) || ''}
                        onChange={(e) => updateFlight(index, 'arrival_datetime', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Airline</Label>
                      <Input
                        value={flight.airline_name || ''}
                        onChange={(e) => updateFlight(index, 'airline_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PNR/Booking Ref</Label>
                      <Input
                        value={flight.pnr_number || ''}
                        onChange={(e) => updateFlight(index, 'pnr_number', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addFlight} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Flight
            </Button>
          </TabsContent>

          {/* Hotel Tab */}
          <TabsContent value="hotel" className="space-y-4">
            {accommodations.map((acc, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Hotel className="h-4 w-4" />
                      Accommodation {index + 1}
                    </CardTitle>
                    {accommodations.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeAccommodation(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Hotel Name *</Label>
                    <Input
                      value={acc.hotel_name || ''}
                      onChange={(e) => updateAccommodation(index, 'hotel_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea
                      value={acc.hotel_address || ''}
                      onChange={(e) => updateAccommodation(index, 'hotel_address', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Check-in Date</Label>
                      <Input
                        type="date"
                        value={acc.check_in_date || ''}
                        onChange={(e) => updateAccommodation(index, 'check_in_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Check-out Date</Label>
                      <Input
                        type="date"
                        value={acc.check_out_date || ''}
                        onChange={(e) => updateAccommodation(index, 'check_out_date', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={acc.hotel_phone || ''}
                        onChange={(e) => updateAccommodation(index, 'hotel_phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmation #</Label>
                      <Input
                        value={acc.confirmation_number || ''}
                        onChange={(e) => updateAccommodation(index, 'confirmation_number', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addAccommodation} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Accommodation
            </Button>
          </TabsContent>

          {/* Transport Tab */}
          <TabsContent value="transport" className="space-y-4">
            {transports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No ground transport added yet.</p>
              </div>
            ) : (
              transports.map((transport, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Transport {index + 1}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => removeTransport(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={transport.transport_type}
                        onValueChange={(v) => updateTransport(index, 'transport_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="airport_pickup">Airport Pickup</SelectItem>
                          <SelectItem value="airport_dropoff">Airport Drop-off</SelectItem>
                          <SelectItem value="hotel_shuttle">Hotel Shuttle</SelectItem>
                          <SelectItem value="venue_transfer">Venue Transfer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pickup Date/Time</Label>
                      <Input
                        type="datetime-local"
                        value={transport.pickup_datetime?.slice(0, 16) || ''}
                        onChange={(e) => updateTransport(index, 'pickup_datetime', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pickup Location</Label>
                        <Input
                          value={transport.pickup_location || ''}
                          onChange={(e) => updateTransport(index, 'pickup_location', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Drop-off Location</Label>
                        <Input
                          value={transport.dropoff_location || ''}
                          onChange={(e) => updateTransport(index, 'dropoff_location', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Point</Label>
                      <Textarea
                        value={transport.meeting_point_description || ''}
                        onChange={(e) => updateTransport(index, 'meeting_point_description', e.target.value)}
                        placeholder="e.g., Arrivals Hall, sign with company logo"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Driver Name</Label>
                        <Input
                          value={transport.driver_name || ''}
                          onChange={(e) => updateTransport(index, 'driver_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Driver Phone</Label>
                        <Input
                          value={transport.driver_phone || ''}
                          onChange={(e) => updateTransport(index, 'driver_phone', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            <Button variant="outline" onClick={addTransport} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Ground Transport
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createItinerary.isPending}>
            {createItinerary.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Itinerary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
