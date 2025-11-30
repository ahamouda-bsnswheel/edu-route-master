import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TravelIncident,
  IncidentStatus,
  TrainingImpact,
  useUpdateIncident,
  useIncidentAuditLog,
  incidentTypeLabels,
  severityLabels,
  trainingImpactLabels,
  incidentStatusLabels,
  severityColors,
  statusColors,
} from '@/hooks/useIncidents';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Clock, MapPin, AlertTriangle, FileText, History } from 'lucide-react';

interface IncidentDetailPanelProps {
  incident: TravelIncident;
  canEdit?: boolean;
  showConfidential?: boolean;
  onUpdate?: () => void;
}

export function IncidentDetailPanel({
  incident,
  canEdit = false,
  showConfidential = false,
  onUpdate,
}: IncidentDetailPanelProps) {
  const { toast } = useToast();
  const updateIncident = useUpdateIncident();
  const { data: auditLog, isLoading: auditLoading } = useIncidentAuditLog(incident.id);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: incident.status,
    training_impact: incident.training_impact,
    days_missed: incident.days_missed || 0,
    internal_notes: incident.internal_notes || '',
    actions_taken: incident.actions_taken || '',
    root_cause: incident.root_cause || '',
    outcome: incident.outcome || '',
    resolution_summary: incident.resolution_summary || '',
    follow_up_required: incident.follow_up_required || false,
    follow_up_description: incident.follow_up_description || '',
    follow_up_due_date: incident.follow_up_due_date || '',
    escalated_to: incident.escalated_to || '',
    escalation_reason: incident.escalation_reason || '',
  });

  const handleSave = async () => {
    try {
      await updateIncident.mutateAsync({
        incidentId: incident.id,
        data: formData,
      });

      toast({
        title: 'Incident updated',
        description: 'The incident has been updated successfully.',
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update incident.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {incidentTypeLabels[incident.incident_type]}
          </h2>
          <p className="text-sm text-muted-foreground">
            Reported {format(new Date(incident.created_at!), 'PPp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={severityColors[incident.severity]}>
            {severityLabels[incident.severity]}
          </Badge>
          <Badge className={statusColors[incident.status]}>
            {incidentStatusLabels[incident.status]}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {canEdit && <TabsTrigger value="manage">Manage</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                When & Where
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Date & Time:</span>
                <p className="font-medium">
                  {format(new Date(incident.incident_datetime), 'PPp')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Location:</span>
                <p className="font-medium">
                  {[incident.location_city, incident.location_country].filter(Boolean).join(', ') || 'Not specified'}
                </p>
              </div>
              {incident.location_detail && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Detail:</span>
                  <p className="font-medium">{incident.location_detail}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
            </CardContent>
          </Card>

          {/* Training Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Training Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Impact:</span>
                <Badge variant="outline">
                  {trainingImpactLabels[incident.training_impact]}
                </Badge>
              </div>
              {incident.days_missed && incident.days_missed > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days Missed:</span>
                  <span className="font-medium">{incident.days_missed}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Taken */}
          {incident.actions_taken && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions Taken</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{incident.actions_taken}</p>
              </CardContent>
            </Card>
          )}

          {/* Resolution */}
          {incident.resolution_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{incident.resolution_summary}</p>
                {incident.resolved_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved on {format(new Date(incident.resolved_at), 'PPp')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {canEdit && (
          <TabsContent value="manage" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Update Incident</CardTitle>
                {!isEditing && (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as IncidentStatus })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(incidentStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Training Impact</Label>
                    <Select
                      value={formData.training_impact}
                      onValueChange={(value) => setFormData({ ...formData, training_impact: value as TrainingImpact })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(trainingImpactLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.training_impact === 'missed_days' && (
                  <div className="space-y-2">
                    <Label>Days Missed</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.days_missed}
                      onChange={(e) => setFormData({ ...formData, days_missed: parseInt(e.target.value) || 0 })}
                      disabled={!isEditing}
                    />
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    placeholder="Notes visible to L&D/Travel team only..."
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Actions Taken</Label>
                  <Textarea
                    value={formData.actions_taken}
                    onChange={(e) => setFormData({ ...formData, actions_taken: e.target.value })}
                    placeholder="Document actions taken to resolve..."
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Root Cause</Label>
                  <Textarea
                    value={formData.root_cause}
                    onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                    placeholder="Root cause analysis..."
                    rows={2}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resolution Summary</Label>
                  <Textarea
                    value={formData.resolution_summary}
                    onChange={(e) => setFormData({ ...formData, resolution_summary: e.target.value })}
                    placeholder="Final resolution summary..."
                    rows={2}
                    disabled={!isEditing}
                  />
                </div>

                {formData.status === 'escalated' && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Escalated To</Label>
                        <Select
                          value={formData.escalated_to}
                          onValueChange={(value) => setFormData({ ...formData, escalated_to: value })}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="risk">Risk Management</SelectItem>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="executive">Executive</SelectItem>
                            <SelectItem value="hse">HSE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Escalation Reason</Label>
                      <Textarea
                        value={formData.escalation_reason}
                        onChange={(e) => setFormData({ ...formData, escalation_reason: e.target.value })}
                        placeholder="Reason for escalation..."
                        rows={2}
                        disabled={!isEditing}
                      />
                    </div>
                  </>
                )}

                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={updateIncident.isPending}>
                      {updateIncident.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Audit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : auditLog && auditLog.length > 0 ? (
                <div className="space-y-3">
                  {auditLog.map((log: any) => (
                    <div key={log.id} className="border-l-2 border-muted pl-3 py-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      {log.field_changed && (
                        <p className="text-xs text-muted-foreground">
                          {log.field_changed}: {log.old_value} → {log.new_value}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'PPp')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No history available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
