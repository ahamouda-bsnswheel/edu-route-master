import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Plane, 
  MapPin, 
  Calendar, 
  ExternalLink,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useTravelVisaRequests,
  getTravelReadiness,
  travelStatusLabels,
  visaStatusLabels
} from '@/hooks/useTravelVisa';
import { TravelReadinessIndicator } from '@/components/travel/TravelReadinessIndicator';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function MyAbroadTrainings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's abroad training requests
  const { data: abroadTrainings, isLoading: loadingTrainings } = useQuery({
    queryKey: ['my-abroad-trainings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_requests')
        .select(`
          id,
          request_number,
          status,
          preferred_start_date,
          preferred_end_date,
          created_at,
          courses (
            id,
            name_en,
            name_ar,
            training_location,
            abroad_country,
            abroad_city,
            duration_days
          )
        `)
        .eq('requester_id', user?.id)
        .in('status', ['approved', 'completed'])
        .not('courses.training_location', 'eq', 'local');

      if (error) throw error;
      
      // Filter out courses that are not abroad
      return data?.filter(t => 
        t.courses?.training_location === 'abroad' || 
        t.courses?.abroad_country
      ) || [];
    },
    enabled: !!user?.id
  });

  // Fetch travel visa requests for this user
  const { data: travelRequests, isLoading: loadingTravel } = useTravelVisaRequests({
    employeeId: user?.id
  });

  // Create a map of training_request_id to travel request
  const travelMap = React.useMemo(() => {
    const map = new Map();
    travelRequests?.forEach(req => {
      if (req.training_request_id) {
        map.set(req.training_request_id, req);
      }
    });
    return map;
  }, [travelRequests]);

  const isLoading = loadingTrainings || loadingTravel;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Abroad Trainings & Travel</h1>
          <p className="text-muted-foreground">
            View your international training programs and travel arrangements
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : abroadTrainings?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Abroad Trainings</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any approved international training programs yet.
              </p>
              <Button onClick={() => navigate('/courses')}>
                Browse Training Catalogue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                International Training Programs
              </CardTitle>
              <CardDescription>
                {abroadTrainings?.length} abroad training(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Travel Status</TableHead>
                    <TableHead>Visa Status</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abroadTrainings?.map((training) => {
                    const travel = travelMap.get(training.id);
                    const readiness = travel ? getTravelReadiness(travel) : 'critical';

                    return (
                      <TableRow key={training.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{training.courses?.name_en}</div>
                            <div className="text-sm text-muted-foreground">
                              {training.request_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {training.courses?.abroad_city && `${training.courses.abroad_city}, `}
                              {training.courses?.abroad_country}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {training.preferred_start_date 
                                ? format(new Date(training.preferred_start_date), 'dd MMM yyyy')
                                : 'TBD'
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={travel?.travel_status === 'ticketed' ? 'default' : 'secondary'}>
                            {travel ? travelStatusLabels[travel.travel_status] : 'Not Initiated'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            travel?.visa_status === 'approved' || 
                            travel?.visa_status === 'not_required' 
                              ? 'default' 
                              : 'secondary'
                          }>
                            {travel ? visaStatusLabels[travel.visa_status] : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TravelReadinessIndicator readiness={readiness} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/requests/${training.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Travel Reference Cards */}
        {travelRequests && travelRequests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {travelRequests.slice(0, 6).map(travel => (
              <Card key={travel.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{travel.destination_country}</span>
                    </div>
                    <TravelReadinessIndicator 
                      readiness={getTravelReadiness(travel)} 
                      size="sm"
                    />
                  </div>

                  <div className="space-y-2 text-sm">
                    {travel.travel_request_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Travel ID</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {travel.travel_request_id}
                        </code>
                      </div>
                    )}
                    {travel.visa_request_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Visa ID</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {travel.visa_request_id}
                        </code>
                      </div>
                    )}
                    {travel.travel_start_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Travel Dates</span>
                        <span>
                          {format(new Date(travel.travel_start_date), 'dd MMM')} - 
                          {travel.travel_end_date && format(new Date(travel.travel_end_date), 'dd MMM')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}