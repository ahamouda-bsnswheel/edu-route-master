import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Plane, TrendingUp } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

interface TrainingVsNonTrainingChartProps {
  fiscalYear: number;
  entity?: string;
}

export function TrainingVsNonTrainingChart({ fiscalYear, entity }: TrainingVsNonTrainingChartProps) {
  // Fetch training travel data from cost_analytics
  const { data, isLoading } = useQuery({
    queryKey: ['training-vs-nontraining-travel', fiscalYear, entity],
    queryFn: async () => {
      // Get training travel costs
      let query = supabase
        .from('cost_analytics')
        .select('travel_cost, per_diem_cost, entity, period_month')
        .eq('period_year', fiscalYear);

      if (entity) {
        query = query.eq('entity', entity);
      }

      const { data: trainingData, error } = await query;
      if (error) throw error;

      // Aggregate training travel
      let trainingTravelCost = 0;
      let trainingPerDiemCost = 0;
      const byEntity: Record<string, { training: number; nonTraining: number }> = {};
      const byMonth: Record<string, { training: number; nonTraining: number }> = {};

      for (const row of trainingData || []) {
        const travel = Number(row.travel_cost) || 0;
        const perDiem = Number(row.per_diem_cost) || 0;
        trainingTravelCost += travel;
        trainingPerDiemCost += perDiem;

        // By entity
        if (row.entity) {
          if (!byEntity[row.entity]) {
            byEntity[row.entity] = { training: 0, nonTraining: 0 };
          }
          byEntity[row.entity].training += travel + perDiem;
        }

        // By month
        const monthKey = `${fiscalYear}-${String(row.period_month).padStart(2, '0')}`;
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { training: 0, nonTraining: 0 };
        }
        byMonth[monthKey].training += travel + perDiem;
      }

      // Estimate non-training travel (this would come from ERP/Finance in real implementation)
      // For now, we'll show training travel only with a note
      const totalTrainingTravel = trainingTravelCost + trainingPerDiemCost;
      
      // Mock non-training data (in production, this comes from ERP integration)
      const estimatedTotalTravel = totalTrainingTravel * 2.5; // Assume training is ~40% of total travel
      const nonTrainingTravel = estimatedTotalTravel - totalTrainingTravel;

      // Update entity and month data with estimated non-training
      Object.keys(byEntity).forEach(key => {
        byEntity[key].nonTraining = byEntity[key].training * 1.5; // Mock ratio
      });
      Object.keys(byMonth).forEach(key => {
        byMonth[key].nonTraining = byMonth[key].training * 1.5; // Mock ratio
      });

      return {
        trainingTravel: totalTrainingTravel,
        nonTrainingTravel,
        totalTravel: estimatedTotalTravel,
        trainingPercentage: totalTrainingTravel / estimatedTotalTravel * 100,
        byEntity: Object.entries(byEntity).map(([name, values]) => ({
          name,
          training: values.training,
          nonTraining: values.nonTraining,
        })),
        byMonth: Object.entries(byMonth)
          .map(([name, values]) => ({
            name,
            training: values.training,
            nonTraining: values.nonTraining,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LYD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const pieData = [
    { name: 'Training Travel', value: data?.trainingTravel || 0 },
    { name: 'Other Business Travel', value: data?.nonTrainingTravel || 0 },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Travel</CardTitle>
            <Plane className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.trainingTravel || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {data?.trainingPercentage?.toFixed(1)}% of total travel
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Other Business Travel</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.nonTrainingTravel || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {(100 - (data?.trainingPercentage || 0)).toFixed(1)}% of total travel
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Travel Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalTravel || 0)}</div>
            <p className="text-xs text-muted-foreground">All business travel</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Travel Spend Distribution</CardTitle>
            <CardDescription>Training vs other business travel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No travel data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
            <CardDescription>Training vs other travel by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {(data?.byMonth || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={(value) => {
                        const [, month] = value.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return months[parseInt(month) - 1];
                      }}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="training" name="Training Travel" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="nonTraining" name="Other Travel" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No monthly data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entity Breakdown */}
      {(data?.byEntity || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Travel by Entity</CardTitle>
            <CardDescription>Training vs other travel by business unit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byEntity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="training" name="Training Travel" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="nonTraining" name="Other Travel" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Note about data source */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Training travel data comes from the LMS per diem and travel records.
            Other business travel data would typically come from ERP/Finance integration.
            The "Other Business Travel" figures shown are estimated for demonstration purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
