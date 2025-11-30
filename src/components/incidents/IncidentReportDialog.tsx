import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateIncident, IncidentType, IncidentSeverity, incidentTypeLabels, severityLabels } from '@/hooks/useIncidents';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface IncidentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  sessionId?: string;
  trainingRequestId?: string;
  travelVisaRequestId?: string;
  itineraryId?: string;
  defaultLocation?: {
    country?: string;
    city?: string;
  };
  onSuccess?: () => void;
}

const simplifiedTypes: { value: IncidentType; label: string }[] = [
  { value: 'flight_delay', label: 'Flight Issue (Delay/Cancellation)' },
  { value: 'missed_connection', label: 'Missed Connection' },
  { value: 'lost_baggage', label: 'Lost/Delayed Baggage' },
  { value: 'no_pickup', label: 'Transfer/Pick-up Issue' },
  { value: 'hotel_issue', label: 'Hotel/Accommodation Issue' },
  { value: 'medical_incident', label: 'Medical/Health Issue' },
  { value: 'security_threat', label: 'Safety/Security Concern' },
  { value: 'lost_stolen_documents', label: 'Lost/Stolen Documents' },
  { value: 'weather_disruption', label: 'Weather/Natural Event' },
  { value: 'other', label: 'Other Issue' },
];

export function IncidentReportDialog({
  open,
  onOpenChange,
  employeeId,
  sessionId,
  trainingRequestId,
  travelVisaRequestId,
  itineraryId,
  defaultLocation,
  onSuccess,
}: IncidentReportDialogProps) {
  const { toast } = useToast();
  const createIncident = useCreateIncident();

  const [formData, setFormData] = useState({
    incident_type: '' as IncidentType | '',
    severity: 'minor' as IncidentSeverity,
    incident_datetime: new Date().toISOString().slice(0, 16),
    location_country: defaultLocation?.country || '',
    location_city: defaultLocation?.city || '',
    location_detail: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.incident_type || !formData.description) {
      toast({
        title: 'Required fields missing',
        description: 'Please select an issue type and provide a description.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createIncident.mutateAsync({
        employee_id: employeeId,
        session_id: sessionId,
        training_request_id: trainingRequestId,
        travel_visa_request_id: travelVisaRequestId,
        itinerary_id: itineraryId,
        incident_type: formData.incident_type,
        severity: formData.severity,
        incident_datetime: new Date(formData.incident_datetime).toISOString(),
        location_country: formData.location_country || undefined,
        location_city: formData.location_city || undefined,
        location_detail: formData.location_detail || undefined,
        description: formData.description,
        status: 'open',
        source: 'employee_report',
        training_impact: 'none',
      });

      toast({
        title: 'Issue reported',
        description: 'Your travel issue has been submitted. The team will review it shortly.',
      });

      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        incident_type: '',
        severity: 'minor',
        incident_datetime: new Date().toISOString().slice(0, 16),
        location_country: defaultLocation?.country || '',
        location_city: defaultLocation?.city || '',
        location_detail: '',
        description: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit the issue. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Travel Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="incident_type">Issue Type *</Label>
            <Select
              value={formData.incident_type}
              onValueChange={(value) => setFormData({ ...formData, incident_type: value as IncidentType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {simplifiedTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value as IncidentSeverity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident_datetime">Date & Time</Label>
              <Input
                id="incident_datetime"
                type="datetime-local"
                value={formData.incident_datetime}
                onChange={(e) => setFormData({ ...formData, incident_datetime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location_country">Country</Label>
              <Input
                id="location_country"
                value={formData.location_country}
                onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                placeholder="e.g., United Kingdom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_city">City</Label>
              <Input
                id="location_city"
                value={formData.location_city}
                onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                placeholder="e.g., London"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_detail">Location Detail</Label>
            <Input
              id="location_detail"
              value={formData.location_detail}
              onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
              placeholder="e.g., Heathrow Airport Terminal 5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe the issue in detail..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createIncident.isPending}>
              {createIncident.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
