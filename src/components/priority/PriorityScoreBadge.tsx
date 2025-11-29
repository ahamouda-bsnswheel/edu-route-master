import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, TrendingUp, Minus, TrendingDown, RefreshCw } from 'lucide-react';
import type { AIPriorityScore } from '@/hooks/useAIPriority';

interface PriorityScoreBadgeProps {
  score: AIPriorityScore | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const bandColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-muted text-muted-foreground',
};

const bandIcons: Record<string, any> = {
  critical: AlertTriangle,
  high: TrendingUp,
  medium: Minus,
  low: TrendingDown,
};

export function PriorityScoreBadge({ score, onRefresh, isRefreshing }: PriorityScoreBadgeProps) {
  if (!score) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-muted-foreground">
          N/A
        </Badge>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-muted rounded"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  const Icon = bandIcons[score.priority_band] || Minus;
  const topFactors = (score.factor_details || [])
    .filter((f: any) => f.contribution > 0)
    .sort((a: any, b: any) => b.contribution - a.contribution)
    .slice(0, 3);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer">
            <Badge className={`${bandColors[score.priority_band]} flex items-center gap-1`}>
              <Icon className="h-3 w-3" />
              <span>{Math.round(score.priority_score)}</span>
            </Badge>
            {score.is_overridden && (
              <Badge variant="outline" className="text-xs px-1">
                Override
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize">{score.priority_band} Priority</span>
              <span className="text-sm">{Math.round(score.priority_score)}/100</span>
            </div>
            
            {topFactors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Top Factors:</p>
                {topFactors.map((factor: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{factor.factor}</span>
                    <span className="text-primary">+{factor.contribution}</span>
                  </div>
                ))}
              </div>
            )}
            
            {score.is_overridden && (
              <div className="text-xs border-t pt-1 mt-1">
                <p className="text-muted-foreground">
                  Original: {score.original_band} ({score.original_score})
                </p>
                {score.override_reason && (
                  <p className="italic">"{score.override_reason}"</p>
                )}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Click for detailed explanation
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
