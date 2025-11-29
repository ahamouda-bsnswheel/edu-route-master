import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  RefreshCw, 
  Upload, 
  GitMerge,
  TrendingDown,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useScenario, useScenarioItems, useRecalculateScenario, type ScenarioLevers } from '@/hooks/useScenarios';
import { ScenarioControlsPanel } from '@/components/scenarios/ScenarioControlsPanel';
import { ScenarioItemsGrid } from '@/components/scenarios/ScenarioItemsGrid';
import { ScenarioSummaryBar } from '@/components/scenarios/ScenarioSummaryBar';
import { PromoteScenarioDialog } from '@/components/scenarios/PromoteScenarioDialog';
import { ScenarioComparisonView } from '@/components/scenarios/ScenarioComparisonView';

export default function ScenarioWorkspace() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('workspace');
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [levers, setLevers] = useState<ScenarioLevers>({});
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<{
    priorityBand?: string;
    entityId?: string;
    categoryId?: string;
    showCutOnly?: boolean;
  }>({});

  const { data: scenario, isLoading: scenarioLoading } = useScenario(scenarioId);
  const { data: itemsData, isLoading: itemsLoading } = useScenarioItems(scenarioId, {
    page,
    pageSize: 50,
    ...filters,
  });
  const recalculateMutation = useRecalculateScenario();

  // Initialize levers from scenario
  useMemo(() => {
    if (scenario && Object.keys(levers).length === 0) {
      setLevers({
        globalBudgetType: scenario.global_budget_type || 'percentage',
        globalBudgetValue: scenario.global_budget_value || 100,
        includePriorityBands: scenario.include_priority_bands || ['critical', 'high', 'medium', 'low'],
        cutOrder: scenario.cut_order || ['low', 'medium', 'high', 'critical'],
        protectedCategories: scenario.protected_categories || [],
        cutAbroadFirst: scenario.cut_abroad_first || false,
        entityCaps: scenario.entity_caps || {},
      });
    }
  }, [scenario]);

  const handleRecalculate = () => {
    if (!scenarioId) return;
    recalculateMutation.mutate({ scenarioId, levers });
  };

  const handleResetLevers = () => {
    if (!scenario) return;
    setLevers({
      globalBudgetType: 'percentage',
      globalBudgetValue: 100,
      includePriorityBands: ['critical', 'high', 'medium', 'low'],
      cutOrder: ['low', 'medium', 'high', 'critical'],
      protectedCategories: [],
      cutAbroadFirst: false,
      entityCaps: {},
    });
  };

  if (scenarioLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!scenario) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Scenario not found.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const costDelta = (scenario.scenario_total_cost || 0) - (scenario.baseline_total_cost || 0);
  const costDeltaPercent = scenario.baseline_total_cost 
    ? (costDelta / scenario.baseline_total_cost) * 100 
    : 0;
  const participantsDelta = (scenario.scenario_total_participants || 0) - (scenario.baseline_total_participants || 0);

  const isEditable = scenario.status === 'draft';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/scenarios')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{scenario.name}</h1>
                <Badge variant={scenario.status === 'draft' ? 'secondary' : 'default'}>
                  {scenario.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Based on: {(scenario as any).training_plans?.name} v{scenario.basis_plan_version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scenario.status === 'creating' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating... {scenario.creation_progress}%</span>
              </div>
            )}
            {isEditable && (
              <>
                <Button variant="outline" onClick={handleResetLevers}>
                  Reset Levers
                </Button>
                <Button 
                  onClick={handleRecalculate}
                  disabled={recalculateMutation.isPending}
                >
                  {recalculateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Recalculate
                </Button>
              </>
            )}
            {scenario.status === 'approved' && (
              <Button onClick={() => setPromoteDialogOpen(true)}>
                <GitMerge className="h-4 w-4 mr-2" />
                Promote to Plan
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar for creating state */}
        {scenario.status === 'creating' && (
          <Progress value={scenario.creation_progress} className="h-2" />
        )}

        {/* Summary Cards */}
        <ScenarioSummaryBar scenario={scenario} />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              {/* Controls Panel */}
              <ScenarioControlsPanel
                levers={levers}
                onLeversChange={setLevers}
                disabled={!isEditable}
                baselineCost={scenario.baseline_total_cost || 0}
              />

              {/* Items Grid */}
              <ScenarioItemsGrid
                items={itemsData?.items || []}
                totalItems={itemsData?.total || 0}
                isLoading={itemsLoading}
                page={page}
                onPageChange={setPage}
                filters={filters}
                onFiltersChange={setFilters}
                scenarioId={scenarioId!}
                isEditable={isEditable}
              />
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            <ScenarioComparisonView 
              currentScenarioId={scenarioId!}
              basisPlanId={scenario.basis_plan_id}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PromoteScenarioDialog
        open={promoteDialogOpen}
        onOpenChange={setPromoteDialogOpen}
        scenarioId={scenarioId!}
        scenarioName={scenario.name}
      />
    </DashboardLayout>
  );
}
