import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Target, MapPin, Calendar, DollarSign } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { TNAItem } from '@/hooks/useTNA';

interface TNAItemCardProps {
  item: TNAItem;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

const priorityColors = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-secondary text-secondary-foreground',
};

const typeLabels = {
  short_term: 'Short-term',
  long_term: 'Long-term',
};

const locationLabels = {
  local: 'Local',
  abroad: 'Abroad',
};

export function TNAItemCard({ item, onEdit, onDelete, canEdit = false }: TNAItemCardProps) {
  const competencyName = item.competency?.name_en || item.competency_text || 'Not specified';
  const courseName = item.course?.name_en || item.course_text || 'Not specified';
  
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header with competency and badges */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground">{competencyName}</h4>
                <p className="text-sm text-muted-foreground">{courseName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={priorityColors[item.priority]}>
                  {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                </Badge>
              </div>
            </div>
            
            {/* Details grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>{typeLabels[item.training_type]}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{locationLabels[item.training_location]}</span>
              </div>
              {item.target_quarter && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{item.target_quarter}</span>
                </div>
              )}
              {item.estimated_cost && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{item.estimated_cost.toLocaleString()} {item.cost_currency}</span>
                </div>
              )}
            </div>
            
            {/* Justification */}
            {item.justification && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                {item.justification}
              </p>
            )}
          </div>
          
          {/* Actions */}
          {canEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Training Need</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this training need? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
