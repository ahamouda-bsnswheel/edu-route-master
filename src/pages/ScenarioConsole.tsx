import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  GitBranch, 
  TrendingDown, 
  TrendingUp, 
  ArrowRight,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  Archive,
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useScenarios, useDeleteScenario, useUpdateScenarioStatus, type PlanScenario } from '@/hooks/useScenarios';
import { CreateScenarioDialog } from '@/components/scenarios/CreateScenarioDialog';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<PlanScenario['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  creating: { label: 'Creating', variant: 'outline' },
  draft: { label: 'Draft', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
  adopted: { label: 'Adopted', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
};

export default function ScenarioConsole() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: scenarios, isLoading } = useScenarios();
  const deleteMutation = useDeleteScenario();
  const updateStatusMutation = useUpdateScenarioStatus();

  const filteredScenarios = scenarios?.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || scenario.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCostDeltaPercent = (scenario: PlanScenario) => {
    if (!scenario.baseline_total_cost || !scenario.scenario_total_cost) return null;
    return ((scenario.scenario_total_cost - scenario.baseline_total_cost) / scenario.baseline_total_cost) * 100;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scenario Console</h1>
            <p className="text-muted-foreground">
              Create and compare what-if scenarios for training plan budgets
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Scenario
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Scenarios</CardDescription>
              <CardTitle className="text-2xl">{scenarios?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Draft</CardDescription>
              <CardTitle className="text-2xl">
                {scenarios?.filter(s => s.status === 'draft').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Under Review</CardDescription>
              <CardTitle className="text-2xl">
                {scenarios?.filter(s => s.status === 'under_review').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Adopted</CardDescription>
              <CardTitle className="text-2xl">
                {scenarios?.filter(s => s.status === 'adopted').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search scenarios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="adopted">Adopted</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Scenarios Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Basis Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Baseline Cost</TableHead>
                    <TableHead className="text-right">Scenario Cost</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScenarios?.map((scenario) => {
                    const deltaPercent = getCostDeltaPercent(scenario);
                    
                    return (
                      <TableRow 
                        key={scenario.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/scenarios/${scenario.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{scenario.name}</div>
                              {scenario.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {scenario.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {(scenario as any).training_plans?.name || 'Unknown'}
                            <span className="text-muted-foreground ml-1">v{scenario.basis_plan_version}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {scenario.status === 'creating' ? (
                            <div className="flex items-center gap-2">
                              <Progress value={scenario.creation_progress} className="w-16 h-2" />
                              <span className="text-xs text-muted-foreground">
                                {scenario.creation_progress}%
                              </span>
                            </div>
                          ) : (
                            <Badge variant={statusConfig[scenario.status].variant}>
                              {statusConfig[scenario.status].label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(scenario.baseline_total_cost)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(scenario.scenario_total_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {deltaPercent !== null && (
                            <div className={`flex items-center justify-end gap-1 ${
                              deltaPercent < 0 ? 'text-red-500' : deltaPercent > 0 ? 'text-green-500' : ''
                            }`}>
                              {deltaPercent < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : deltaPercent > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : null}
                              <span className="font-mono">
                                {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(scenario.updated_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/scenarios/${scenario.id}`);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {scenario.status === 'draft' && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({ scenarioId: scenario.id, status: 'under_review' });
                                }}>
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Submit for Review
                                </DropdownMenuItem>
                              )}
                              {scenario.status === 'under_review' && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({ scenarioId: scenario.id, status: 'approved' });
                                }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {!['adopted', 'archived'].includes(scenario.status) && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({ scenarioId: scenario.id, status: 'archived' });
                                }}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              {scenario.status === 'draft' && (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to delete this scenario?')) {
                                      deleteMutation.mutate(scenario.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredScenarios?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No scenarios found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateScenarioDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </DashboardLayout>
  );
}
