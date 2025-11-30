import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PerDiemCalculation, 
  useCalculatePerDiem, 
  useCreatePerDiemOverride,
  usePerDiemOverrides,
  getEffectivePerDiemAmount,
} from '@/hooks/usePerDiem';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Calculator, 
  Edit, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface PerDiemCalculationPanelProps {
  calculation: PerDiemCalculation;
  showOverrideOption?: boolean; // true for Finance/Comp & Benefits
  onRecalculate?: () => void;
}

export function PerDiemCalculationPanel({
  calculation,
  showOverrideOption = false,
  onRecalculate,
}: PerDiemCalculationPanelProps) {
  const { toast } = useToast();
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    override_eligible_days: calculation.total_eligible_days,
    override_daily_rate: calculation.daily_rate,
    override_amount: calculation.estimated_amount || 0,
    reason: '',
  });

  const calculatePerDiem = useCalculatePerDiem();
  const createOverride = useCreatePerDiemOverride();
  const { data: overrides } = usePerDiemOverrides(calculation.id);

  const latestOverride = overrides?.[0];
  const effectiveAmount = getEffectivePerDiemAmount(calculation, latestOverride);

  const handleRecalculateFinal = async () => {
    if (!calculation.actual_start_date || !calculation.actual_end_date) {
      toast({
        title: 'Missing actual dates',
        description: 'Actual travel dates are required for final calculation.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await calculatePerDiem.mutateAsync({
        action: 'calculate_final',
        employee_id: calculation.employee_id,
        training_request_id: calculation.training_request_id || undefined,
        session_id: calculation.session_id || undefined,
        destination_country: calculation.destination_country,
        destination_city: calculation.destination_city || undefined,
        employee_grade: calculation.employee_grade || undefined,
        planned_start_date: calculation.planned_start_date || undefined,
        planned_end_date: calculation.planned_end_date || undefined,
        actual_start_date: calculation.actual_start_date,
        actual_end_date: calculation.actual_end_date,
        is_domestic: calculation.is_domestic,
        accommodation_covered: calculation.accommodation_covered,
      });
      toast({ title: 'Final per diem calculated' });
      onRecalculate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateOverride = async () => {
    if (!overrideForm.reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a justification for the override.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createOverride.mutateAsync({
        per_diem_calculation_id: calculation.id,
        original_eligible_days: calculation.total_eligible_days,
        original_daily_rate: calculation.daily_rate,
        original_amount: calculation.estimated_amount || calculation.final_amount || 0,
        override_eligible_days: overrideForm.override_eligible_days,
        override_daily_rate: overrideForm.override_daily_rate,
        override_amount: overrideForm.override_amount,
        reason: overrideForm.reason,
      });
      
      toast({ title: 'Override submitted for approval' });
      setShowOverrideDialog(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = () => {
    switch (calculation.status) {
      case 'calculated':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Calculated</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{calculation.status}</Badge>;
    }
  };

  const getPaymentStatusBadge = () => {
    switch (calculation.payment_status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'submitted':
        return <Badge className="bg-amber-100 text-amber-800">Submitted</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Per Diem Details
            </CardTitle>
            <CardDescription>
              {calculation.destination_city 
                ? `${calculation.destination_city}, ${calculation.destination_country}`
                : calculation.destination_country
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {getPaymentStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Config Missing Warning */}
        {calculation.config_missing && (
          <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {calculation.config_missing_reason || 'Per diem configuration missing'}
            </AlertDescription>
          </Alert>
        )}

        {/* Override Warning */}
        {calculation.has_override && latestOverride && (
          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <FileText className="h-4 w-4" />
            <AlertDescription>
              This calculation has an override ({latestOverride.approval_status}).
              {latestOverride.reason && ` Reason: ${latestOverride.reason}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Amounts Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Estimated Amount</p>
            <p className="text-xl font-bold">
              {calculation.currency} {calculation.estimated_amount?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {calculation.final_amount ? 'Final Amount' : 'Effective Amount'}
            </p>
            <p className="text-xl font-bold">
              {calculation.currency} {effectiveAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Calculation Details */}
        <div className="space-y-2 text-sm">
          <h4 className="font-medium">Calculation Details</h4>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Destination Band:</span>
            <span className="text-right">
              <Badge variant="outline">Band {calculation.destination_band || '-'}</Badge>
            </span>
            
            <span>Daily Rate:</span>
            <span className="text-right">{calculation.currency} {calculation.daily_rate?.toFixed(2)}</span>
            
            <span>Full Days:</span>
            <span className="text-right">{calculation.full_days}</span>
            
            <span>Travel Days:</span>
            <span className="text-right">{calculation.travel_days}</span>
            
            <span>Weekend Days:</span>
            <span className="text-right">{calculation.weekend_days}</span>
            
            <span>Total Eligible Days:</span>
            <span className="text-right font-medium text-foreground">{calculation.total_eligible_days}</span>
          </div>
        </div>

        <Separator />

        {/* Dates */}
        <div className="space-y-2 text-sm">
          <h4 className="font-medium">Travel Dates</h4>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Planned Start:</span>
            <span className="text-right">
              {calculation.planned_start_date 
                ? format(new Date(calculation.planned_start_date), 'MMM d, yyyy')
                : '-'
              }
            </span>
            
            <span>Planned End:</span>
            <span className="text-right">
              {calculation.planned_end_date 
                ? format(new Date(calculation.planned_end_date), 'MMM d, yyyy')
                : '-'
              }
            </span>
            
            <span>Actual Start:</span>
            <span className="text-right">
              {calculation.actual_start_date 
                ? format(new Date(calculation.actual_start_date), 'MMM d, yyyy')
                : '-'
              }
            </span>
            
            <span>Actual End:</span>
            <span className="text-right">
              {calculation.actual_end_date 
                ? format(new Date(calculation.actual_end_date), 'MMM d, yyyy')
                : '-'
              }
            </span>
          </div>
        </div>

        {/* Payment Info */}
        {calculation.payment_period && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Payment Information</h4>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>Payment Period:</span>
                <span className="text-right">{calculation.payment_period}</span>
                
                {calculation.payment_reference && (
                  <>
                    <span>Reference:</span>
                    <span className="text-right">{calculation.payment_reference}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {calculation.actual_start_date && calculation.actual_end_date && calculation.calculation_type === 'estimate' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRecalculateFinal}
              disabled={calculatePerDiem.isPending}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Final
            </Button>
          )}
          
          {showOverrideOption && (
            <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Per Diem Override</DialogTitle>
                  <DialogDescription>
                    Adjust the calculated per diem with justification
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Eligible Days</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={overrideForm.override_eligible_days}
                        onChange={(e) => setOverrideForm({
                          ...overrideForm,
                          override_eligible_days: parseFloat(e.target.value) || 0,
                          override_amount: (parseFloat(e.target.value) || 0) * overrideForm.override_daily_rate,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Daily Rate ({calculation.currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={overrideForm.override_daily_rate}
                        onChange={(e) => setOverrideForm({
                          ...overrideForm,
                          override_daily_rate: parseFloat(e.target.value) || 0,
                          override_amount: overrideForm.override_eligible_days * (parseFloat(e.target.value) || 0),
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Override Amount ({calculation.currency})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={overrideForm.override_amount}
                      onChange={(e) => setOverrideForm({
                        ...overrideForm,
                        override_amount: parseFloat(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Justification *</Label>
                    <Textarea
                      value={overrideForm.reason}
                      onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                      placeholder="e.g., Extra day due to flight cancellation; approved by Travel Manager"
                      rows={3}
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Difference from original:</p>
                    <p className={`text-lg font-bold ${
                      overrideForm.override_amount > (calculation.estimated_amount || 0) 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {overrideForm.override_amount > (calculation.estimated_amount || 0) ? '+' : ''}
                      {calculation.currency} {(overrideForm.override_amount - (calculation.estimated_amount || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOverride} disabled={createOverride.isPending}>
                    Submit Override
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
