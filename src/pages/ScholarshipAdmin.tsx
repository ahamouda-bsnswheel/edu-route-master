import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HistoricalScholarshipImport } from '@/components/scholarship/HistoricalScholarshipImport';
import { GraduationCap, Upload, BarChart3, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function ScholarshipAdmin() {
  const { data: stats } = useQuery({
    queryKey: ['scholarship-stats'],
    queryFn: async () => {
      const { data: applications } = await supabase
        .from('scholarship_applications')
        .select('status, is_historical_import');
      
      if (!applications) return null;
      
      return {
        total: applications.length,
        pending: applications.filter(a => 
          ['submitted_to_manager', 'manager_review', 'hrbp_review', 'ld_review', 'committee_review', 'finance_review', 'final_approval']
          .includes(a.status || '')
        ).length,
        approved: applications.filter(a => 
          ['accepted', 'approved_pending_acceptance'].includes(a.status || '')
        ).length,
        rejected: applications.filter(a => 
          ['rejected', 'rejected_by_manager'].includes(a.status || '')
        ).length,
        historical: applications.filter(a => a.is_historical_import).length,
      };
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Scholarship Administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage scholarship programs, applications, and historical data
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <p className="text-xs text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.historical}</div>
                <p className="text-xs text-muted-foreground">Historical Imports</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Historical Import
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <HistoricalScholarshipImport />
          </TabsContent>

          <TabsContent value="programs">
            <Card>
              <CardHeader>
                <CardTitle>Scholarship Programs</CardTitle>
                <CardDescription>
                  Manage available scholarship programs catalog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Program management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Scholarship Reports</CardTitle>
                <CardDescription>
                  Analytics and reporting for scholarship applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Reports coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Scholarship Settings</CardTitle>
                <CardDescription>
                  Configure scholarship workflow and policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
