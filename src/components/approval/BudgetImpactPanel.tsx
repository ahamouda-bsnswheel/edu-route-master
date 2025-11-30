import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetImpact } from '@/hooks/useCostDashboard';
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface BudgetImpactPanelProps {
  entity?: string;
  category?: string;
  estimatedCost: number;
  fiscalYear?: number;
}

export function BudgetImpactPanel({
  entity,
  category,
  estimatedCost,
  fiscalYear = new Date().getFullYear(),
}: BudgetImpactPanelProps) {
  const filters = { fiscalYear, entity, category };
  const { data: impact, isLoading } = useBudgetImpact(filters, estimatedCost);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LYD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Budget Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!impact || impact.totalBudget === 0) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Budget Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No budget defined for this entity/category. Cost tracking only.
          </p>
          <div className="mt-2 p-2 bg-muted rounded">
            <p className="text-sm font-medium">Estimated Cost: {formatCurrency(estimatedCost)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasWarnings = impact.breachedThresholds?.filter((t: any) => t.threshold_type === 'warning').length > 0;
  const hasHardStops = impact.breachedThresholds?.filter((t: any) => t.threshold_type === 'hard_stop').length > 0;

  return (
    <Card className={hasHardStops ? 'border-destructive' : hasWarnings ? 'border-amber-500' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Budget Impact Analysis
        </CardTitle>
        <CardDescription>
          Impact of approving this request on budget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estimated Cost */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Estimated Cost</span>
            <span className="font-semibold">{formatCurrency(estimatedCost)}</span>
          </div>
        </div>

        {/* Budget Comparison */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Total Budget</span>
            <span className="font-medium">{formatCurrency(impact.totalBudget)}</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Before Approval</span>
              <span>{impact.percentageUsedBefore}% used ({formatCurrency(impact.currentSpend)})</span>
            </div>
            <Progress value={impact.percentageUsedBefore} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">After Approval</span>
              <span className={impact.percentageUsedAfter > 100 ? 'text-destructive' : ''}>
                {impact.percentageUsedAfter}% used ({formatCurrency(impact.projectedSpend)})
              </span>
            </div>
            <Progress 
              value={Math.min(impact.percentageUsedAfter, 100)} 
              className={`h-2 ${impact.percentageUsedAfter > 100 ? '[&>div]:bg-destructive' : impact.percentageUsedAfter > 90 ? '[&>div]:bg-amber-500' : ''}`} 
            />
          </div>

          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Remaining After Approval</span>
            <span className={impact.remainingAfter < 0 ? 'text-destructive font-medium' : 'font-medium'}>
              {formatCurrency(impact.remainingAfter)}
            </span>
          </div>
        </div>

        {/* Threshold Alerts */}
        {hasHardStops && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Budget Exceeded - Additional Approval Required</AlertTitle>
            <AlertDescription>
              {impact.breachedThresholds
                ?.filter((t: any) => t.threshold_type === 'hard_stop')
                .map((t: any) => (
                  <div key={t.id} className="mt-1">
                    <span className="font-medium">{t.threshold_name}:</span> Exceeds {t.threshold_percentage}% threshold.
                    {t.requires_approval_role && (
                      <span className="ml-1">Requires {t.requires_approval_role} approval.</span>
                    )}
                  </div>
                ))}
            </AlertDescription>
          </Alert>
        )}

        {hasWarnings && !hasHardStops && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Budget Warning</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {impact.breachedThresholds
                ?.filter((t: any) => t.threshold_type === 'warning')
                .map((t: any) => (
                  <div key={t.id} className="mt-1">
                    <span className="font-medium">{t.threshold_name}:</span> Approaching {t.threshold_percentage}% of budget.
                  </div>
                ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Additional Approval Required */}
        {impact.requiresAdditionalApproval && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              This approval will be escalated for additional review due to budget thresholds.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
