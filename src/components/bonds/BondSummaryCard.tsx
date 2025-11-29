import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useBondByScholar, ServiceBond } from '@/hooks/useBonds';
import { format, differenceInDays, differenceInMonths } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending Return', color: 'text-amber-600', icon: Clock },
  active: { label: 'Active', color: 'text-blue-600', icon: Clock },
  fulfilled: { label: 'Fulfilled', color: 'text-green-600', icon: CheckCircle2 },
  broken: { label: 'Broken', color: 'text-red-600', icon: AlertTriangle },
  waived_partial: { label: 'Partially Waived', color: 'text-orange-600', icon: Briefcase },
  waived_full: { label: 'Fully Waived', color: 'text-purple-600', icon: Briefcase },
};

interface BondSummaryCardProps {
  scholarRecordId: string;
}

export function BondSummaryCard({ scholarRecordId }: BondSummaryCardProps) {
  const navigate = useNavigate();
  const { data: bond, isLoading } = useBondByScholar(scholarRecordId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Service Bond
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bond) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Service Bond
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No service bond associated with this scholarship.
          </p>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Service Bond
          </span>
          <Badge variant="outline" className={statusConfig.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Bond Type</span>
            <p className="font-medium capitalize">{bond.bond_type.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Duration</span>
            <p className="font-medium">{bond.bond_duration_months} months</p>
          </div>
        </div>

        {bond.status === 'active' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{monthsServed} / {bond.bond_duration_months} months</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {monthsRemaining} months remaining
            </p>
          </div>
        )}

        {bond.status === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            <Clock className="h-4 w-4" />
            <span>Awaiting return-to-work confirmation</span>
          </div>
        )}

        {bond.status === 'fulfilled' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            <span>Bond obligation completed</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Start Date
            </span>
            <p className="font-medium">
              {bond.bond_start_date 
                ? format(new Date(bond.bond_start_date), 'dd MMM yyyy')
                : 'Not started'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              End Date
            </span>
            <p className="font-medium">
              {bond.bond_end_date 
                ? format(new Date(bond.bond_end_date), 'dd MMM yyyy')
                : 'Not set'}
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => navigate(`/bonds/${bond.id}`)}
        >
          View Full Bond Record
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
