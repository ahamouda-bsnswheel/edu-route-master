import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  GraduationCap, Search, Filter, Eye, TrendingUp, TrendingDown, 
  Clock, AlertTriangle, Users, CheckCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useScholarRecords, useScholarDashboardStats } from '@/hooks/useAcademicProgress';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_enrolled: { label: 'Not Enrolled', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  on_leave: { label: 'On Leave', variant: 'outline' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'default' },
  withdrawn: { label: 'Withdrawn', variant: 'destructive' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  on_track: { label: 'On Track', color: 'text-green-700', bgColor: 'bg-green-100' },
  watch: { label: 'Watch', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  at_risk: { label: 'At Risk', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export default function Scholars() {
  const navigate = useNavigate();
  const { data: records, isLoading } = useScholarRecords();
  const { data: stats } = useScholarDashboardStats();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  
  const filteredRecords = records?.filter(record => {
    const matchesSearch = 
      record.employee?.first_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee?.last_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.institution.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || record.risk_level === riskFilter;
    
    return matchesSearch && matchesStatus && matchesRisk;
  });
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8" />
            Scholar Records
          </h1>
          <p className="text-muted-foreground mt-1">
            Track academic progress of long-term program participants
          </p>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{stats.active}</div>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{stats.onTrack}</div>
                    <p className="text-xs text-muted-foreground">On Track</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{stats.watch}</div>
                    <p className="text-xs text-muted-foreground">Watch</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{stats.atRisk}</div>
                    <p className="text-xs text-muted-foreground">At Risk</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{stats.completed}</div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, program, or institution..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Scholars</CardTitle>
            <CardDescription>
              {filteredRecords?.length || 0} scholar(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRecords && filteredRecords.length > 0 ? (
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scholar</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map(record => {
                    const statusInfo = STATUS_CONFIG[record.status] || STATUS_CONFIG.active;
                    const riskInfo = RISK_CONFIG[record.risk_level] || RISK_CONFIG.on_track;
                    const progress = record.total_credits_required 
                      ? Math.round((record.credits_completed / record.total_credits_required) * 100)
                      : 0;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.employee?.first_name_en} {record.employee?.last_name_en}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.employee?.employee_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.program_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {record.degree_level.replace('_', ' ')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{record.institution}</TableCell>
                        <TableCell>{record.country}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskInfo.bgColor} ${riskInfo.color}`}>
                            {riskInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/scholars/${record.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Scholars Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || riskFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Scholar records will appear here when scholarship applications are accepted'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
