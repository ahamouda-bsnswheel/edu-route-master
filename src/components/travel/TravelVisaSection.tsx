import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, FileText, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { 
  useTravelVisaRequests, 
  useInitiateTravelVisa, 
  TravelVisaRequest,
  getTravelReadiness,
  travelStatusLabels,
  visaStatusLabels
} from '@/hooks/useTravelVisa';
import { TravelReadinessIndicator } from './TravelReadinessIndicator';
import { ManualLinkDialog } from './ManualLinkDialog';

interface TravelVisaSectionProps {
  trainingRequestId: string;
  employeeId: string;
  courseName: string;
  destinationCountry: string;
  destinationCity?: string;
  trainingStartDate: string;
  trainingEndDate: string;
  isApproved: boolean;
}

export function TravelVisaSection({
  trainingRequestId,
  employeeId,
  courseName,
  destinationCountry,
  destinationCity,
  trainingStartDate,
  trainingEndDate,
  isApproved
}: TravelVisaSectionProps) {
  const [showManualLink, setShowManualLink] = useState(false);

  const { data: travelRequests, isLoading } = useTravelVisaRequests({
    trainingRequestId
  });

  const initiateMutation = useInitiateTravelVisa();

  const existingRequest = travelRequests?.[0];

  const handleInitiateTravel = () => {
    initiateMutation.mutate({
      trainingRequestId,
      employeeId,
      destinationCountry,
      destinationCity,
      travelStartDate: trainingStartDate,
      travelEndDate: trainingEndDate,
      trainingStartDate,
      trainingEndDate,
      courseName
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Travel & Visa Requirements
        </CardTitle>
        <CardDescription>
          Destination: {destinationCity ? `${destinationCity}, ` : ''}{destinationCountry}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingRequest ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Readiness</span>
              <TravelReadinessIndicator readiness={getTravelReadiness(existingRequest)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Travel Status */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Travel Request</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={existingRequest.travel_status === 'ticketed' ? 'default' : 'secondary'}>
                      {travelStatusLabels[existingRequest.travel_status]}
                    </Badge>
                  </div>
                  {existingRequest.travel_request_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Request ID</span>
                      <span className="text-sm font-mono">{existingRequest.travel_request_id}</span>
                    </div>
                  )}
                  {existingRequest.travel_booking_reference && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Booking Ref</span>
                      <span className="text-sm font-mono">{existingRequest.travel_booking_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Visa Status */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Visa Request</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={existingRequest.visa_status === 'approved' || existingRequest.visa_status === 'not_required' ? 'default' : 'secondary'}>
                      {visaStatusLabels[existingRequest.visa_status]}
                    </Badge>
                  </div>
                  {existingRequest.visa_request_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Request ID</span>
                      <span className="text-sm font-mono">{existingRequest.visa_request_id}</span>
                    </div>
                  )}
                  {existingRequest.visa_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Visa No.</span>
                      <span className="text-sm font-mono">{existingRequest.visa_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Summary - if available */}
            {existingRequest.total_travel_cost && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <span className="text-sm font-medium">Estimated Travel Cost</span>
                <p className="text-2xl font-bold mt-1">
                  {existingRequest.travel_cost_currency} {existingRequest.total_travel_cost.toLocaleString()}
                </p>
              </div>
            )}

            {existingRequest.initiation_method === 'external' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Linked from external system
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            {isApproved ? (
              <>
                <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Your training request is approved. You can now initiate travel and visa arrangements.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button 
                    onClick={handleInitiateTravel}
                    disabled={initiateMutation.isPending}
                  >
                    {initiateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Initiate Travel & Visa Request
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowManualLink(true)}
                  >
                    Link Existing Travel Request
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Travel and visa requests can be initiated once your training request is approved.
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>

      <ManualLinkDialog
        open={showManualLink}
        onOpenChange={setShowManualLink}
        trainingRequestId={trainingRequestId}
        employeeId={employeeId}
        destinationCountry={destinationCountry}
        destinationCity={destinationCity}
        trainingStartDate={trainingStartDate}
        trainingEndDate={trainingEndDate}
      />
    </Card>
  );
}