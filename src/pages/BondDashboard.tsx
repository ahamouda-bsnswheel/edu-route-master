import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  CalendarClock,
  DollarSign,
  Users,
  ArrowRight
} from 'lucide-react';
import { useBonds, useBondDashboardStats, usePendingWaivers, ServiceBond } from '@/hooks/useBonds';
import { PendingWaiversList } from '@/components/bonds/PendingWaiversList';
import { format, differenceInDays, differenceInMonths } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  pending: { label: 'Pending Return', variant: 'outline', color: 'text-amber-600' },
  active: { label: 'Active', variant: 'default', color: 'text-blue-600' },
  fulfilled: { label: 'Fulfilled', variant: 'secondary', color: 'text-green-600' },
  broken: { label: 'Broken', variant: 'destructive', color: 'text-red-600' },
  waived_partial: { label: 'Partially Waived', variant: 'outline', color: 'text-orange-600' },
  waived_full: { label: 'Fully Waived', variant: 'outline', color: 'text-purple-600' },
  cancelled: { label: 'Cancelled', variant: 'outline', color: 'text-muted-foreground' },
};

function BondProgressBar({ bond }: { bond: ServiceBond }) {
  if (bond.status !== 'active' || !bond.bond_start_date || !bond.bond_end_date) {
    return null;
  }

  const start = new Date(bond.bond_start_date);
  const end = new Date(bond.bond_end_date);
  const now = new Date();
  
  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);
  const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  const monthsServed = differenceInMonths(now, start);
  const monthsRemaining = Math.max(0, bond.bond_duration_months - monthsServed);

  return (
    <div className="space-y-1">
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {monthsServed} of {bond.bond_duration_months} months ({monthsRemaining} remaining)
      </p>
    </div>
  );
}

export default function BondDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const { data: stats, isLoading: statsLoading } = useBondDashboardStats();
  const { data: bonds, isLoading: bondsLoading } = useBonds({ status: statusFilter });
  const { data: pendingWaivers } = usePendingWaivers();

  const filteredBonds = bonds?.filter(bond => {
    const employeeName = `${bond.employee?.first_name_en || ''} ${bond.employee?.last_name_en || ''}`.toLowerCase();
    const program = bond.scholar_record?.program_name?.toLowerCase() || '';
    const matchesSearch = !searchTerm || 
      employeeName.includes(searchTerm.toLowerCase()) ||
      program.includes(searchTerm.toLowerCase());
    
    if (activeTab === 'pending-return') {
      return matchesSearch && bond.status === 'pending';
    }
    if (activeTab === 'approaching') {
      if (bond.status !== 'active' || !bond.bond_end_date) return false;
      const daysUntilEnd = differenceInDays(new Date(bond.bond_end_date), new Date());
      return matchesSearch && daysUntilEnd <= 90 && daysUntilEnd > 0;
    }
    if (activeTab === 'broken') {
      return matchesSearch && bond.status === 'broken';
    }
    return matchesSearch;
  });

  return (
    <DashboardLayout title="Bond & Return Tracking" description="Monitor service bonds, return-to-work status, and bond fulfilment">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonds</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active || 0} active, {stats?.fulfilled || 0} fulfilled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Return</CardTitle>
            <CalendarClock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.pendingReturn || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting return confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approaching Fulfilment</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.approachingFulfilment || 0}</div>
            <p className="text-xs text-muted-foreground">
              Within next 3 months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Repayments</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.outstandingRepayment?.toLocaleString() || 0} LYD
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.broken || 0} broken bonds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Waivers Section */}
      {pendingWaivers && pendingWaivers.length > 0 && (
        <PendingWaiversList />
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Bond Records</CardTitle>
          <CardDescription>
            View and manage service bonds and return-to-work tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="all">All Bonds</TabsTrigger>
                <TabsTrigger value="pending-return">
                  Pending Return
                  {stats?.pendingReturn ? (
                    <Badge variant="secondary" className="ml-2">{stats.pendingReturn}</Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="approaching">
                  Approaching Fulfilment
                  {stats?.approachingFulfilment ? (
                    <Badge variant="secondary" className="ml-2">{stats.approachingFulfilment}</Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="broken">
                  Broken Bonds
                  {stats?.broken ? (
                    <Badge variant="destructive" className="ml-2">{stats.broken}</Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2 ml-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or program..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="broken">Broken</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {bondsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredBonds?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No bond records found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Bond Duration</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bond End Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBonds?.map((bond) => {
                      const statusConfig = STATUS_CONFIG[bond.status] || STATUS_CONFIG.pending;
                      return (
                        <TableRow key={bond.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {bond.employee?.first_name_en} {bond.employee?.last_name_en}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {bond.employee?.employee_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{bond.scholar_record?.program_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {bond.scholar_record?.institution}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{bond.bond_duration_months} months</span>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <BondProgressBar bond={bond} />
                            {bond.status === 'pending' && (
                              <span className="text-xs text-amber-600">Awaiting return</span>
                            )}
                            {bond.status === 'fulfilled' && (
                              <span className="text-xs text-green-600">Completed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant} className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {bond.bond_end_date ? (
                              format(new Date(bond.bond_end_date), 'dd MMM yyyy')
                            ) : (
                              <span className="text-muted-foreground">Not started</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/bonds/${bond.id}`)}
                            >
                              View <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
