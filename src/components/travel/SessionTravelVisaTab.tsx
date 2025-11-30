import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plane, 
  FileText, 
  RefreshCw, 
  Download, 
  Users, 
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { 
  useTravelVisaRequests, 
  useBulkInitiateTravelVisa,
  useSyncTravelStatus,
  TravelVisaRequest,
  getTravelReadiness,
  travelStatusLabels,
  visaStatusLabels
} from '@/hooks/useTravelVisa';
import { TravelReadinessIndicator } from './TravelReadinessIndicator';
import { BulkTravelInitiationDialog } from './BulkTravelInitiationDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SessionTravelVisaTabProps {
  sessionId: string;
}

export function SessionTravelVisaTab({ sessionId }: SessionTravelVisaTabProps) {
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<string>('all');
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // Fetch session enrollments
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['session-enrollments', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_enrollments')
        .select('id, participant_id, status')
        .eq('session_id', sessionId)
        .in('status', ['confirmed', 'enrolled', 'attended', 'completed']);

      if (error) throw error;
      
      // Fetch profiles separately
      const participantIds = data?.map(e => e.participant_id) || [];
      if (participantIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, employee_id')
        .in('id', participantIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data?.map(e => ({
        id: e.id,
        participant_id: e.participant_id,
        status: e.status,
        profile: profileMap.get(e.participant_id)
      })) || [];
    }
  });

  // Fetch travel requests for this session
  const { data: travelRequests, isLoading: loadingTravel } = useTravelVisaRequests({
    sessionId
  });

  const syncMutation = useSyncTravelStatus();

  // Create a map of participant_id to travel request
  const travelMap = useMemo(() => {
    const map = new Map<string, TravelVisaRequest>();
    travelRequests?.forEach(req => {
      map.set(req.employee_id, req);
    });
    return map;
  }, [travelRequests]);

  // Filter and combine data
  const participantData = useMemo(() => {
    return enrollments?.map(enrollment => {
      const travel = travelMap.get(enrollment.participant_id);
      const readiness = travel ? getTravelReadiness(travel) : 'critical';

      return {
        id: enrollment.id,
        participant_id: enrollment.participant_id,
        status: enrollment.status,
        profile: enrollment.profile,
        travel,
        readiness
      };
    }).filter((p: any) => {
      // Search filter
      if (searchQuery) {
        const name = `${p.profile?.first_name_en || ''} ${p.profile?.last_name_en || ''}`.toLowerCase();
        const empNum = p.profile?.employee_number?.toLowerCase() || '';
        if (!name.includes(searchQuery.toLowerCase()) && !empNum.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      // Readiness filter
      if (readinessFilter !== 'all' && p.readiness !== readinessFilter) {
        return false;
      }

      return true;
    }) || [];
  }, [enrollments, travelMap, searchQuery, readinessFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = participantData.length;
    const ready = participantData.filter(p => p.readiness === 'ready').length;
    const pending = participantData.filter(p => p.readiness === 'pending').length;
    const critical = participantData.filter(p => p.readiness === 'critical').length;
    const notInitiated = participantData.filter(p => !p.travel).length;

    return { total, ready, pending, critical, notInitiated };
  }, [participantData]);

  const toggleSelectAll = () => {
    if (selectedParticipants.length === participantData.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(participantData.map(p => p.participant_id));
    }
  };

  const toggleSelect = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleExport = () => {
    const csvData = participantData.map(p => ({
      'Employee ID': (p.profile as any)?.employee_id || '',
      'Name': `${(p.profile as any)?.first_name_en || ''} ${(p.profile as any)?.last_name_en || ''}`,
      'Travel Request ID': p.travel?.travel_request_id || '',
      'Travel Status': p.travel ? travelStatusLabels[p.travel.travel_status] : 'Not Initiated',
      'Visa Request ID': p.travel?.visa_request_id || '',
      'Visa Status': p.travel ? visaStatusLabels[p.travel.visa_status] : 'N/A',
      'Readiness': p.readiness.toUpperCase()
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-visa-status-${sessionId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = loadingEnrollments || loadingTravel;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Participants</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
            <div className="text-sm text-muted-foreground">Ready</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.notInitiated}</div>
            <div className="text-sm text-muted-foreground">Not Initiated</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={readinessFilter} onValueChange={setReadinessFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate(undefined)}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Status
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => setShowBulkDialog(true)}
            disabled={selectedParticipants.length === 0}
          >
            <Users className="h-4 w-4 mr-2" />
            Initiate Travel ({selectedParticipants.length})
          </Button>
        </div>
      </div>

      {/* Participants Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedParticipants.length === participantData.length && participantData.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Travel Request</TableHead>
                <TableHead>Travel Status</TableHead>
                <TableHead>Visa Request</TableHead>
                <TableHead>Visa Status</TableHead>
                <TableHead>Readiness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No participants found
                  </TableCell>
                </TableRow>
              ) : (
                participantData.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedParticipants.includes(participant.participant_id)}
                        onCheckedChange={() => toggleSelect(participant.participant_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {(participant.profile as any)?.first_name_en} {(participant.profile as any)?.last_name_en}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(participant.profile as any)?.employee_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.travel?.travel_request_id ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {participant.travel.travel_request_id}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={participant.travel?.travel_status === 'ticketed' ? 'default' : 'secondary'}>
                        {participant.travel ? travelStatusLabels[participant.travel.travel_status] : 'Not Initiated'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {participant.travel?.visa_request_id ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {participant.travel.visa_request_id}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        participant.travel?.visa_status === 'approved' || 
                        participant.travel?.visa_status === 'not_required' 
                          ? 'default' 
                          : 'secondary'
                      }>
                        {participant.travel ? visaStatusLabels[participant.travel.visa_status] : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TravelReadinessIndicator readiness={participant.readiness} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkTravelInitiationDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        sessionId={sessionId}
        participantIds={selectedParticipants}
        onComplete={() => setSelectedParticipants([])}
      />
    </div>
  );
}