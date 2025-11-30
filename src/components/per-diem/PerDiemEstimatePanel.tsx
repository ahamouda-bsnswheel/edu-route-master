import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalculatePerDiem, PerDiemCalculation } from '@/hooks/usePerDiem';
import { DollarSign, Calculator, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PerDiemEstimatePanelProps {
  employeeId: string;
  trainingRequestId?: string;
  sessionId?: string;
  destinationCountry: string;
  destinationCity?: string;
  employeeGrade?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  isDomestic?: boolean;
  showDetailedView?: boolean; // true for managers/L&D, false for employees
  onCalculationComplete?: (calculation: PerDiemCalculation) => void;
}

export function PerDiemEstimatePanel({
  employeeId,
  trainingRequestId,
  sessionId,
  destinationCountry,
  destinationCity,
  employeeGrade,
  plannedStartDate,
  plannedEndDate,
  isDomestic = false,
  showDetailedView = false,
  onCalculationComplete,
}: PerDiemEstimatePanelProps) {
  const [calculation, setCalculation] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const calculatePerDiem = useCalculatePerDiem();

  const canCalculate = destinationCountry && plannedStartDate && plannedEndDate;

  const handleCalculate = async () => {
    if (!canCalculate) return;

    try {
      const result = await calculatePerDiem.mutateAsync({
        action: 'estimate',
        employee_id: employeeId,
        training_request_id: trainingRequestId,
        session_id: sessionId,
        destination_country: destinationCountry,
        destination_city: destinationCity,
        employee_grade: employeeGrade,
        planned_start_date: plannedStartDate,
        planned_end_date: plannedEndDate,
        is_domestic: isDomestic,
      });

      if (result.success) {
        setCalculation(result.calculation);
        setBreakdown(result.breakdown);
        if (onCalculationComplete) {
          onCalculationComplete(result.calculation);
        }
      } else {
        setCalculation({
          config_missing: true,
          config_missing_reason: result.config_missing_reason || 'Calculation failed',
        });
      }
    } catch (error) {
      console.error('Per diem calculation error:', error);
    }
  };

  useEffect(() => {
    if (canCalculate && !calculation) {
      handleCalculate();
    }
  }, [destinationCountry, plannedStartDate, plannedEndDate]);

  if (!canCalculate) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Per Diem Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Per diem will be calculated once destination and travel dates are provided.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (calculatePerDiem.isPending) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 animate-pulse" />
            Calculating Per Diem...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (calculation?.config_missing) {
    return (
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Per Diem Config Missing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {calculation.config_missing_reason || 'No per diem configuration found for this destination.'}
              <br />
              <span className="text-xs">Please contact Finance/Comp & Benefits to configure rates.</span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Employee simplified view
  if (!showDetailedView) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Per Diem Allowance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Allowance</p>
              <p className="text-2xl font-bold">
                {calculation?.currency} {calculation?.estimated_amount?.toFixed(2) || '0.00'}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    This is an estimate. Final amount depends on actual travel dates and company policy.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Per diem provided as per company policy
          </p>
        </CardContent>
      </Card>
    );
  }

  // Detailed view for managers/L&D/Finance
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Per Diem Estimate
            </CardTitle>
            <CardDescription>
              {destinationCity ? `${destinationCity}, ${destinationCountry}` : destinationCountry}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCalculate}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main estimate */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Estimated Total</p>
            <p className="text-xs text-muted-foreground">Based on planned dates</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {calculation?.currency} {calculation?.estimated_amount?.toFixed(2) || '0.00'}
            </p>
            <Badge variant="outline" className="mt-1">
              Band {calculation?.destination_band || '-'}
            </Badge>
          </div>
        </div>

        {/* Breakdown */}
        {breakdown && (
          <div className="space-y-2 text-sm">
            <h4 className="font-medium">Calculation Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Daily Rate:</span>
              <span className="text-right">{breakdown.currency} {breakdown.effective_daily_rate?.toFixed(2)}</span>
              
              <span>Total Days:</span>
              <span className="text-right">{breakdown.total_days}</span>
              
              <span>Full Days:</span>
              <span className="text-right">{breakdown.full_days}</span>
              
              <span>Travel Days:</span>
              <span className="text-right">{breakdown.travel_days} × {breakdown.travel_day_rate}</span>
              
              {breakdown.weekend_days > 0 && (
                <>
                  <span>Weekend Days:</span>
                  <span className="text-right">{breakdown.weekend_days}</span>
                </>
              )}
              
              {breakdown.excluded_days > 0 && (
                <>
                  <span>Excluded Days:</span>
                  <span className="text-right">{breakdown.excluded_days}</span>
                </>
              )}
              
              <span className="font-medium text-foreground">Eligible Days:</span>
              <span className="text-right font-medium text-foreground">{breakdown.total_eligible_days}</span>
              
              {breakdown.grade_multiplier !== 1 && (
                <>
                  <span>Grade Multiplier:</span>
                  <span className="text-right">{(breakdown.grade_multiplier * 100).toFixed(0)}%</span>
                </>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          Estimate – actual may vary by travel dates/policy
        </p>
      </CardContent>
    </Card>
  );
}
