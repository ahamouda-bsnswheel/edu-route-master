import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { format } from 'date-fns';
import type { RiskScore } from '@/hooks/useScholarRisk';

interface RiskExplanationPanelProps {
  riskScore: RiskScore | null;
  showDetails?: boolean;
}

const RISK_BAND_CONFIG = {
  on_track: { label: 'On Track', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50', icon: CheckCircle },
  watch: { label: 'Watch', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50', icon: Clock },
  at_risk: { label: 'At Risk', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', icon: AlertTriangle },
};

const IMPACT_CONFIG = {
  low: { color: 'bg-blue-100 text-blue-700', icon: Info },
  medium: { color: 'bg-amber-100 text-amber-700', icon: TrendingDown },
  high: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export function RiskExplanationPanel({ riskScore, showDetails = true }: RiskExplanationPanelProps) {
  if (!riskScore) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No risk assessment available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Risk scoring has not been run for this scholar yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const bandConfig = RISK_BAND_CONFIG[riskScore.risk_band as keyof typeof RISK_BAND_CONFIG] || RISK_BAND_CONFIG.on_track;
  const BandIcon = bandConfig.icon;
  const factors = riskScore.contributing_factors || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>AI Risk Assessment</span>
          {riskScore.is_override && (
            <Badge variant="secondary">Manual Override</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score Header */}
        <div className={`p-4 rounded-lg ${bandConfig.bgLight}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BandIcon className={`h-5 w-5 ${bandConfig.textColor}`} />
              <span className={`font-semibold ${bandConfig.textColor}`}>
                {bandConfig.label}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{Math.round(riskScore.risk_score)}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
          <Progress 
            value={riskScore.risk_score} 
            className="h-2"
          />
        </div>

        {/* Contributing Factors */}
        {factors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Contributing Factors</h4>
            <div className="space-y-2">
              {factors.map((factor: any, index: number) => {
                const impactConfig = IMPACT_CONFIG[factor.impact as keyof typeof IMPACT_CONFIG] || IMPACT_CONFIG.low;
                const ImpactIcon = impactConfig.icon;
                
                return (
                  <div key={index} className="flex items-start gap-3 p-2 bg-muted/50 rounded-md">
                    <ImpactIcon className={`h-4 w-4 mt-0.5 ${impactConfig.color.split(' ')[1]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{factor.description}</p>
                      <Badge variant="outline" className={`mt-1 text-xs ${impactConfig.color}`}>
                        {factor.impact} impact
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata */}
        {showDetails && (
          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Scored at:</span>
              <span>{format(new Date(riskScore.scored_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between">
              <span>Model version:</span>
              <span>{riskScore.model_version}</span>
            </div>
            {riskScore.previous_band && riskScore.previous_band !== riskScore.risk_band && (
              <div className="flex justify-between items-center">
                <span>Previous status:</span>
                <div className="flex items-center gap-1">
                  <span className="capitalize">{riskScore.previous_band.replace('_', ' ')}</span>
                  {riskScore.risk_score > 50 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                </div>
              </div>
            )}
            {riskScore.is_override && riskScore.override_reason && (
              <div className="mt-2 p-2 bg-muted rounded">
                <p className="font-medium">Override reason:</p>
                <p>{riskScore.override_reason}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
