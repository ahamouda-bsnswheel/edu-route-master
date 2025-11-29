import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Minus, 
  TrendingDown,
  PieChart,
  History,
} from 'lucide-react';
import { usePriorityDistribution, useAIScoringJobs } from '@/hooks/useAIPriority';

interface AIPriorityDashboardProps {
  periodId?: string;
  planId?: string;
}

export function AIPriorityDashboard({ periodId, planId }: AIPriorityDashboardProps) {
  const { data: distribution, isLoading: distLoading } = usePriorityDistribution(periodId, planId);
  const { data: jobs = [], isLoading: jobsLoading } = useAIScoringJobs();

  const recentJobs = jobs.slice(0, 5);

  if (distLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const bands = [
    { 
      key: 'critical', 
      label: 'Critical', 
      count: distribution?.critical || 0, 
      icon: AlertTriangle, 
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    { 
      key: 'high', 
      label: 'High', 
      count: distribution?.high || 0, 
      icon: TrendingUp, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    { 
      key: 'medium', 
      label: 'Medium', 
      count: distribution?.medium || 0, 
      icon: Minus, 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    { 
      key: 'low', 
      label: 'Low', 
      count: distribution?.low || 0, 
      icon: TrendingDown, 
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {bands.map((band) => (
          <Card key={band.key}>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between p-4 rounded-lg ${band.bgColor}`}>
                <div>
                  <p className="text-sm text-muted-foreground">{band.label}</p>
                  <p className="text-3xl font-bold">{band.count}</p>
                </div>
                <band.icon className={`h-8 w-8 ${band.color}`} />
              </div>
              {distribution?.total && distribution.total > 0 && (
                <div className="mt-3">
                  <Progress 
                    value={(band.count / distribution.total) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((band.count / distribution.total) * 100)}% of total
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Total Scored Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{distribution?.total || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{distribution?.avgScore || 0}/100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Manual Overrides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{distribution?.overridden || 0}</p>
            {distribution?.total && distribution.total > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round(((distribution?.overridden || 0) / distribution.total) * 100)}% of scored items
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Recent Scoring Jobs
          </CardTitle>
          <CardDescription>
            Status of AI prioritisation batch jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No scoring jobs found. Run AI prioritisation to generate scores.
            </p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{job.job_name || 'Scoring Job'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === 'running' && (
                      <div className="text-right text-sm">
                        <p>{job.processed_items}/{job.total_items}</p>
                        <Progress 
                          value={job.total_items ? (job.processed_items / job.total_items) * 100 : 0} 
                          className="w-24 h-1"
                        />
                      </div>
                    )}
                    {job.status === 'completed' && (
                      <div className="text-right text-xs">
                        <p className="text-green-600">{job.success_count} success</p>
                        {job.error_count > 0 && (
                          <p className="text-destructive">{job.error_count} errors</p>
                        )}
                      </div>
                    )}
                    <Badge 
                      variant={
                        job.status === 'completed' ? 'default' : 
                        job.status === 'running' ? 'secondary' : 
                        job.status === 'failed' ? 'destructive' : 'outline'
                      }
                    >
                      {job.status}
                    </Badge>
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
