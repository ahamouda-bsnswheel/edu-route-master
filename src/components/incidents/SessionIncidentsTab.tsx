import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useSessionIncidents,
  useCreateIncident,
  TravelIncident,
  IncidentStatus,
  incidentTypeLabels,
  severityLabels,
  trainingImpactLabels,
  incidentStatusLabels,
  severityColors,
  statusColors,
} from '@/hooks/useIncidents';
import { IncidentDetailPanel } from './IncidentDetailPanel';
import { IncidentReportDialog } from './IncidentReportDialog';
import { format } from 'date-fns';
import { AlertTriangle, Download, Plus, Search, Filter, Loader2 } from 'lucide-react';

interface SessionIncidentsTabProps {
  sessionId: string;
  participants: Array<{
    id: string;
    employee_id: string;
    employee_name?: string;
    entity?: string;
    site?: string;
  }>;
}

export function SessionIncidentsTab({ sessionId, participants }: SessionIncidentsTabProps) {
  const { data: incidents, isLoading, refetch } = useSessionIncidents(sessionId);
  const [selectedIncident, setSelectedIncident] = useState<TravelIncident | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Summary stats
  const totalIncidents = incidents?.length || 0;
  const openIncidents = incidents?.filter((i) => i.status === 'open' || i.status === 'under_review').length || 0;
  const criticalIncidents = incidents?.filter((i) => i.severity === 'critical' || i.severity === 'major').length || 0;
  const withTrainingImpact = incidents?.filter((i) => i.training_impact !== 'none').length || 0;

  // Filter incidents
  const filteredIncidents = incidents?.filter((incident) => {
    if (statusFilter !== 'all' && incident.status !== statusFilter) return false;
    if (severityFilter !== 'all' && incident.severity !== severityFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesType = incidentTypeLabels[incident.incident_type].toLowerCase().includes(term);
      const matchesLocation = incident.location_city?.toLowerCase().includes(term) ||
        incident.location_country?.toLowerCase().includes(term);
      if (!matchesType && !matchesLocation) return false;
    }
    return true;
  }) || [];

  const handleExport = () => {
    if (!filteredIncidents.length) return;

    const headers = ['Type', 'Severity', 'Status', 'Date', 'Location', 'Training Impact', 'Description'];
    const rows = filteredIncidents.map((i) => [
      incidentTypeLabels[i.incident_type],
      severityLabels[i.severity],
      incidentStatusLabels[i.status],
      format(new Date(i.incident_datetime), 'yyyy-MM-dd HH:mm'),
      [i.location_city, i.location_country].filter(Boolean).join(', '),
      trainingImpactLabels[i.training_impact],
      i.description.replace(/"/g, '""'),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-incidents-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogIncident = (participantId: string) => {
    setSelectedParticipant(participantId);
    setShowReportDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalIncidents}</div>
            <p className="text-sm text-muted-foreground">Total Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{openIncidents}</div>
            <p className="text-sm text-muted-foreground">Open / Under Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{criticalIncidents}</div>
            <p className="text-sm text-muted-foreground">Major / Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{withTrainingImpact}</div>
            <p className="text-sm text-muted-foreground">With Training Impact</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(incidentStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredIncidents.length}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Session Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {totalIncidents === 0 ? 'No incidents reported for this session.' : 'No incidents match the current filters.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Training Impact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">
                      {incidentTypeLabels[incident.incident_type]}
                    </TableCell>
                    <TableCell>
                      <Badge className={severityColors[incident.severity]}>
                        {severityLabels[incident.severity]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[incident.status]}>
                        {incidentStatusLabels[incident.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(incident.incident_datetime), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      {[incident.location_city, incident.location_country].filter(Boolean).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {trainingImpactLabels[incident.training_impact]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Participants Quick Log */}
      <Card>
        <CardHeader>
          <CardTitle>Log Incident for Participant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {participants.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => handleLogIncident(p.employee_id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {p.employee_name || p.employee_id.slice(0, 8)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <IncidentDetailPanel
              incident={selectedIncident}
              canEdit={true}
              onUpdate={() => {
                refetch();
                setSelectedIncident(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <IncidentReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        employeeId={selectedParticipant || ''}
        sessionId={sessionId}
        onSuccess={() => {
          refetch();
          setSelectedParticipant(null);
        }}
      />
    </div>
  );
}
