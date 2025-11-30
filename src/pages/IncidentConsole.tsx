import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useIncidents,
  useExportIncidents,
  TravelIncident,
  IncidentFilters,
  incidentTypeLabels,
  severityLabels,
  trainingImpactLabels,
  incidentStatusLabels,
  severityColors,
  statusColors,
} from '@/hooks/useIncidents';
import { IncidentDetailPanel } from '@/components/incidents/IncidentDetailPanel';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import {
  AlertTriangle,
  Download,
  Search,
  Filter,
  Loader2,
  BarChart3,
  RefreshCw,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function IncidentConsole() {
  const { toast } = useToast();
  const [selectedIncident, setSelectedIncident] = useState<TravelIncident | null>(null);
  const [filters, setFilters] = useState<IncidentFilters>({
    date_from: subDays(new Date(), 90).toISOString(),
  });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: incidents, isLoading, refetch } = useIncidents(filters);
  const exportMutation = useExportIncidents();

  // Summary stats
  const totalIncidents = incidents?.length || 0;
  const openIncidents = incidents?.filter((i) => i.status === 'open' || i.status === 'under_review').length || 0;
  const criticalIncidents = incidents?.filter((i) => i.severity === 'critical' || i.severity === 'major').length || 0;
  const escalatedIncidents = incidents?.filter((i) => i.status === 'escalated').length || 0;

  // Group by type for chart
  const byType = incidents?.reduce((acc, i) => {
    acc[i.incident_type] = (acc[i.incident_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Filter locally by search term
  const filteredIncidents = incidents?.filter((incident) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      incidentTypeLabels[incident.incident_type].toLowerCase().includes(term) ||
      incident.location_city?.toLowerCase().includes(term) ||
      incident.location_country?.toLowerCase().includes(term) ||
      incident.description.toLowerCase().includes(term)
    );
  }) || [];

  const handleExport = async () => {
    try {
      const data = await exportMutation.mutateAsync(filters);
      
      const headers = ['ID', 'Type', 'Severity', 'Status', 'Date', 'Location', 'Training Impact', 'Description', 'Source'];
      const rows = data.map((i) => [
        i.id,
        incidentTypeLabels[i.incident_type],
        severityLabels[i.severity],
        incidentStatusLabels[i.status],
        format(new Date(i.incident_datetime), 'yyyy-MM-dd HH:mm'),
        [i.location_city, i.location_country].filter(Boolean).join(', '),
        trainingImpactLabels[i.training_impact],
        i.description.replace(/"/g, '""'),
        i.source || 'manual',
      ]);

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidents-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export complete',
        description: `Exported ${data.length} incidents.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export incidents.',
        variant: 'destructive',
      });
    }
  };

  const updateFilter = (key: keyof IncidentFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Travel Incident Console</h1>
            <p className="text-muted-foreground">Track and manage travel disruptions and incidents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{totalIncidents}</div>
              <p className="text-sm text-muted-foreground">Total Incidents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-red-600">{openIncidents}</div>
              <p className="text-sm text-muted-foreground">Open / Under Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-orange-600">{criticalIncidents}</div>
              <p className="text-sm text-muted-foreground">Major / Critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-purple-600">{escalatedIncidents}</div>
              <p className="text-sm text-muted-foreground">Escalated</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Incident List</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status?.[0] || 'all'}
                      onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
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
                  </div>

                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={filters.severity?.[0] || 'all'}
                      onValueChange={(v) => updateFilter('severity', v === 'all' ? undefined : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        {Object.entries(severityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={filters.incident_type?.[0] || 'all'}
                      onValueChange={(v) => updateFilter('incident_type', v === 'all' ? undefined : [v])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(incidentTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={filters.date_from?.slice(0, 10) || ''}
                      onChange={(e) => updateFilter('date_from', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={filters.date_to?.slice(0, 10) || ''}
                      onChange={(e) => updateFilter('date_to', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Incidents Table */}
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No incidents found matching your criteria.
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
                        <TableHead>Source</TableHead>
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
                            {format(new Date(incident.incident_datetime), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            {[incident.location_city, incident.location_country].filter(Boolean).join(', ') || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {trainingImpactLabels[incident.training_impact]}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {incident.source?.replace('_', ' ') || 'manual'}
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Analytics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Incidents by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(byType)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm">{incidentTypeLabels[type as keyof typeof incidentTypeLabels]}</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 bg-primary rounded"
                              style={{ width: `${(count / totalIncidents) * 100}px` }}
                            />
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Top Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(
                      incidents?.reduce((acc, i) => {
                        const loc = i.location_country || 'Unknown';
                        acc[loc] = (acc[loc] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>) || {}
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([location, count]) => (
                        <div key={location} className="flex items-center justify-between">
                          <span className="text-sm">{location}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

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
      </div>
    </DashboardLayout>
  );
}
