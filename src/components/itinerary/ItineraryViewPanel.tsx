import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plane,
  Hotel,
  Car,
  MapPin,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  AlertTriangle,
  User,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { TravelItinerary, itineraryStatusLabels } from '@/hooks/useItinerary';

interface ItineraryViewPanelProps {
  itinerary: TravelItinerary | null;
  isLoading?: boolean;
  showSensitiveFields?: boolean; // For PNR, ticket numbers etc
  compact?: boolean;
}

export function ItineraryViewPanel({
  itinerary,
  isLoading,
  showSensitiveFields = false,
  compact = false,
}: ItineraryViewPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!itinerary) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Itinerary Available</h3>
          <p className="text-muted-foreground">
            Your travel arrangements are still being organized.
          </p>
        </CardContent>
      </Card>
    );
  }

  const outboundFlights = itinerary.flight_segments?.filter(f => f.segment_type === 'outbound') || [];
  const returnFlights = itinerary.flight_segments?.filter(f => f.segment_type === 'return') || [];
  const accommodations = itinerary.accommodations || [];
  const groundTransport = itinerary.ground_transport || [];

  const statusColor = {
    draft: 'secondary',
    confirmed: 'default',
    completed: 'outline',
    cancelled: 'destructive',
  }[itinerary.status] as 'default' | 'secondary' | 'outline' | 'destructive';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {itinerary.destination_city ? `${itinerary.destination_city}, ` : ''}
                {itinerary.destination_country}
              </CardTitle>
              <CardDescription>Travel Itinerary</CardDescription>
            </div>
            <Badge variant={statusColor}>
              {itineraryStatusLabels[itinerary.status]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Safety/HSE Notes Alert */}
      {(itinerary.safety_notes || itinerary.hse_instructions) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Safety Information:</strong>{' '}
            {itinerary.safety_notes || itinerary.hse_instructions}
          </AlertDescription>
        </Alert>
      )}

      {/* Flights Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Flight Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Outbound Flights */}
          {outboundFlights.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Outbound</h4>
              {outboundFlights.map((flight, idx) => (
                <FlightSegmentCard 
                  key={flight.id || idx} 
                  flight={flight} 
                  showSensitiveFields={showSensitiveFields}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No outbound flights added yet.</p>
          )}

          {returnFlights.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Return</h4>
                {returnFlights.map((flight, idx) => (
                  <FlightSegmentCard 
                    key={flight.id || idx} 
                    flight={flight}
                    showSensitiveFields={showSensitiveFields}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Accommodation Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            Accommodation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accommodations.length > 0 ? (
            <div className="space-y-4">
              {accommodations.map((acc, idx) => (
                <AccommodationCard 
                  key={acc.id || idx} 
                  accommodation={acc}
                  showSensitiveFields={showSensitiveFields}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No accommodation details added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Training Venue */}
      {itinerary.training_venue_name && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Training Venue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-medium">{itinerary.training_venue_name}</div>
            {itinerary.training_venue_address && (
              <p className="text-sm text-muted-foreground">{itinerary.training_venue_address}</p>
            )}
            {itinerary.training_venue_map_url && (
              <a 
                href={itinerary.training_venue_map_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View on Map
              </a>
            )}
            {(itinerary.training_venue_contact_name || itinerary.training_venue_contact_phone) && (
              <div className="flex items-center gap-4 pt-2 text-sm">
                {itinerary.training_venue_contact_name && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {itinerary.training_venue_contact_name}
                  </span>
                )}
                {itinerary.training_venue_contact_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {itinerary.training_venue_contact_phone}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ground Transport */}
      {groundTransport.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Ground Transportation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groundTransport.map((transport, idx) => (
                <GroundTransportCard key={transport.id || idx} transport={transport} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Instructions */}
      {(itinerary.notes || itinerary.dietary_requirements || itinerary.mobility_needs) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Special Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {itinerary.dietary_requirements && (
              <div>
                <span className="font-medium">Dietary Requirements:</span>{' '}
                {itinerary.dietary_requirements}
              </div>
            )}
            {itinerary.mobility_needs && (
              <div>
                <span className="font-medium">Mobility Needs:</span>{' '}
                {itinerary.mobility_needs}
              </div>
            )}
            {itinerary.notes && (
              <div>
                <span className="font-medium">Notes:</span> {itinerary.notes}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Read-only notice */}
      <p className="text-xs text-muted-foreground text-center">
        This itinerary is read-only. Contact Travel/L&D if corrections are needed.
      </p>
    </div>
  );
}

// Sub-components
function FlightSegmentCard({ flight, showSensitiveFields }: { flight: any; showSensitiveFields?: boolean }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {flight.from_city || flight.from_airport_code} → {flight.to_city || flight.to_airport_code}
          </span>
          {flight.manually_edited && (
            <Badge variant="outline" className="text-xs">Edited</Badge>
          )}
        </div>
        {flight.airline_name && (
          <span className="text-sm text-muted-foreground">
            {flight.airline_name} {flight.flight_number}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {flight.departure_datetime && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Dep: {format(new Date(flight.departure_datetime), 'dd MMM HH:mm')}
          </span>
        )}
        {flight.arrival_datetime && (
          <span className="flex items-center gap-1">
            Arr: {format(new Date(flight.arrival_datetime), 'dd MMM HH:mm')}
          </span>
        )}
      </div>
      {showSensitiveFields && flight.pnr_number && (
        <div className="text-xs text-muted-foreground">
          PNR: {flight.pnr_number}
          {flight.seat_number && ` | Seat: ${flight.seat_number}`}
        </div>
      )}
    </div>
  );
}

function AccommodationCard({ accommodation, showSensitiveFields }: { accommodation: any; showSensitiveFields?: boolean }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="font-medium">{accommodation.hotel_name}</div>
      {accommodation.hotel_address && (
        <p className="text-sm text-muted-foreground">{accommodation.hotel_address}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {accommodation.check_in_date && (
          <span>Check-in: {format(new Date(accommodation.check_in_date), 'dd MMM yyyy')}</span>
        )}
        {accommodation.check_out_date && (
          <span>Check-out: {format(new Date(accommodation.check_out_date), 'dd MMM yyyy')}</span>
        )}
      </div>
      {accommodation.hotel_phone && (
        <div className="flex items-center gap-1 text-sm">
          <Phone className="h-3 w-3" />
          {accommodation.hotel_phone}
        </div>
      )}
      {showSensitiveFields && accommodation.confirmation_number && (
        <div className="text-xs text-muted-foreground">
          Confirmation: {accommodation.confirmation_number}
        </div>
      )}
    </div>
  );
}

function GroundTransportCard({ transport }: { transport: any }) {
  const typeLabels: Record<string, string> = {
    airport_pickup: 'Airport Pickup',
    airport_dropoff: 'Airport Drop-off',
    hotel_shuttle: 'Hotel Shuttle',
    venue_transfer: 'Venue Transfer',
    other: 'Other',
  };

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{typeLabels[transport.transport_type] || transport.transport_type}</Badge>
        {transport.pickup_datetime && (
          <span className="text-sm text-muted-foreground">
            {format(new Date(transport.pickup_datetime), 'dd MMM HH:mm')}
          </span>
        )}
      </div>
      {transport.pickup_location && (
        <div className="text-sm">
          <span className="text-muted-foreground">From:</span> {transport.pickup_location}
        </div>
      )}
      {transport.dropoff_location && (
        <div className="text-sm">
          <span className="text-muted-foreground">To:</span> {transport.dropoff_location}
        </div>
      )}
      {transport.meeting_point_description && (
        <div className="text-sm text-muted-foreground">
          <strong>Meeting Point:</strong> {transport.meeting_point_description}
        </div>
      )}
      {(transport.driver_name || transport.driver_phone) && (
        <div className="flex items-center gap-4 text-sm">
          {transport.driver_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {transport.driver_name}
            </span>
          )}
          {transport.driver_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {transport.driver_phone}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
