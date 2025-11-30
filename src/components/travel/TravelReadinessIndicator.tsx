import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TravelReadinessIndicatorProps {
  readiness: 'ready' | 'pending' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function TravelReadinessIndicator({ 
  readiness, 
  size = 'md',
  showLabel = true 
}: TravelReadinessIndicatorProps) {
  const config = {
    ready: {
      icon: CheckCircle2,
      label: 'Ready',
      className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
    },
    pending: {
      icon: AlertTriangle,
      label: 'Pending',
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20'
    },
    critical: {
      icon: XCircle,
      label: 'Critical',
      className: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20'
    }
  };

  const { icon: Icon, label, className } = config[readiness];

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className={iconSizes[size]} />
      {showLabel && label}
    </Badge>
  );
}