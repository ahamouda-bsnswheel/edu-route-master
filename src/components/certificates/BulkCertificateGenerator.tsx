import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { useToast } from '@/hooks/use-toast';
import {
  Award,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

export function BulkCertificateGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] as string[] });

  // Fetch sessions that have finalized completion but missing certificates
  const { data: eligibleSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['eligible-sessions-for-certificates'],
    queryFn: async () => {
      // Get sessions with completed enrollments
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          start_date,
          end_date,
          course:courses(id, name_en, validity_months)
        `)
        .in('status', ['completed', 'scheduled'])
        .order('end_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // For each session, count eligible enrollments without certificates
      const sessionsWithCounts = await Promise.all(
        (sessions || []).map(async (session) => {
          const { count: eligibleCount } = await supabase
            .from('session_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('completion_status', 'completed')
            .eq('passed', true)
            .is('certificate_generated_at', null);

          const { count: totalCompleted } = await supabase
            .from('session_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('completion_status', 'completed')
            .eq('passed', true);

          return {
            ...session,
            eligibleCount: eligibleCount || 0,
            totalCompleted: totalCompleted || 0,
          };
        })
      );

      return sessionsWithCounts.filter(s => s.eligibleCount > 0);
    },
  });

  // Fetch certificate jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['certificate-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificate_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Generate certificates for session
  const generateCertificates = async () => {
    if (!selectedSession) return;

    const session = eligibleSessions?.find(s => s.id === selectedSession);
    if (!session) return;

    setIsGenerating(true);
    setProgress({ current: 0, total: session.eligibleCount, errors: [] });

    try {
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('certificate_jobs')
        .insert({
          job_type: 'bulk_session',
          session_id: selectedSession,
          status: 'processing',
          total_count: session.eligibleCount,
          created_by: user?.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Get eligible enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('session_enrollments')
        .select(`
          id,
          participant_id,
          completion_date
        `)
        .eq('session_id', selectedSession)
        .eq('completion_status', 'completed')
        .eq('passed', true)
        .is('certificate_generated_at', null);

      if (enrollError) throw enrollError;

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Generate certificates one by one
      for (let i = 0; i < (enrollments || []).length; i++) {
        const enrollment = enrollments![i];
        
        try {
          const { data, error } = await supabase.functions.invoke('generate-certificate', {
            body: { enrollmentId: enrollment.id },
          });

          if (error) throw error;
          successCount++;
        } catch (err: any) {
          errorCount++;
          errors.push(`Enrollment ${enrollment.id}: ${err.message}`);
        }

        setProgress({
          current: i + 1,
          total: enrollments!.length,
          errors,
        });

        // Update job progress
        await supabase
          .from('certificate_jobs')
          .update({
            processed_count: i + 1,
            success_count: successCount,
            error_count: errorCount,
          })
          .eq('id', job.id);
      }

      // Complete job
      await supabase
        .from('certificate_jobs')
        .update({
          status: errorCount > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
          errors: errors.length > 0 ? errors : null,
        })
        .eq('id', job.id);

      toast({
        title: 'Bulk Generation Complete',
        description: `Generated ${successCount} certificates. ${errorCount} errors.`,
      });

      queryClient.invalidateQueries({ queryKey: ['certificate-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-sessions-for-certificates'] });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
      setSelectedSession('');
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-info text-info-foreground">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'completed_with_errors':
        return <Badge className="bg-warning text-warning-foreground">With Errors</Badge>;
      case 'failed':
        return <Badge className="bg-destructive text-destructive-foreground">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Generation */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Bulk Certificate Generation
          </CardTitle>
          <CardDescription>
            Generate certificates for all eligible participants in a session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedSession} onValueChange={setSelectedSession} disabled={isGenerating}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a session..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleSessions?.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.course?.name_en} - {session.session_code} ({session.eligibleCount} pending)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={generateCertificates}
              disabled={!selectedSession || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Generate Certificates
            </Button>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
              {progress.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {progress.errors.length} error(s) encountered
                </p>
              )}
            </div>
          )}

          {!sessionsLoading && eligibleSessions?.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No sessions with pending certificates found.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Generation Jobs</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['certificate-jobs'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <p>Loading...</p>
          ) : jobs && jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job: any) => (
                  <TableRow key={job.id}>
                    <TableCell className="capitalize">
                      {job.job_type?.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>{job.success_count || 0}</span>
                        {job.error_count > 0 && (
                          <>
                            <XCircle className="h-4 w-4 text-destructive ml-2" />
                            <span>{job.error_count}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">/ {job.total_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.started_at
                        ? format(new Date(job.started_at), 'MMM dd HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {job.completed_at
                        ? format(new Date(job.completed_at), 'MMM dd HH:mm')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No generation jobs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
