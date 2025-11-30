import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useExportSummary, useExportBatches, ExportBatch } from '@/hooks/useExpenseExport';
import { 
  DollarSign, 
  TrendingUp, 
  Globe, 
  Briefcase,
  Calendar,
  PieChart
} from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

export default function TrainingSpendSummary() {
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  const { data: summary, isLoading: loadingSummary } = useExportSummary();
  const { data: batches, isLoading: loadingBatches } = useExportBatches({ status: 'exported' });

  const formatCurrency = (amount: number, currency: string = 'LYD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data
  const countryData = Object.entries(summary?.byCountry || {}).map(([country, amount]) => ({
    name: country || 'Domestic',
    value: amount as number,
  }));

  const expenseTypeData = Object.entries(summary?.byExpenseType || {}).map(([type, amount]) => ({
    name: type.replace('_', ' '),
    value: amount as number,
  }));

  const monthlyData = Object.entries(summary?.byMonth || {}).map(([month, amount]) => ({
    name: month,
    amount: amount as number,
  })).sort((a, b) => a.name.localeCompare(b.name));

  // Calculate totals by category for L&D/HRBP view
  const calculateCategoryTotals = () => {
    if (!batches) return [];
    
    const exportedBatches = batches.filter(b => ['exported', 're_exported', 'closed'].includes(b.status));
    const perDiemTotal = exportedBatches
      .filter(b => b.export_type === 'per_diem')
      .reduce((sum, b) => sum + b.total_amount, 0);
    const tuitionTotal = exportedBatches
      .filter(b => b.export_type === 'tuition')
      .reduce((sum, b) => sum + b.total_amount, 0);
    const travelTotal = exportedBatches
      .filter(b => b.export_type === 'travel_cost')
      .reduce((sum, b) => sum + b.total_amount, 0);
    
    return [
      { category: 'Per Diem Allowances', amount: perDiemTotal, percentage: 0 },
      { category: 'Tuition & Training Fees', amount: tuitionTotal, percentage: 0 },
      { category: 'Travel Costs', amount: travelTotal, percentage: 0 },
    ].map(item => ({
      ...item,
      percentage: summary?.totalExported ? Math.round((item.amount / summary.totalExported) * 100) : 0,
    }));
  };

  const categoryTotals = calculateCategoryTotals();

  return (
    <DashboardLayout
      title="Training Spend Summary"
      description="Aggregated view of training-related travel and expense spend for budget discussions"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-4">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Training Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.totalExported || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.totalRecords || 0} expense records
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Export Batches</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summary?.totalBatches || 0}</div>
                  <p className="text-xs text-muted-foreground">Exported to Finance</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Countries Covered</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {Object.keys(summary?.byCountry || {}).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Training destinations</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per Batch</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      summary?.totalBatches 
                        ? (summary.totalExported / summary.totalBatches) 
                        : 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Average batch value</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spend by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
            <CardDescription>Breakdown of training expenses by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryTotals.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.percentage}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(summary?.totalExported || 0)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="h-64">
                {expenseTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expenseTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {expenseTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
            <CardDescription>Training expense trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM');
                      }}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => {
                        const [year, month] = label.split('-');
                        return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
                      }}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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

        {/* Spend by Destination */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Destination</CardTitle>
            <CardDescription>Training expenses by country/destination</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No destination data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    countryData.slice(0, 10).map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="h-64">
                {countryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={countryData.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name }) => name}
                      >
                        {countryData.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No destination data available
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Export Batches (linked for traceability) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Export Batches</CardTitle>
            <CardDescription>
              Export batches contributing to these figures (for traceability)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBatches ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Exported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(batches || []).slice(0, 10).map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-sm">{batch.batch_number}</TableCell>
                      <TableCell className="capitalize">{batch.export_type.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {format(new Date(batch.period_start), 'MMM d')} - {format(new Date(batch.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{batch.total_records}</TableCell>
                      <TableCell className="text-right">{formatCurrency(batch.total_amount, batch.currency)}</TableCell>
                      <TableCell>
                        {batch.exported_at ? format(new Date(batch.exported_at), 'MMM d, yyyy') : '-'}
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
