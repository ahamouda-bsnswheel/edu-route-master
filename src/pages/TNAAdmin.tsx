import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Settings, Plus, Pencil, Calendar, Users } from 'lucide-react';
import {
  useTNAPeriods,
  useCreateTNAPeriod,
  useUpdateTNAPeriod,
  type TNAPeriod,
} from '@/hooks/useTNA';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { HistoricalTNAImport } from '@/components/tna/HistoricalTNAImport';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

interface PeriodFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  submission_start_date: string;
  submission_end_date: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  allow_employee_submission: boolean;
  allow_manager_submission: boolean;
}

const initialFormData: PeriodFormData = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  submission_start_date: '',
  submission_end_date: '',
  status: 'draft',
  allow_employee_submission: false,
  allow_manager_submission: true,
};

export default function TNAAdmin() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<TNAPeriod | null>(null);
  const [formData, setFormData] = useState<PeriodFormData>(initialFormData);

  const { data: periods = [], isLoading } = useTNAPeriods();
  const createPeriod = useCreateTNAPeriod();
  const updatePeriod = useUpdateTNAPeriod();

  const handleOpenCreate = () => {
    setEditingPeriod(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (period: TNAPeriod) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      description: period.description || '',
      start_date: period.start_date,
      end_date: period.end_date,
      submission_start_date: period.submission_start_date,
      submission_end_date: period.submission_end_date,
      status: period.status,
      allow_employee_submission: period.allow_employee_submission,
      allow_manager_submission: period.allow_manager_submission,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPeriod) {
      await updatePeriod.mutateAsync({
        id: editingPeriod.id,
        ...formData,
      });
    } else {
      await createPeriod.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
    setEditingPeriod(null);
    setFormData(initialFormData);
  };

  const handleStatusChange = async (periodId: string, newStatus: string) => {
    await updatePeriod.mutateAsync({
      id: periodId,
      status: newStatus as TNAPeriod['status'],
    });
  };

  return (
    <DashboardLayout title="TNA Administration" description="Configure and manage TNA periods and templates">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                TNA Period Configuration
              </CardTitle>
              <CardDescription>
                Create and manage training needs analysis periods
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <HistoricalTNAImport />
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Period
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingPeriod ? 'Edit TNA Period' : 'Create TNA Period'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure the TNA planning period settings
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Period Name *</Label>
                    <Input
                      required
                      placeholder="e.g., Training Year 2026"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Optional description for this TNA period"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start Date *</Label>
                      <Input
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End Date *</Label>
                      <Input
                        type="date"
                        required
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Submission Start *</Label>
                      <Input
                        type="date"
                        required
                        value={formData.submission_start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, submission_start_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Submission End *</Label>
                      <Input
                        type="date"
                        required
                        value={formData.submission_end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, submission_end_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as PeriodFormData['status'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-base font-medium">Submission Permissions</Label>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Allow Employee Self-Submission</p>
                        <p className="text-xs text-muted-foreground">
                          Employees can submit their own training needs
                        </p>
                      </div>
                      <Switch
                        checked={formData.allow_employee_submission}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_employee_submission: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Allow Manager Submission</p>
                        <p className="text-xs text-muted-foreground">
                          Managers can submit TNA for their team members
                        </p>
                      </div>
                      <Switch
                        checked={formData.allow_manager_submission}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_manager_submission: checked }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPeriod.isPending || updatePeriod.isPending}
                    >
                      {createPeriod.isPending || updatePeriod.isPending 
                        ? 'Saving...' 
                        : editingPeriod ? 'Update' : 'Create'
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Periods Table */}
        <Card>
          <CardHeader>
            <CardTitle>TNA Periods</CardTitle>
            <CardDescription>
              {periods.length} {periods.length === 1 ? 'period' : 'periods'} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No TNA periods configured</p>
                <Button variant="link" onClick={handleOpenCreate}>
                  Create your first period
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Name</TableHead>
                    <TableHead>Period Dates</TableHead>
                    <TableHead>Submission Window</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{period.name}</p>
                          {period.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {period.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(period.start_date), 'MMM d, yyyy')} - 
                          {format(new Date(period.end_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(period.submission_start_date), 'MMM d')} - 
                          {format(new Date(period.submission_end_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {period.allow_employee_submission && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Employees
                            </Badge>
                          )}
                          {period.allow_manager_submission && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Managers
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={period.status}
                          onValueChange={(value) => handleStatusChange(period.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <Badge className={statusColors[period.status]}>
                              {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(period)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
