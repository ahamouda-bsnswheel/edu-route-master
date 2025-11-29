import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  Brain, 
  Edit2, 
  History,
  Shield,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  CheckCircle,
} from 'lucide-react';
import { useOverridePriority } from '@/hooks/useAIPriority';
import { useAuth } from '@/contexts/AuthContext';
import type { AIPriorityScore } from '@/hooks/useAIPriority';

interface PriorityExplanationPanelProps {
  score: AIPriorityScore;
  itemName: string;
  onClose?: () => void;
}

const factorIcons: Record<string, any> = {
  'HSE Critical': Shield,
  'Competency Gap': TrendingUp,
  'Manager Priority': Users,
  'Role Criticality': Target,
  'Compliance Status': CheckCircle,
  'Cost Efficiency': DollarSign,
  'Strategic Alignment': Target,
};

const bandColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-muted text-muted-foreground',
};

export function PriorityExplanationPanel({ score, itemName, onClose }: PriorityExplanationPanelProps) {
  const { hasRole } = useAuth();
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideBand, setOverrideBand] = useState<string>(score.priority_band);
  const [overrideReason, setOverrideReason] = useState('');
  
  const overrideMutation = useOverridePriority();
  
  const canOverride = hasRole('l_and_d') || hasRole('hrbp') || hasRole('admin');
  
  const handleOverride = async () => {
    if (!overrideReason.trim()) return;
    
    await overrideMutation.mutateAsync({
      scoreId: score.id,
      newBand: overrideBand,
      reason: overrideReason,
    });
    
    setIsOverrideOpen(false);
    setOverrideReason('');
  };

  // Calculate total possible score for progress bar
  const maxScore = 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Priority Analysis
            </CardTitle>
            <CardDescription className="mt-1">{itemName}</CardDescription>
          </div>
          <Badge className={`${bandColors[score.priority_band]} text-lg px-3 py-1`}>
            {Math.round(score.priority_score)}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Priority Band */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Priority Level</span>
              <Badge className={bandColors[score.priority_band]} variant="default">
                {score.priority_band.toUpperCase()}
              </Badge>
            </div>
            <Progress value={score.priority_score} max={maxScore} className="h-3" />
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Score Breakdown
          </h4>
          
          <div className="grid gap-3">
            {[
              { label: 'HSE Critical', value: score.hse_contribution, icon: Shield, color: 'text-red-500' },
              { label: 'Competency Gap', value: score.competency_gap_contribution, icon: TrendingUp, color: 'text-orange-500' },
              { label: 'Manager Priority', value: score.manager_priority_contribution, icon: Users, color: 'text-blue-500' },
              { label: 'Role Criticality', value: score.role_criticality_contribution, icon: Target, color: 'text-purple-500' },
              { label: 'Compliance', value: score.compliance_contribution, icon: CheckCircle, color: 'text-green-500' },
              { label: 'Cost Efficiency', value: score.cost_contribution, icon: DollarSign, color: 'text-emerald-500' },
              { label: 'Strategic', value: score.strategic_contribution, icon: Target, color: 'text-indigo-500' },
            ].filter(f => f.value > 0).map((factor) => (
              <div key={factor.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <factor.icon className={`h-4 w-4 ${factor.color}`} />
                  <span className="text-sm">{factor.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2" 
                      style={{ width: `${Math.min(100, factor.value * 4)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">+{factor.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Explanation */}
        {score.explanation_summary && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Explanation
            </h4>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              {score.explanation_summary}
            </div>
          </div>
        )}

        {/* Factor Details */}
        {score.factor_details && score.factor_details.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Factor Details</h4>
            <div className="space-y-2">
              {score.factor_details.map((detail: any, i: number) => {
                const IconComponent = factorIcons[detail.factor] || Target;
                return (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <IconComponent className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{detail.factor}</span>
                        <Badge variant="outline">+{detail.contribution}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {detail.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Override Info */}
        {score.is_overridden && (
          <div className="border-t pt-4">
            <div className="flex items-start gap-2 text-sm">
              <History className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Manual Override Applied</p>
                <p className="text-muted-foreground">
                  Original score: {score.original_score} ({score.original_band})
                </p>
                {score.override_reason && (
                  <p className="italic mt-1">"{score.override_reason}"</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            <p>Model: {score.model_version} | Config v{score.config_version}</p>
            <p>Scored: {new Date(score.scored_at).toLocaleString()}</p>
          </div>
          
          {canOverride && !score.is_overridden && (
            <Button variant="outline" size="sm" onClick={() => setIsOverrideOpen(true)}>
              <Edit2 className="h-4 w-4 mr-1" />
              Override
            </Button>
          )}
        </div>
      </CardContent>

      {/* Override Dialog */}
      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override AI Priority</DialogTitle>
            <DialogDescription>
              Override the AI-generated priority with manual assessment. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Priority Band</Label>
              <Select value={overrideBand} onValueChange={setOverrideBand}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Justification (required)</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why you are overriding the AI priority..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOverride}
              disabled={!overrideReason.trim() || overrideMutation.isPending}
            >
              {overrideMutation.isPending ? 'Saving...' : 'Apply Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
