import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Play, 
  Download, 
  Search,
  Filter,
  MoreHorizontal,
  Merge,
  Split,
  Trash2,
  Check,
  Lock,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  Copy,
  History,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTrainingPlan,
  useTrainingPlanItems,
  useUpdatePlanItem,
  useUpdatePlanStatus,
  useGeneratePlanFromTNA,
  useExcludePlanItem,
  useMergePlanItems,
  usePlanSummary,
  useCreatePlanVersion,
  usePlanVersions,
  type TrainingPlanItem,
} from '@/hooks/useTrainingPlan';
import { useTNAPeriods } from '@/hooks/useTNA';
import { LegacyPlanImport } from '@/components/training-plan/LegacyPlanImport';
import { toast } from 'sonner';

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

const priorityColors: Record<string, string> = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-secondary text-secondary-foreground',
};

export default function TrainingPlanDetail() {
  const { id: planId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'active',
    priority: 'all',
    training_type: 'all',
    training_location: 'all',
    quarter: 'all',
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [excludeReason, setExcludeReason] = useState('');
  const [excludingItemId, setExcludingItemId] = useState<string | null>(null);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  
  const { data: plan, isLoading: planLoading } = useTrainingPlan(planId || null);
  const { data: items = [], isLoading: itemsLoading } = useTrainingPlanItems(planId || null, {
    ...filters,
    search,
  });
  const { data: summary } = usePlanSummary(planId || null);
  const { data: tnaPeriods = [] } = useTNAPeriods();
  
  const updateItem = useUpdatePlanItem();
  const updateStatus = useUpdatePlanStatus();
  const generateFromTNA = useGeneratePlanFromTNA();
  const excludeItem = useExcludePlanItem();
  const mergeItems = useMergePlanItems();
  const createVersion = useCreatePlanVersion();
  const { data: planVersions = [] } = usePlanVersions(plan?.fiscal_year || null);
  
  const isLAndD = hasRole('l_and_d') || hasRole('admin');
  const isHRBP = hasRole('hrbp');
  const canEdit = isLAndD && plan?.status !== 'locked';
  const canEditHRBP = isHRBP && (plan?.status === 'draft' || plan?.status === 'under_area_review');
  
  // Inline edit handler
  const handleInlineEdit = async (itemId: string, field: string, value: any) => {
    if (!planId) return;
    await updateItem.mutateAsync({
      id: itemId,
      planId,
      [field]: value,
    });
  };
  
  // Generate plan from TNA
  const handleGenerate = async () => {
    if (!planId || !selectedPeriodId) return;
    await generateFromTNA.mutateAsync({
      planId,
      periodId: selectedPeriodId,
    });
    setIsGenerateOpen(false);
  };
  
  // Exclude item
  const handleExclude = async () => {
    if (!planId || !excludingItemId || !excludeReason) return;
    await excludeItem.mutateAsync({
      planId,
      itemId: excludingItemId,
      reason: excludeReason,
    });
    setExcludingItemId(null);
    setExcludeReason('');
  };
  
  // Merge selected items
  const handleMerge = async () => {
    if (!planId || selectedItems.size < 2) {
      toast.error('Select at least 2 items to merge');
      return;
    }
    
    const itemsToMerge = items.filter(i => selectedItems.has(i.id));
    const totalParticipants = itemsToMerge.reduce((sum, i) => sum + i.planned_participants, 0);
    
    await mergeItems.mutateAsync({
      planId,
      itemIds: Array.from(selectedItems),
      mergedItem: {
        item_name: itemsToMerge[0].item_name,
        course_id: itemsToMerge[0].course_id,
        training_type: itemsToMerge[0].training_type,
        training_location: itemsToMerge[0].training_location,
        planned_participants: totalParticipants,
        planned_sessions: Math.ceil(totalParticipants / 20),
        unit_cost: itemsToMerge[0].unit_cost,
        priority: 'medium',
      },
    });
    
    setSelectedItems(new Set());
  };
  
  // Status workflow
  const handleStatusChange = async (newStatus: string) => {
    if (!planId) return;
    await updateStatus.mutateAsync({
      planId,
      status: newStatus as any,
    });
  };
  
  // Export to CSV
  const handleExport = () => {
    if (!items.length) return;
    
    const headers = ['Item Name', 'Type', 'Location', 'Participants', 'Sessions', 'Unit Cost', 'Total Cost', 'Priority', 'Quarter'];
    const rows = items.map(item => [
      item.item_name,
      item.training_type,
      item.training_location,
      item.planned_participants,
      item.planned_sessions,
      item.unit_cost,
      item.total_cost || (item.unit_cost * item.planned_participants),
      item.priority,
      item.target_quarter || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-plan-${plan?.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Plan exported to CSV');
  };
  
  if (planLoading) {
    return (
      <DashboardLayout title="Loading..." description="">
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }
  
  if (!plan) {
    return (
      <DashboardLayout title="Plan Not Found" description="">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The requested training plan could not be found.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout 
      title={plan.name} 
      description={`Training Plan - ${plan.fiscal_year}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/training-plan')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[plan.status]}>
              {statusLabels[plan.status]}
            </Badge>
            {plan.version > 1 && (
              <Badge variant="outline">v{plan.version}</Badge>
            )}
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="text-2xl font-bold">{summary?.totalParticipants?.toLocaleString() || 0}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{summary?.totalSessions?.toLocaleString() || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="text-2xl font-bold">{(summary?.totalCost || 0).toLocaleString()} {plan.cost_currency}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plan Items</p>
                  <p className="text-2xl font-bold">{summary?.totalItems || 0}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Actions Bar */}
        {(canEdit || canEditHRBP) && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  {canEdit && plan.tna_period_id && (
                    <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
                      <Play className="h-4 w-4 mr-2" />
                      Generate from TNA
                    </Button>
                  )}
                  {canEdit && !plan.tna_period_id && (
                    <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                      <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
                        <Play className="h-4 w-4 mr-2" />
                        Generate from TNA
                      </Button>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Generate Plan from TNA</DialogTitle>
                          <DialogDescription>
                            Select a TNA period to generate plan items from approved submissions
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>TNA Period</Label>
                            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select TNA period" />
                              </SelectTrigger>
                              <SelectContent>
                                {tnaPeriods.filter(p => p.status === 'closed' || p.status === 'active').map((period) => (
                                  <SelectItem key={period.id} value={period.id}>
                                    {period.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleGenerate}
                            disabled={!selectedPeriodId || generateFromTNA.isPending}
                          >
                            {generateFromTNA.isPending ? 'Generating...' : 'Generate'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {selectedItems.size >= 2 && canEdit && (
                    <Button variant="outline" onClick={handleMerge}>
                      <Merge className="h-4 w-4 mr-2" />
                      Merge Selected ({selectedItems.size})
                    </Button>
                  )}
                  
                  {canEdit && (
                    <LegacyPlanImport planId={planId!} planName={plan.name} />
                  )}
                  
                  {/* Create Version */}
                  {canEdit && plan.status !== 'draft' && (
                    <Dialog open={isVersionOpen} onOpenChange={setIsVersionOpen}>
                      <Button variant="outline" onClick={() => setIsVersionOpen(true)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Create Version
                      </Button>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Plan Version</DialogTitle>
                          <DialogDescription>
                            Create a new version of this plan (e.g., for reduced budget scenario)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Version Name</Label>
                            <Input
                              placeholder="e.g., Reduced Budget Plan 2026"
                              value={newVersionName}
                              onChange={(e) => setNewVersionName(e.target.value)}
                            />
                          </div>
                          {planVersions.length > 1 && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Existing Versions
                              </Label>
                              <div className="text-sm space-y-1">
                                {planVersions.map((v) => (
                                  <div key={v.id} className="flex items-center justify-between text-muted-foreground">
                                    <span>v{v.version}: {v.name}</span>
                                    <Badge variant="outline" className="text-xs">{v.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsVersionOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={async () => {
                              if (!newVersionName) return;
                              await createVersion.mutateAsync({
                                sourcePlanId: planId!,
                                versionName: newVersionName,
                              });
                              setIsVersionOpen(false);
                              setNewVersionName('');
                            }}
                            disabled={!newVersionName || createVersion.isPending}
                          >
                            {createVersion.isPending ? 'Creating...' : 'Create Version'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                {/* Status Workflow Buttons */}
                <div className="flex items-center gap-2">
                  {plan.status === 'draft' && canEdit && (
                    <Button onClick={() => handleStatusChange('under_area_review')}>
                      Submit for Area Review
                    </Button>
                  )}
                  {plan.status === 'under_area_review' && (canEdit || canEditHRBP) && (
                    <Button onClick={() => handleStatusChange('under_corporate_review')}>
                      Submit for Corporate Review
                    </Button>
                  )}
                  {plan.status === 'under_corporate_review' && canEdit && (
                    <Button onClick={() => handleStatusChange('approved')}>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  )}
                  {plan.status === 'approved' && canEdit && (
                    <Button onClick={() => handleStatusChange('locked')}>
                      <Lock className="h-4 w-4 mr-2" />
                      Lock Plan
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.training_location}
                onValueChange={(value) => setFilters(prev => ({ ...prev, training_location: value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="abroad">Abroad</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.quarter}
                onValueChange={(value) => setFilters(prev => ({ ...prev, quarter: value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quarters</SelectItem>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Items</CardTitle>
            <CardDescription>
              {items.length} items in this view
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No plan items found</p>
                {canEdit && (
                  <Button variant="link" onClick={() => setIsGenerateOpen(true)}>
                    Generate from TNA
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canEdit && <TableHead className="w-[50px]"></TableHead>}
                      <TableHead>Item Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Participants</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Quarter</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        {canEdit && (
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedItems);
                                if (checked) {
                                  newSelected.add(item.id);
                                } else {
                                  newSelected.delete(item.id);
                                }
                                setSelectedItems(newSelected);
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.course && (
                              <p className="text-xs text-muted-foreground">{item.course.code}</p>
                            )}
                            {item.is_tna_backed && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.tna_item_count} TNAs
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {item.training_type.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="capitalize">
                          {item.training_location}
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit ? (
                            <Input
                              type="number"
                              className="w-20 text-right"
                              value={item.planned_participants}
                              onChange={(e) => handleInlineEdit(item.id, 'planned_participants', parseInt(e.target.value) || 0)}
                            />
                          ) : (
                            item.planned_participants
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit ? (
                            <Input
                              type="number"
                              className="w-16 text-right"
                              value={item.planned_sessions}
                              onChange={(e) => handleInlineEdit(item.id, 'planned_sessions', parseInt(e.target.value) || 1)}
                            />
                          ) : (
                            item.planned_sessions
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unit_cost?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {((item.unit_cost || 0) * (item.planned_participants || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select
                              value={item.priority}
                              onValueChange={(value) => handleInlineEdit(item.id, 'priority', value)}
                            >
                              <SelectTrigger className="w-24">
                                <Badge className={priorityColors[item.priority]}>
                                  {item.priority}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={priorityColors[item.priority]}>
                              {item.priority}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select
                              value={item.target_quarter || 'none'}
                              onValueChange={(value) => handleInlineEdit(item.id, 'target_quarter', value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                <SelectItem value="Q1">Q1</SelectItem>
                                <SelectItem value="Q2">Q2</SelectItem>
                                <SelectItem value="Q3">Q3</SelectItem>
                                <SelectItem value="Q4">Q4</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            item.target_quarter || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setExcludingItemId(item.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Exclude from Plan
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Exclude Dialog */}
        <Dialog open={!!excludingItemId} onOpenChange={(open) => !open && setExcludingItemId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exclude Item from Plan</DialogTitle>
              <DialogDescription>
                Please provide a reason for excluding this item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Input
                  placeholder="Enter reason for exclusion"
                  value={excludeReason}
                  onChange={(e) => setExcludeReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExcludingItemId(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleExclude}
                disabled={!excludeReason || excludeItem.isPending}
              >
                {excludeItem.isPending ? 'Excluding...' : 'Exclude'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
