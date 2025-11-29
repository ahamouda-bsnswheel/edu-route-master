import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Play, Pause, RotateCcw, Sparkles, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

const statusConfig: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  running: { label: 'Running', variant: 'default', icon: Loader2 },
  completed: { label: 'Completed', variant: 'secondary', icon: CheckCircle },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: Pause },
};

export function BulkTaggingJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newJob, setNewJob] = useState({
    job_name: '',
    scope: 'all',
    category_filter: '',
    preserve_existing_tags: true,
  });

  // Fetch jobs
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['ai-tagging-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tagging_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Poll for updates
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['course-categories-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_categories')
        .select('id, name_en')
        .eq('is_active', true)
        .order('name_en');
      if (error) throw error;
      return data;
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      // Count courses in scope
      let query = supabase.from('courses').select('id', { count: 'exact' });
      
      if (newJob.scope === 'active') {
        query = query.eq('is_active', true);
      }
      if (newJob.category_filter && newJob.category_filter !== 'all') {
        query = query.eq('category_id', newJob.category_filter);
      }

      const { count } = await query;

      const { data, error } = await supabase
        .from('ai_tagging_jobs')
        .insert({
          job_name: newJob.job_name || `Bulk Tagging ${new Date().toLocaleDateString()}`,
          scope_filter: {
            scope: newJob.scope,
            category_id: newJob.category_filter || null,
          },
          preserve_existing_tags: newJob.preserve_existing_tags,
          total_items: count || 0,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tagging-jobs'] });
      setShowCreateDialog(false);
      setNewJob({
        job_name: '',
        scope: 'all',
        category_filter: '',
        preserve_existing_tags: true,
      });
      toast.success('Bulk tagging job created. Start the job to begin processing.');
    },
    onError: () => toast.error('Failed to create job'),
  });

  // Start job mutation
  const startJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Update job status
      await supabase
        .from('ai_tagging_jobs')
        .update({ 
          status: 'running', 
          started_at: new Date().toISOString() 
        })
        .eq('id', jobId);

      // In a real implementation, this would trigger an async background process
      // For now, we'll call the edge function for each course
      const { data: job } = await supabase
        .from('ai_tagging_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!job) throw new Error('Job not found');

      // Get courses in scope
      let query = supabase.from('courses').select('id');
      const scopeFilter = job.scope_filter as any;
      
      if (scopeFilter?.scope === 'active') {
        query = query.eq('is_active', true);
      }
      if (scopeFilter?.category_id) {
        query = query.eq('category_id', scopeFilter.category_id);
      }

      const { data: courses } = await query.limit(100); // Process in batches

      // Process courses (simplified - in production use a queue)
      let processed = 0;
      let success = 0;
      let failed = 0;
      const errors: any[] = [];

      for (const course of courses || []) {
        try {
          await supabase.functions.invoke('generate-course-tags', {
            body: { courseId: course.id },
          });
          success++;
        } catch (err: any) {
          failed++;
          errors.push({ course_id: course.id, error: err.message });
        }
        processed++;

        // Update progress
        await supabase
          .from('ai_tagging_jobs')
          .update({ 
            processed_items: processed,
            success_count: success,
            failed_count: failed,
            error_log: errors,
          })
          .eq('id', jobId);
      }

      // Mark complete
      await supabase
        .from('ai_tagging_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tagging-jobs'] });
      toast.success('Bulk tagging job completed');
    },
    onError: (error) => {
      toast.error(`Job failed: ${error.message}`);
    },
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await supabase
        .from('ai_tagging_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tagging-jobs'] });
      toast.success('Job cancelled');
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Bulk AI Tagging Jobs
              </CardTitle>
              <CardDescription>
                Run auto-tagging on multiple catalogue items
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Bulk Tagging Job</DialogTitle>
                  <DialogDescription>
                    Configure which courses to auto-tag
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_name">Job Name</Label>
                    <Input
                      id="job_name"
                      placeholder="e.g., HSE Courses Tagging"
                      value={newJob.job_name}
                      onChange={(e) => setNewJob(prev => ({ ...prev, job_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scope">Scope</Label>
                    <Select 
                      value={newJob.scope} 
                      onValueChange={(value) => setNewJob(prev => ({ ...prev, scope: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        <SelectItem value="active">Active Courses Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category Filter (Optional)</Label>
                    <Select 
                      value={newJob.category_filter || 'all'} 
                      onValueChange={(value) => setNewJob(prev => ({ ...prev, category_filter: value === 'all' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name_en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="preserve_tags">Preserve existing approved tags</Label>
                    <Switch
                      id="preserve_tags"
                      checked={newJob.preserve_existing_tags}
                      onCheckedChange={(checked) => setNewJob(prev => ({ ...prev, preserve_existing_tags: checked }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button onClick={() => createJobMutation.mutate()} disabled={createJobMutation.isPending}>
                    Create Job
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading jobs...</p>
          ) : !jobs || jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No bulk tagging jobs yet</p>
              <p className="text-sm">Create a job to auto-tag multiple courses at once</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Success/Failed</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const status = (job.status || 'pending') as JobStatus;
                  const config = statusConfig[status];
                  const StatusIcon = config.icon;
                  const progress = job.total_items > 0 
                    ? Math.round((job.processed_items / job.total_items) * 100) 
                    : 0;

                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <p className="font-medium">{job.job_name || 'Untitled Job'}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.total_items} courses
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {job.processed_items} / {job.total_items}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{job.success_count}</span>
                        {' / '}
                        <span className="text-red-600">{job.failed_count}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.created_at ? format(new Date(job.created_at), 'MMM d, HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => startJobMutation.mutate(job.id)}
                            disabled={startJobMutation.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {status === 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => cancelJobMutation.mutate(job.id)}
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                        {(status === 'completed' || status === 'failed') && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              // View details or retry logic
                              toast.info(`Job ${status}: ${job.success_count} succeeded, ${job.failed_count} failed`);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
