import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Calendar, 
  Building2, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info
} from 'lucide-react';
import { useMyBond } from '@/hooks/useBonds';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  pending: { 
    label: 'Pending Return', 
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Your bond period will begin once you return to work after completing your program.'
  },
  active: { 
    label: 'Active', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Your service bond is currently active. Continue fulfilling your commitment.'
  },
  fulfilled: { 
    label: 'Fulfilled', 
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Congratulations! You have successfully completed your service bond obligation.'
  },
  broken: { 
    label: 'Broken', 
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Your bond has been marked as broken. Please contact HR for more information.'
  },
  waived_partial: { 
    label: 'Partially Waived', 
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Part of your bond obligation has been waived.'
  },
  waived_full: { 
    label: 'Fully Waived', 
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Your bond obligation has been fully waived.'
  },
};

export default function MyBond() {
  const { data: bond, isLoading } = useMyBond();

  if (isLoading) {
    return (
      <DashboardLayout title="My Service Bond" description="View your service bond obligations and status">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!bond) {
    return (
      <DashboardLayout title="My Service Bond" description="View your service bond obligations and status">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Active Bond</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You don't have any active service bond. If you believe this is an error, 
              please contact HR or L&D for assistance.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[bond.status] || STATUS_CONFIG.pending;

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
    <DashboardLayout title="My Service Bond" description="View your service bond obligations and status">
      {/* Status Banner */}
      <Card className={`mb-6 border-2 ${statusConfig.color}`}>
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            {bond.status === 'fulfilled' ? (
              <CheckCircle2 className="h-8 w-8 flex-shrink-0" />
            ) : bond.status === 'broken' ? (
              <AlertTriangle className="h-8 w-8 flex-shrink-0" />
            ) : (
              <Clock className="h-8 w-8 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{statusConfig.label}</h2>
              <p className="text-sm opacity-90">{statusConfig.description}</p>
              
              {bond.status === 'active' && (
                <div className="mt-4">
                  <Progress value={progress} className="h-3 mb-2" />
                  <p className="text-sm font-medium">
                    {monthsServed} of {bond.bond_duration_months} months completed • {monthsRemaining} months remaining
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Program Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
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
                <p className="text-sm text-muted-foreground">Degree</p>
                <p className="font-medium capitalize">{bond.scholar_record?.degree_level}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bond Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
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
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="font-medium">{bond.bond_duration_months} months</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {bond.bond_start_date 
                    ? format(new Date(bond.bond_start_date), 'dd MMM yyyy')
                    : 'Not started'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {bond.bond_end_date 
                    ? format(new Date(bond.bond_end_date), 'dd MMM yyyy')
                    : 'Not started'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Details (for active bonds) */}
        {bond.status === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Bond Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{monthsServed}</p>
                  <p className="text-sm text-muted-foreground">Months Served</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{bond.bond_duration_months}</p>
                  <p className="text-sm text-muted-foreground">Total Months</p>
                </div>
                <div className="p-4 bg-amber-100 rounded-lg">
                  <p className="text-3xl font-bold text-amber-700">{monthsRemaining}</p>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-2">Completion Progress</p>
                <Progress value={progress} className="h-4" />
                <p className="text-right text-sm text-muted-foreground mt-1">
                  {Math.round(progress)}% complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Policy Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Policy Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Service Bond Policy</AlertTitle>
              <AlertDescription>
                {bond.bond_type === 'time_based' && (
                  <p>
                    Your bond requires you to remain employed with the company for 
                    {' '}{bond.bond_duration_months} months after returning from your program.
                  </p>
                )}
                {bond.bond_type === 'amount_based' && (
                  <p>
                    If you leave before completing your bond period, you may be required 
                    to repay a portion of the scholarship funding based on remaining time.
                  </p>
                )}
                {bond.bond_type === 'mixed' && (
                  <p>
                    Your bond combines both time-based service commitment and potential 
                    financial repayment if you leave before completion.
                  </p>
                )}
              </AlertDescription>
            </Alert>

            {bond.legal_agreement_reference && (
              <div>
                <p className="text-sm text-muted-foreground">Legal Agreement Reference</p>
                <p className="font-medium flex items-center gap-2">
                  {bond.legal_agreement_reference}
                  {bond.legal_agreement_url && (
                    <a 
                      href={bond.legal_agreement_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </p>
              </div>
            )}

            <Separator />

            <p className="text-sm text-muted-foreground">
              If you believe any of this information is incorrect or have questions 
              about your bond obligations, please contact HR or L&D.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
