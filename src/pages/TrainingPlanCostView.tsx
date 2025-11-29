import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Download, 
  DollarSign,
  PieChart,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import {
  useTrainingPlan,
  useTrainingPlanItems,
  usePlanSummary,
} from '@/hooks/useTrainingPlan';
import { toast } from 'sonner';

export default function TrainingPlanCostView() {
  const { id: planId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: plan, isLoading: planLoading } = useTrainingPlan(planId || null);
  const { data: items = [] } = useTrainingPlanItems(planId || null, { status: 'active' });
  const { data: summary } = usePlanSummary(planId || null);
  
  const handleExport = () => {
    if (!items.length) return;
    
    const headers = ['Item Name', 'Category', 'Department', 'Cost Centre', 'Participants', 'Unit Cost', 'Total Cost', 'Quarter'];
    const rows = items.map(item => [
      item.item_name,
      item.category?.name_en || '',
      item.department?.name_en || '',
      item.cost_centre || '',
      item.planned_participants,
      item.unit_cost,
      (item.unit_cost || 0) * (item.planned_participants || 0),
      item.target_quarter || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-plan-cost-${plan?.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Cost data exported');
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
      title={`${plan.name} - Cost View`} 
      description="Financial overview of the training plan"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/training-plan')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Cost Data
          </Button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                  <p className="text-3xl font-bold">{(summary?.totalCost || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{plan.cost_currency}</p>
                </div>
                <DollarSign className="h-10 w-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Local Training</p>
                  <p className="text-2xl font-bold">{(summary?.byType.local.cost || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{summary?.byType.local.participants || 0} participants</p>
                </div>
                <PieChart className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abroad Training</p>
                  <p className="text-2xl font-bold">{(summary?.byType.abroad.cost || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{summary?.byType.abroad.participants || 0} participants</p>
                </div>
                <PieChart className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Cost Breakdowns */}
        <Tabs defaultValue="category">
          <TabsList>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="department">By Department</TabsTrigger>
            <TabsTrigger value="quarter">By Quarter</TabsTrigger>
            <TabsTrigger value="items">All Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value="category" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Participants</TableHead>
                      <TableHead className="text-right">Cost ({plan.cost_currency})</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary?.byCategory.map((cat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">{cat.participants.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{cat.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {summary.totalCost ? ((cat.cost / summary.totalCost) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{summary?.totalParticipants?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{summary?.totalCost?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="department" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Participants</TableHead>
                      <TableHead className="text-right">Cost ({plan.cost_currency})</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary?.byDepartment.map((dept, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-right">{dept.participants.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{dept.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {summary.totalCost ? ((dept.cost / summary.totalCost) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{summary?.totalParticipants?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{summary?.totalCost?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="quarter" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Quarter</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quarter</TableHead>
                      <TableHead className="text-right">Participants</TableHead>
                      <TableHead className="text-right">Cost ({plan.cost_currency})</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary?.byQuarter.map((q, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{q.quarter}</TableCell>
                        <TableCell className="text-right">{q.participants.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{q.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {summary.totalCost ? ((q.cost / summary.totalCost) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{summary?.totalParticipants?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{summary?.totalCost?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="items" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Plan Items with Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost Centre</TableHead>
                      <TableHead className="text-right">Participants</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Quarter</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.category?.name_en || '-'}</TableCell>
                        <TableCell>{item.cost_centre || '-'}</TableCell>
                        <TableCell className="text-right">{item.planned_participants}</TableCell>
                        <TableCell className="text-right">{(item.unit_cost || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          {((item.unit_cost || 0) * (item.planned_participants || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell>{item.target_quarter || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
