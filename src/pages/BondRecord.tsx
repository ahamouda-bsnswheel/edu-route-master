import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Building2, 
  User, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Plus,
  ExternalLink
} from 'lucide-react';
import { useBond, useBondEvents, useBondRepayments } from '@/hooks/useBonds';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { ReturnToWorkDialog } from '@/components/bonds/ReturnToWorkDialog';
import { BondEventDialog } from '@/components/bonds/BondEventDialog';
import { WaiverRequestDialog } from '@/components/bonds/WaiverRequestDialog';
import { RecordRepaymentDialog } from '@/components/bonds/RecordRepaymentDialog';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending Return', variant: 'outline', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  active: { label: 'Active', variant: 'default', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  fulfilled: { label: 'Fulfilled', variant: 'secondary', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
  broken: { label: 'Broken', variant: 'destructive', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle },
  waived_partial: { label: 'Partially Waived', variant: 'outline', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: FileText },
  waived_full: { label: 'Fully Waived', variant: 'outline', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: FileText },
  cancelled: { label: 'Cancelled', variant: 'outline', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: FileText },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  suspension: 'Bond Suspension',
  resumption: 'Bond Resumed',
  early_termination: 'Early Termination',
  waiver_request: 'Waiver Request',
  waiver_approved: 'Waiver Approved',
  waiver_rejected: 'Waiver Rejected',
  extension: 'Bond Extension',
  adjustment: 'Bond Adjustment',
};

