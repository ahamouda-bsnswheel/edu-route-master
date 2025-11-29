import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap, Settings, Upload, BarChart3 } from 'lucide-react';
import { HistoricalScholarImport } from '@/components/scholars/HistoricalScholarImport';
import { RiskRulesConfig } from '@/components/scholars/RiskRulesConfig';
import { useScholarDashboardStats } from '@/hooks/useAcademicProgress';

export default function ScholarsAdmin() {
  const { data: stats } = useScholarDashboardStats();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7" />
            Scholars Administration
          </h1>
          <p className="text-muted-foreground">
            Manage academic progress tracking settings and data imports
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="risk-rules">
              <Settings className="h-4 w-4 mr-2" />
              Risk Rules
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Historical Import
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Degree Level</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.byDegree && Object.keys(stats.byDegree).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(stats.byDegree).map(([degree, count]) => (
                        <div key={degree} className="flex justify-between items-center">
                          <span className="capitalize text-sm">{degree.replace('_', ' ')}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Country</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.byCountry && Object.keys(stats.byCountry).length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Object.entries(stats.byCountry)
                        .sort(([, a], [, b]) => b - a)
                        .map(([country, count]) => (
                          <div key={country} className="flex justify-between items-center">
                            <span className="text-sm">{country}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Scholars</span>
                      <span className="font-semibold">{stats?.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active</span>
                      <span className="font-semibold text-blue-600">{stats?.active || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">On Track</span>
                      <span className="font-semibold text-green-600">{stats?.onTrack || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">At Risk</span>
                      <span className="font-semibold text-red-600">{stats?.atRisk || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed</span>
                      <span className="font-semibold text-green-700">{stats?.completed || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Rules Tab */}
          <TabsContent value="risk-rules">
            <RiskRulesConfig />
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import">
            <HistoricalScholarImport />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
