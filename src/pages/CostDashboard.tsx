import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useDashboardSummary,
  useEntityCosts,
  useProviderCosts,
  useDestinationCosts,
  useAnomalies,
  useRefreshAnalytics,
  useExportCosts,
} from '@/hooks/useCostDashboard';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Plane,
  Building2,
  Globe,
  RefreshCw,
  Download,
  AlertTriangle,
  PieChart,
  Settings,
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
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { TrainingVsNonTrainingChart } from '@/components/cost/TrainingVsNonTrainingChart';
import { AnomalyRulesConfig } from '@/components/cost/AnomalyRulesConfig';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)', 'hsl(280, 65%, 60%)'];

export default function CostDashboard() {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [entityFilter, setEntityFilter] = useState<string>('');

  const filters = { fiscalYear, entity: entityFilter || undefined };

  const { data: summary, isLoading: loadingSummary } = useDashboardSummary(filters);
  const { data: entityCosts, isLoading: loadingEntities } = useEntityCosts(filters);
  const { data: providerCosts, isLoading: loadingProviders } = useProviderCosts(filters);
  const { data: destinationCosts, isLoading: loadingDestinations } = useDestinationCosts(filters);
  const { data: anomalies } = useAnomalies(filters);

  const refreshAnalytics = useRefreshAnalytics();
  const exportCosts = useExportCosts();

  const formatCurrency = (amount: number, currency: string = 'LYD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data
  const categoryData = Object.entries(summary?.byCategory || {}).map(([name, value]) => ({
    name: name || 'Other',
    value: value as number,
  }));

  const monthlyData = Object.entries(summary?.byMonth || {})
    .map(([month, amount]) => ({
      name: month,
      amount: amount as number,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const costBreakdownData = [
    { name: 'Tuition', value: summary?.tuitionCost || 0 },
    { name: 'Travel', value: summary?.travelCost || 0 },
    { name: 'Per Diem', value: summary?.perDiemCost || 0 },
  ];

  const locationBreakdownData = [
    { name: 'Abroad', value: summary?.abroadCost || 0 },
    { name: 'Local', value: summary?.localCost || 0 },
  ];

  const openAnomalies = (anomalies || []).filter((a: any) => a.status === 'open');

  return (
    <DashboardLayout
      title="Training Cost Dashboard"
      description="Real-time visibility of training-related costs vs budget"
    >
      <div className="space-y-6">
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
              <SelectTrigger className="w-24 sm:w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-32 sm:w-48">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Entities</SelectItem>
                {Object.keys(summary?.byEntity || {}).map((entity) => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAnalytics.mutate({ fiscalYear })}
              disabled={refreshAnalytics.isPending}
            >
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCosts.mutate({ filters, exportType: 'summary' })}
              disabled={exportCosts.isPending}
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Anomaly Alert */}
        {openAnomalies.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {openAnomalies.length} cost anomalies detected. Review them in the Anomalies tab.
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-lg sm:text-2xl font-bold">{formatCurrency(summary?.totalCost || 0)}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <span>{summary?.budgetUsedPercentage || 0}% used</span>
                  </div>
                  <Progress value={summary?.budgetUsedPercentage || 0} className="mt-2 h-2" />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Travel & Per Diem</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-lg sm:text-2xl font-bold">
                    {formatCurrency((summary?.travelCost || 0) + (summary?.perDiemCost || 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.tripCount || 0} trips
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loadingSummary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-lg sm:text-2xl font-bold">{summary?.participantCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg {formatCurrency(summary?.participantCount ? summary.totalCost / summary.participantCount : 0)}/person
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Abroad vs Local</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-lg sm:text-2xl font-bold">
                    {summary?.totalCost ? Math.round((summary.abroadCost / summary.totalCost) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary?.abroadCost || 0)} abroad
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="entity">By Entity</TabsTrigger>
            <TabsTrigger value="provider">By Provider</TabsTrigger>
            <TabsTrigger value="destination">By Destination</TabsTrigger>
            <TabsTrigger value="training-travel">Training vs Other Travel</TabsTrigger>
            <TabsTrigger value="anomalies">
              Anomalies
              {openAnomalies.length > 0 && (
                <Badge variant="destructive" className="ml-2">{openAnomalies.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Cost Breakdown Pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>Tuition vs Travel vs Per Diem</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {costBreakdownData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={costBreakdownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {costBreakdownData.map((_, index) => (
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
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>By Training Category</CardTitle>
                  <CardDescription>Cost distribution across categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name }) => name}
                          >
                            {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Cost Trend</CardTitle>
                <CardDescription>Training costs over time</CardDescription>
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
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
          </TabsContent>

          <TabsContent value="entity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Entity</CardTitle>
                <CardDescription>Training costs and budget comparison by business unit</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEntities ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead className="text-right">Tuition</TableHead>
                        <TableHead className="text-right">Travel</TableHead>
                        <TableHead className="text-right">Per Diem</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">% Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(entityCosts || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No entity data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        (entityCosts || []).map((entity) => (
                          <TableRow key={entity.entity}>
                            <TableCell className="font-medium">{entity.entity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entity.tuitionCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entity.travelCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entity.perDiemCost)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(entity.totalCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entity.budget)}</TableCell>
                            <TableCell className="text-right">
                              <span className={entity.variance >= 0 ? 'text-green-600' : 'text-destructive'}>
                                {entity.variance >= 0 ? '+' : ''}{formatCurrency(entity.variance)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={entity.percentUsed > 100 ? 'destructive' : entity.percentUsed > 80 ? 'secondary' : 'default'}>
                                {entity.percentUsed}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="provider" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Provider</CardTitle>
                <CardDescription>Training provider cost analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProviders ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Participants</TableHead>
                        <TableHead className="text-right">Tuition</TableHead>
                        <TableHead className="text-right">Travel + Per Diem</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Avg/Participant</TableHead>
                        <TableHead className="text-right">Travel:Tuition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(providerCosts || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No provider data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        (providerCosts || []).map((provider) => (
                          <TableRow key={provider.providerId}>
                            <TableCell className="font-medium">{provider.providerName}</TableCell>
                            <TableCell className="text-right">{provider.sessionCount}</TableCell>
                            <TableCell className="text-right">{provider.participantCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(provider.tuitionCost)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(provider.travelCost + provider.perDiemCost)}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(provider.totalCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(provider.avgCostPerParticipant)}</TableCell>
                            <TableCell className="text-right">{provider.travelTuitionRatio}x</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="destination" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Destination</CardTitle>
                <CardDescription>Travel and per diem costs by training location</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDestinations ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead className="text-right">Trips</TableHead>
                        <TableHead className="text-right">Participants</TableHead>
                        <TableHead className="text-right">Travel</TableHead>
                        <TableHead className="text-right">Per Diem</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Avg/Participant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(destinationCosts || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No destination data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        (destinationCosts || []).map((dest, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{dest.country}</TableCell>
                            <TableCell>{dest.city}</TableCell>
                            <TableCell className="text-right">{dest.tripCount}</TableCell>
                            <TableCell className="text-right">{dest.participantCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(dest.travelCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(dest.perDiemCost)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(dest.totalCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(dest.avgCostPerParticipant)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training-travel" className="space-y-4">
            <TrainingVsNonTrainingChart fiscalYear={fiscalYear} entity={entityFilter} />
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Anomalies</CardTitle>
                <CardDescription>Unusual or outlier costs flagged for review</CardDescription>
              </CardHeader>
              <CardContent>
                {(anomalies || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No anomalies detected
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Detected</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(anomalies || []).map((anomaly: any) => (
                        <TableRow key={anomaly.id}>
                          <TableCell>{format(new Date(anomaly.detected_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="capitalize">{anomaly.entity_type}</TableCell>
                          <TableCell>{anomaly.entity_name || anomaly.entity_id}</TableCell>
                          <TableCell>{anomaly.cost_anomaly_rules?.rule_name || '-'}</TableCell>
                          <TableCell className="text-right">
                            {anomaly.expected_value ? formatCurrency(anomaly.expected_value) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {anomaly.actual_value ? formatCurrency(anomaly.actual_value) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {anomaly.variance_percentage ? `${anomaly.variance_percentage}%` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={anomaly.status === 'open' ? 'destructive' : 'secondary'}>
                              {anomaly.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <AnomalyRulesConfig />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