export default function BondRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLandD, isHRBP, isAdmin, isCHRO } = useAuth();
  
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false);
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);

  const { data: bond, isLoading } = useBond(id || null);
  const { data: events } = useBondEvents(id || null);
  const { data: repayments } = useBondRepayments(id || null);

  const canManage = isLandD || isAdmin;
  const canUpdate = canManage || isHRBP;

  if (isLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!bond) {
    return (
      <DashboardLayout title="Bond Not Found">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">The requested bond record could not be found.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/bonds')}>
              Back to Bonds
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[bond.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  // Calculate progress
  let progress = 0;
  let monthsServed = 0;
  let monthsRemaining = bond.bond_duration_months;
  
  if (bond.status === 'active' && bond.bond_start_date && bond.bond_end_date) {
    const start = new Date(bond.bond_start_date);
    const end = new Date(bond.bond_end_date);
    const now = new Date();
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(now, start);
    progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    monthsServed = differenceInMonths(now, start);
    monthsRemaining = Math.max(0, bond.bond_duration_months - monthsServed);
  }

  return (
    <DashboardLayout 
      title="Bond Record" 
      description={`${bond.employee?.first_name_en} ${bond.employee?.last_name_en} - ${bond.scholar_record?.program_name}`}
    >
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => navigate('/bonds')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Bonds
      </Button>

      {/* Status Banner */}
      <Card className={`mb-6 border-2 ${statusConfig.color}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-6 w-6" />
              <div>
                <h3 className="font-semibold text-lg">{statusConfig.label}</h3>
                {bond.status === 'active' && (
                  <p className="text-sm">
                    {monthsServed} of {bond.bond_duration_months} months completed ({monthsRemaining} remaining)
                  </p>
                )}
                {bond.status === 'pending' && (
                  <p className="text-sm">Awaiting return-to-work confirmation</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {bond.status === 'pending' && canUpdate && (
                <Button onClick={() => setReturnDialogOpen(true)}>
                  Confirm Return
                </Button>
              )}
              {bond.status === 'active' && canUpdate && (
                <>
                  <Button variant="outline" onClick={() => setEventDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Event
                  </Button>
                  <Button variant="outline" onClick={() => setWaiverDialogOpen(true)}>
                    Request Waiver
                  </Button>
                </>
              )}
              {bond.status === 'broken' && canManage && (
                <Button variant="outline" onClick={() => setRepaymentDialogOpen(true)}>
                  <DollarSign className="h-4 w-4 mr-2" /> Record Repayment
                </Button>
              )}
            </div>
          </div>
          {bond.status === 'active' && (
            <Progress value={progress} className="mt-3 h-2" />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="summary">
        <TabsList className="mb-4">
          <TabsTrigger value="summary">Bond Summary</TabsTrigger>
          <TabsTrigger value="return">Return-to-Work</TabsTrigger>
          <TabsTrigger value="events">Events & Exceptions</TabsTrigger>
          {canManage && <TabsTrigger value="financial">Financial</TabsTrigger>}
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Program Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Program Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Program Name</p>
                  <p className="font-medium">{bond.scholar_record?.program_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Institution</p>
                  <p className="font-medium">{bond.scholar_record?.institution}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{bond.scholar_record?.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Degree Level</p>
                    <p className="font-medium capitalize">{bond.scholar_record?.degree_level}</p>
                  </div>
                </div>
                {bond.scholar_record?.expected_end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Program End</p>
                    <p className="font-medium">
                      {format(new Date(bond.scholar_record.expected_end_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bond Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Bond Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bond Type</p>
                    <p className="font-medium capitalize">{bond.bond_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{bond.bond_duration_months} months</p>
                  </div>
                </div>
                {bond.funded_amount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Funded Amount</p>
                    <p className="font-medium">
                      {bond.funded_amount.toLocaleString()} {bond.currency}
                    </p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bond Start Date</p>
                    <p className="font-medium">
                      {bond.bond_start_date 
                        ? format(new Date(bond.bond_start_date), 'dd MMM yyyy')
                        : 'Not started'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bond End Date</p>
                    <p className="font-medium">
                      {bond.bond_end_date 
                        ? format(new Date(bond.bond_end_date), 'dd MMM yyyy')
                        : 'Not started'}
                    </p>
                  </div>
                </div>
                {bond.legal_agreement_reference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Legal Agreement</p>
                    <p className="font-medium flex items-center gap-2">
                      {bond.legal_agreement_reference}
                      {bond.legal_agreement_url && (
                        <a href={bond.legal_agreement_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </a>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {bond.employee?.first_name_en} {bond.employee?.last_name_en}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="font-medium">{bond.employee?.employee_id || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{bond.employee?.email}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/scholars/${bond.scholar_record_id}`)}
                >
                  View Scholar Record
                </Button>
              </CardContent>
            </Card>

            {/* Bond Progress */}
            {bond.status === 'active' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Bond Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={progress} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{monthsServed}</p>
                      <p className="text-sm text-muted-foreground">Months Served</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{bond.bond_duration_months}</p>
                      <p className="text-sm text-muted-foreground">Total Months</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{monthsRemaining}</p>
                      <p className="text-sm text-muted-foreground">Remaining</p>
                    </div>
                  </div>
                  {bond.time_suspended_months && bond.time_suspended_months > 0 && (
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        {bond.time_suspended_months} months suspended (not counted toward fulfilment)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="return">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Return-to-Work Details
              </CardTitle>
              <CardDescription>
                Track return dates and post-return assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bond.status === 'pending' ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <h3 className="text-lg font-semibold mb-2">Awaiting Return</h3>
                  <p className="text-muted-foreground mb-4">
                    Expected return date: {bond.expected_return_date 
                      ? format(new Date(bond.expected_return_date), 'dd MMM yyyy')
                      : 'Not set'}
                  </p>
                  {canUpdate && (
                    <Button onClick={() => setReturnDialogOpen(true)}>
                      Confirm Return to Work
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Return Date</p>
                      <p className="font-medium">
                        {bond.expected_return_date 
                          ? format(new Date(bond.expected_return_date), 'dd MMM yyyy')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Actual Return Date</p>
                      <p className="font-medium">
                        {bond.actual_return_date 
                          ? format(new Date(bond.actual_return_date), 'dd MMM yyyy')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Return Entity</p>
                      <p className="font-medium">{bond.return_entity?.name_en || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Return Department</p>
                      <p className="font-medium">{bond.return_department?.name_en || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Position on Return</p>
                      <p className="font-medium">{bond.return_position || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Events & Exceptions</CardTitle>
                <CardDescription>
                  Suspensions, waivers, and other bond events
                </CardDescription>
              </div>
              {canUpdate && bond.status === 'active' && (
                <Button onClick={() => setEventDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Event
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {events?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No events recorded</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events?.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          {format(new Date(event.event_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate">{event.description || event.reason || '-'}</p>
                        </TableCell>
                        <TableCell>
                          {event.approval_status && (
                            <Badge variant={event.approval_status === 'approved' ? 'secondary' : 'outline'}>
                              {event.approval_status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {event.days_affected ? `${event.days_affected} days` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canManage && (
          <TabsContent value="financial">
            <div className="grid gap-6">
              {/* Repayment Summary */}
              {bond.repayment_required && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Repayment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Calculated Amount</p>
                        <p className="text-2xl font-bold">
                          {bond.calculated_repayment_amount?.toLocaleString() || 0} {bond.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Final Amount</p>
                        <p className="text-2xl font-bold text-red-600">
                          {bond.final_repayment_amount?.toLocaleString() || 0} {bond.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Repayment Status</p>
                        <Badge variant={bond.repayment_status === 'completed' ? 'secondary' : 'destructive'}>
                          {bond.repayment_status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Repayment History */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Repayment History</CardTitle>
                    <CardDescription>Record of all payments made</CardDescription>
                  </div>
                  {bond.repayment_required && bond.repayment_status !== 'completed' && (
                    <Button onClick={() => setRepaymentDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Record Payment
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {repayments?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No repayments recorded</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {repayments?.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {payment.payment_date 
                                ? format(new Date(payment.payment_date), 'dd MMM yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {payment.amount.toLocaleString()} {payment.currency}
                            </TableCell>
                            <TableCell>{payment.payment_method || '-'}</TableCell>
                            <TableCell>{payment.reference_number || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'confirmed' ? 'secondary' : 'outline'}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <ReturnToWorkDialog 
        open={returnDialogOpen} 
        onOpenChange={setReturnDialogOpen}
        bondId={bond.id}
      />
      <BondEventDialog 
        open={eventDialogOpen} 
        onOpenChange={setEventDialogOpen}
        bondId={bond.id}
      />
      <WaiverRequestDialog 
        open={waiverDialogOpen} 
        onOpenChange={setWaiverDialogOpen}
        bondId={bond.id}
        bond={bond}
      />
      <RecordRepaymentDialog 
        open={repaymentDialogOpen} 
        onOpenChange={setRepaymentDialogOpen}
        bondId={bond.id}
        currency={bond.currency || 'LYD'}
      />
    </DashboardLayout>
  );
}
