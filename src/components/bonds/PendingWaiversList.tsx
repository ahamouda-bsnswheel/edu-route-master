import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Eye, FileText } from 'lucide-react';
import { usePendingWaivers, BondEvent } from '@/hooks/useBonds';
import { WaiverApprovalDialog } from './WaiverApprovalDialog';
import { format } from 'date-fns';

const WAIVER_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  full: { label: 'Full Waiver', color: 'bg-purple-100 text-purple-800' },
  partial_amount: { label: 'Partial Amount', color: 'bg-orange-100 text-orange-800' },
  partial_time: { label: 'Partial Time', color: 'bg-blue-100 text-blue-800' },
};

export function PendingWaiversList() {
  const navigate = useNavigate();
  const { data: pendingWaivers, isLoading } = usePendingWaivers();
  const [selectedEvent, setSelectedEvent] = useState<{
    event: BondEvent;
    bondId: string;
    employeeName?: string;
    programName?: string;
  } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pending Waiver Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingWaivers || pendingWaivers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pending Waiver Requests
          </CardTitle>
          <CardDescription>Review and process waiver requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No pending waiver requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pending Waiver Requests
            <Badge variant="secondary" className="ml-2">{pendingWaivers.length}</Badge>
          </CardTitle>
          <CardDescription>Review and process waiver requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Waiver Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingWaivers.map((waiver) => {
                const waiverConfig = WAIVER_TYPE_CONFIG[waiver.event.waiver_type || ''] || WAIVER_TYPE_CONFIG.full;
                return (
                  <TableRow key={waiver.event.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{waiver.employeeName}</p>
                        <p className="text-sm text-muted-foreground">{waiver.employeeId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{waiver.programName}</p>
                        <p className="text-sm text-muted-foreground">{waiver.institution}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={waiverConfig.color}>{waiverConfig.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[200px] truncate">{waiver.event.reason || '-'}</p>
                    </TableCell>
                    <TableCell>
                      {format(new Date(waiver.event.event_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/bonds/${waiver.bondId}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedEvent({
                            event: waiver.event,
                            bondId: waiver.bondId,
                            employeeName: waiver.employeeName,
                            programName: waiver.programName,
                          })}
                        >
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WaiverApprovalDialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        event={selectedEvent?.event || null}
        bondId={selectedEvent?.bondId || ''}
        employeeName={selectedEvent?.employeeName}
        programName={selectedEvent?.programName}
      />
    </>
  );
}
