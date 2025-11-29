import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  FileSpreadsheet, 
  Play, 
  Eye, 
  Settings,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useTrainingPlans,
  useCreateTrainingPlan,
  type TrainingPlan,
} from '@/hooks/useTrainingPlan';
import { useTNAPeriods } from '@/hooks/useTNA';

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  under_area_review: 'Under Area Review',
  under_corporate_review: 'Under Corporate Review',
  approved: 'Approved',
  locked: 'Locked',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  under_area_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  under_corporate_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  locked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function TrainingPlanBuilder() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    fiscal_year: new Date().getFullYear().toString(),
    tna_period_id: '',
    description: '',
  });
  
  const { data: plans = [], isLoading } = useTrainingPlans();
  const { data: tnaPeriods = [] } = useTNAPeriods();
  const createPlan = useCreateTrainingPlan();
  
  const handleCreate = async () => {
    if (!newPlan.name || !newPlan.fiscal_year) return;
    
    await createPlan.mutateAsync({
      name: newPlan.name,
      fiscal_year: newPlan.fiscal_year,
      tna_period_id: newPlan.tna_period_id || null,
      description: newPlan.description || null,
    });
    
    setIsCreateOpen(false);
    setNewPlan({
      name: '',
      fiscal_year: new Date().getFullYear().toString(),
      tna_period_id: '',
      description: '',
    });
  };
  
  return (
    <DashboardLayout 
      title="Training Plan Builder" 
      description="Build and manage annual training plans from TNA data"
    >
      <div className="space-y-6">
        {/* Header with Create Button */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Annual Training Plans
              </CardTitle>
              <CardDescription>
                Create and manage consolidated training plans
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Training Plan</DialogTitle>
                  <DialogDescription>
                    Create a new annual training plan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Plan Name *</Label>
                    <Input
                      placeholder="e.g., Annual Training Plan 2026"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fiscal Year *</Label>
                    <Select
                      value={newPlan.fiscal_year}
                      onValueChange={(value) => setNewPlan(prev => ({ ...prev, fiscal_year: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2].map(offset => {
                          const year = new Date().getFullYear() + offset;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Link to TNA Period (optional)</Label>
                    <Select
                      value={newPlan.tna_period_id}
                      onValueChange={(value) => setNewPlan(prev => ({ ...prev, tna_period_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select TNA period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {tnaPeriods.map((period) => (
                          <SelectItem key={period.id} value={period.id}>
                            {period.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Optional description"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate}
                    disabled={!newPlan.name || createPlan.isPending}
                  >
                    {createPlan.isPending ? 'Creating...' : 'Create Plan'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
        </Card>
        
        {/* Plans List */}
        <Card>
          <CardHeader>
            <CardTitle>Training Plans</CardTitle>
            <CardDescription>
              {plans.length} {plans.length === 1 ? 'plan' : 'plans'} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No training plans created yet</p>
                <Button variant="link" onClick={() => setIsCreateOpen(true)}>
                  Create your first plan
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Fiscal Year</TableHead>
                    <TableHead>TNA Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Summary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {plan.fiscal_year}
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.tna_period?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[plan.status]}>
                          {statusLabels[plan.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {plan.total_participants?.toLocaleString() || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {(plan.total_estimated_cost || 0).toLocaleString()} {plan.cost_currency}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/training-plan/${plan.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
