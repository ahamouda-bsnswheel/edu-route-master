import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  Download, 
  TrendingUp,
  Users,
  DollarSign,
  Target,
  PieChart,
} from 'lucide-react';
import { useTopCriticalTrainings, usePriorityByDimension, useStrategicThemeDistribution } from '@/hooks/useAIPriority';

const bandColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-muted text-muted-foreground',
};

interface PriorityLeadershipDashboardProps {
  periodId?: string;
  planId?: string;
}

export function PriorityLeadershipDashboard({ periodId, planId }: PriorityLeadershipDashboardProps) {
  const [dimension, setDimension] = useState<'entity' | 'department' | 'job_family' | 'site'>('entity');
  
  const { data: topTrainings = [], isLoading: topLoading } = useTopCriticalTrainings(50);
  const { data: dimensionData = [], isLoading: dimLoading } = usePriorityByDimension(dimension);
  const { data: themeData = [], isLoading: themeLoading } = useStrategicThemeDistribution();

  const handleExport = () => {
    // Export top trainings to CSV
    const csvData = topTrainings.map((t, idx) => ({
      'Rank': idx + 1,
      'Training Name': t.course_name,
      'Category': t.category || 'N/A',
      'Priority Band': t.priority_band,
      'Avg Score': Math.round(t.avg_score),
      'Total Employees': t.employee_count,
      'Est. Cost': t.estimated_cost?.toLocaleString() || 'N/A',
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Top_Critical_Trainings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Distribution by Dimension */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Priority Distribution
              </CardTitle>
              <CardDescription>
                Training needs distribution by priority band across organizational dimensions
              </CardDescription>
            </div>
            <Select value={dimension} onValueChange={(v) => setDimension(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entity">By Entity</SelectItem>
                <SelectItem value="department">By Department</SelectItem>
                <SelectItem value="job_family">By Job Family</SelectItem>
                <SelectItem value="site">By Site</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {dimLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : dimensionData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No distribution data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dimension === 'entity' ? 'Entity' : dimension === 'department' ? 'Department' : dimension === 'job_family' ? 'Job Family' : 'Site'}</TableHead>
                  <TableHead className="text-center">Critical</TableHead>
                  <TableHead className="text-center">High</TableHead>
                  <TableHead className="text-center">Medium</TableHead>
                  <TableHead className="text-center">Low</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dimensionData.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={bandColors.critical}>{row.critical}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={bandColors.high}>{row.high}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={bandColors.medium}>{row.medium}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={bandColors.low}>{row.low}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.total}</TableCell>
                    <TableCell className="text-right">{row.avgScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top 50 Critical Trainings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 50 Critical Trainings
              </CardTitle>
              <CardDescription>
                Highest priority training needs aggregated by course/topic
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={topTrainings.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : topTrainings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No training priority data available</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Training</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead className="text-right">
                      <Users className="h-4 w-4 inline mr-1" />
                      Employees
                    </TableHead>
                    <TableHead className="text-right">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Est. Cost
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTrainings.map((training, idx) => (
                    <TableRow key={training.course_id || idx}>
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{training.course_name}</p>
                          {training.course_code && (
                            <p className="text-xs text-muted-foreground">{training.course_code}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{training.category || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge className={bandColors[training.priority_band]}>
                            {training.priority_band}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(training.avg_score)}/100
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {training.employee_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {training.estimated_cost 
                          ? `${training.estimated_cost.toLocaleString()} SAR` 
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategic Theme Alignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategic Theme Alignment
          </CardTitle>
          <CardDescription>
            Priority distribution across strategic focus areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {themeLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : themeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No strategic theme data available</p>
              <p className="text-xs mt-2">Tag training items with strategic themes to see alignment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themeData.map((theme) => (
                <div key={theme.theme} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">{theme.theme}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Critical/High</span>
                      <span className="font-medium">{theme.critical + theme.high}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-destructive"
                        style={{ width: `${((theme.critical + theme.high) / theme.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className="text-destructive border-destructive">
                        {theme.critical} Critical
                      </Badge>
                      <Badge variant="outline" className="text-orange-500 border-orange-500">
                        {theme.high} High
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {theme.total} total items
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
