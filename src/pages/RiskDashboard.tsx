import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, TrendingUp, Clock, CheckCircle, RefreshCw, 
  Search, Filter, Bell, Settings, Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useRiskDashboardStats, 
  useRiskAlerts, 
  useTriggerBatchScoring,
  useUpdateRiskAlert
} from '@/hooks/useScholarRisk';
import { useScholarRecords } from '@/hooks/useAcademicProgress';
import { format } from 'date-fns';
import { RiskAlertDialog } from '@/components/risk/RiskAlertDialog';

const RISK_BAND_CONFIG = {
  on_track: { label: 'On Track', color: 'bg-green-500', textColor: 'text-green-700', icon: CheckCircle },
  watch: { label: 'Watch', color: 'bg-amber-500', textColor: 'text-amber-700', icon: Clock },
  at_risk: { label: 'At Risk', color: 'bg-orange-500', textColor: 'text-orange-700', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-700', icon: AlertTriangle },
};

export default function RiskDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  
  const { data: stats, isLoading: statsLoading } = useRiskDashboardStats();
  const { data: alerts, isLoading: alertsLoading } = useRiskAlerts('pending');
  const { data: scholars, isLoading: scholarsLoading } = useScholarRecords();
  const triggerBatch = useTriggerBatchScoring();
  const updateAlert = useUpdateRiskAlert();

  const filteredScholars = scholars?.filter(scholar => {
    const matchesSearch = !searchTerm || 
      scholar.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholar.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scholar.employee as any)?.first_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scholar.employee as any)?.last_name_en?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'all' || scholar.risk_level === riskFilter;
    
    return matchesSearch && matchesRisk;
  });

  const handleRunBatchScoring = () => {
    triggerBatch.mutate();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-7 w-7" />
              AI Risk Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor non-completion risk across all scholars
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/scholars-admin')}>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button onClick={handleRunBatchScoring} disabled={triggerBatch.isPending}>
              {triggerBatch.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Scoring
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(RISK_BAND_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = stats?.distribution[key as keyof typeof stats.distribution] || 0;
            return (
              <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRiskFilter(key)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{config.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <div className={`p-2 rounded-full ${config.color}/10`}>
                      <Icon className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/risk-alerts')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Alerts</p>
                  <p className="text-2xl font-bold">{stats?.pendingAlerts || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="scholars" className="space-y-4">
          <TabsList>
            <TabsTrigger value="scholars">Scholars by Risk</TabsTrigger>
            <TabsTrigger value="alerts">
              Recent Alerts
              {(stats?.pendingAlerts || 0) > 0 && (
                <Badge variant="destructive" className="ml-2">{stats?.pendingAlerts}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scholars" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, program, institution..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scholars Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scholar</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scholarsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredScholars?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No scholars found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredScholars?.map((scholar) => {
                        const riskConfig = RISK_BAND_CONFIG[scholar.risk_level as keyof typeof RISK_BAND_CONFIG] || RISK_BAND_CONFIG.on_track;
                        const RiskIcon = riskConfig.icon;
                        const employee = scholar.employee as any;
                        
                        return (
                          <TableRow 
                            key={scholar.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/scholars/${scholar.id}`)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {employee?.first_name_en} {employee?.last_name_en}
                                </p>
                                <p className="text-sm text-muted-foreground">{employee?.employee_id}</p>
                              </div>
                            </TableCell>
                            <TableCell>{scholar.program_name}</TableCell>
                            <TableCell>{scholar.institution}</TableCell>
                            <TableCell>{scholar.country}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {scholar.status?.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 ${riskConfig.textColor}`}>
                                <RiskIcon className="h-4 w-4" />
                                <span className="font-medium">{riskConfig.label}</span>
                                {scholar.risk_override && (
                                  <Badge variant="secondary" className="ml-1 text-xs">Override</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">View</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Risk Alerts</CardTitle>
                <CardDescription>
                  Scholars whose risk level has escalated and require review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : alerts?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No pending alerts</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts?.map((alert: any) => {
                      const prevConfig = alert.previous_band ? RISK_BAND_CONFIG[alert.previous_band as keyof typeof RISK_BAND_CONFIG] : null;
                      const newConfig = RISK_BAND_CONFIG[alert.new_band as keyof typeof RISK_BAND_CONFIG];
                      const scholar = alert.scholar_record;
                      const employee = scholar?.employee;
                      
                      return (
                        <div 
                          key={alert.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${newConfig.color}/10`}>
                              <AlertTriangle className={`h-5 w-5 ${newConfig.textColor}`} />
                            </div>
                            <div>
                              <p className="font-medium">
                                {employee?.first_name_en} {employee?.last_name_en}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {scholar?.program_name} at {scholar?.institution}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {prevConfig && (
                                  <>
                                    <Badge variant="outline" className={prevConfig.textColor}>
                                      {prevConfig.label}
                                    </Badge>
                                    <span>→</span>
                                  </>
                                )}
                                <Badge className={`${newConfig.color} text-white`}>
                                  {newConfig.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}
                            </p>
                            <Badge variant="secondary" className="mt-1 capitalize">
                              {alert.alert_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedAlert && (
        <RiskAlertDialog
          alert={selectedAlert}
          open={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdate={(status, notes) => {
            updateAlert.mutate({ alertId: selectedAlert.id, status, notes });
            setSelectedAlert(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
