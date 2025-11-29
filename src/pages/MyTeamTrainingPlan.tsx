import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search, 
  Users, 
  Calendar, 
  GraduationCap,
  MapPin,
  Building2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamPlanItem {
  id: string;
  item_name: string;
  training_type: string;
  training_location: string;
  target_quarter: string | null;
  planned_participants: number;
  priority: string;
  plan: {
    id: string;
    name: string;
    fiscal_year: string;
    status: string;
  };
}

interface TeamMemberTraining {
  employee_id: string;
  employee_name: string;
  department: string;
  planned_trainings: number;
  local_trainings: number;
  abroad_trainings: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  under_area_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  under_corporate_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  locked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const priorityColors: Record<string, string> = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-secondary text-secondary-foreground',
};

export default function MyTeamTrainingPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  
  // Fetch team members
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, employee_id, department_id')
        .eq('manager_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
  
  // Fetch plan items where team members are included
  const { data: planItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['team-plan-items', user?.id, selectedYear],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get active/approved plans for the selected year
      const { data: plans, error: plansError } = await supabase
        .from('training_plans')
        .select('id, name, fiscal_year, status')
        .eq('fiscal_year', selectedYear)
        .in('status', ['approved', 'locked', 'under_corporate_review']);
      
      if (plansError) throw plansError;
      if (!plans || plans.length === 0) return [];
      
      // Get plan items
      const planIds = plans.map(p => p.id);
      const { data: items, error: itemsError } = await supabase
        .from('training_plan_items')
        .select('*')
        .in('plan_id', planIds)
        .eq('item_status', 'active');
      
      if (itemsError) throw itemsError;
      
      // Combine with plan info
      return (items || []).map((item: any) => ({
        ...item,
        plan: plans.find(p => p.id === item.plan_id),
      }));
    },
    enabled: !!user?.id,
  });
  
  // Filter items
  const filteredItems = planItems.filter((item: TeamPlanItem) => {
    const matchesSearch = !search || 
      item.item_name.toLowerCase().includes(search.toLowerCase());
    const matchesQuarter = selectedQuarter === 'all' || 
      item.target_quarter === selectedQuarter;
    return matchesSearch && matchesQuarter;
  });
  
  // Calculate summary stats
  const summary = {
    totalItems: filteredItems.length,
    totalParticipants: filteredItems.reduce((sum: number, i: TeamPlanItem) => sum + (i.planned_participants || 0), 0),
    localTrainings: filteredItems.filter((i: TeamPlanItem) => i.training_location === 'local').length,
    abroadTrainings: filteredItems.filter((i: TeamPlanItem) => i.training_location === 'abroad').length,
    byQuarter: {
      Q1: filteredItems.filter((i: TeamPlanItem) => i.target_quarter === 'Q1').length,
      Q2: filteredItems.filter((i: TeamPlanItem) => i.target_quarter === 'Q2').length,
      Q3: filteredItems.filter((i: TeamPlanItem) => i.target_quarter === 'Q3').length,
      Q4: filteredItems.filter((i: TeamPlanItem) => i.target_quarter === 'Q4').length,
    },
  };
  
  const isLoading = teamLoading || itemsLoading;
  
  return (
    <DashboardLayout
      title="My Team in Training Plan"
      description="View planned training for your team members"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                  <p className="text-2xl font-bold">{teamMembers.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Planned Trainings</p>
                  <p className="text-2xl font-bold">{summary.totalItems}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Local</p>
                  <p className="text-2xl font-bold">{summary.localTrainings}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abroad</p>
                  <p className="text-2xl font-bold">{summary.abroadTrainings}</p>
                </div>
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search trainings..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, -1].map(offset => {
                    const year = new Date().getFullYear() + offset;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quarters</SelectItem>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Quarter Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Training by Quarter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((quarter) => (
                <div
                  key={quarter}
                  className={`p-4 rounded-lg border text-center cursor-pointer transition-colors ${
                    selectedQuarter === quarter ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedQuarter(selectedQuarter === quarter ? 'all' : quarter)}
                >
                  <p className="text-lg font-semibold">{quarter}</p>
                  <p className="text-2xl font-bold text-primary">{summary.byQuarter[quarter]}</p>
                  <p className="text-xs text-muted-foreground">trainings</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Training Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Planned Trainings</CardTitle>
            <CardDescription>
              {filteredItems.length} {filteredItems.length === 1 ? 'training' : 'trainings'} planned for {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No planned trainings found for {selectedYear}</p>
                <p className="text-sm mt-2">
                  Trainings will appear here once the annual training plan is approved
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Plan Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: TeamPlanItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">{item.plan?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.training_type === 'short_term' ? 'Short-term' : 'Long-term'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.training_location === 'local' ? 'secondary' : 'default'}>
                          {item.training_location === 'local' ? 'Local' : 'Abroad'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.target_quarter || '-'}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[item.priority]}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.planned_participants}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.plan?.status || 'draft']}>
                          {item.plan?.status?.replace(/_/g, ' ')}
                        </Badge>
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
