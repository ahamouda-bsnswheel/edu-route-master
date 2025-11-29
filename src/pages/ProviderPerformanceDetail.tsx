import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, subYears } from 'date-fns';
import {
  ArrowLeft,
  Star,
  Users,
  Calendar,
  TrendingUp,
  BarChart3,
  Shield,
  MessageSquare,
  Flag,
  Building,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type FlagType = 'preferred_partner' | 'under_review' | 'do_not_use';

const flagConfig: Record<FlagType, { label: string; color: string; icon: any }> = {
  preferred_partner: { label: 'Preferred Partner', color: 'bg-green-100 text-green-800', icon: Star },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  do_not_use: { label: 'Do Not Use', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function ProviderPerformanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  const canManageFlags = hasRole('l_and_d') || hasRole('admin');
  const canViewCost = hasRole('l_and_d') || hasRole('admin') || hasRole('hrbp') || hasRole('chro');
  
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('general');
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FlagType>('preferred_partner');
  const [flagReason, setFlagReason] = useState('');

  // Fetch provider
  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_providers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch sessions for this provider
  const { data: sessions } = useQuery({
    queryKey: ['provider-sessions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          courses!inner(provider_id, name_en, course_categories(name_en)),
          session_enrollments(id, status, completion_status, feedback_rating)
        `)
        .eq('courses.provider_id', id)
        .order('start_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch performance snapshots for trends
  const { data: snapshots } = useQuery({
    queryKey: ['provider-snapshots', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_performance_snapshots')
        .select('*')
        .eq('provider_id', id)
        .eq('period_type', 'quarterly')
        .order('period_start', { ascending: true })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ['provider-comments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_comments')
        .select('*')
        .eq('provider_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch flags
  const { data: flags } = useQuery({
    queryKey: ['provider-flags', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_flags')
        .select('*')
        .eq('provider_id', id)
        .order('set_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('provider_comments').insert({
        provider_id: id,
        comment: newComment,
        comment_type: commentType,
        created_by: user?.id,
      });
      if (error) throw error;

      await supabase.from('provider_performance_audit_log').insert({
        action: 'comment_added',
        entity_type: 'comment',
        provider_id: id,
        new_value: { comment: newComment, type: commentType },
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-comments', id] });
      setNewComment('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  // Set flag mutation
  const setFlagMutation = useMutation({
    mutationFn: async () => {
      // Deactivate existing flags
      await supabase
        .from('provider_flags')
        .update({ is_active: false })
        .eq('provider_id', id)
        .eq('is_active', true);

      // Insert new flag
      const { error } = await supabase.from('provider_flags').insert({
        provider_id: id,
        flag_type: selectedFlag,
        reason: flagReason,
        set_by: user?.id,
        is_active: true,
      });
      if (error) throw error;

      await supabase.from('provider_performance_audit_log').insert({
        action: 'flag_set',
        entity_type: 'flag',
        provider_id: id,
        new_value: { flag_type: selectedFlag, reason: flagReason },
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-flags', id] });
      setShowFlagDialog(false);
      setFlagReason('');
      toast.success('Flag updated');
    },
    onError: () => toast.error('Failed to set flag'),
  });

  // Calculate summary metrics
  const summaryMetrics = sessions ? {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    cancelledSessions: sessions.filter(s => s.status === 'cancelled').length,
    totalParticipants: sessions.reduce((sum, s) => sum + (s.session_enrollments?.length || 0), 0),
    avgRating: (() => {
      const ratings = sessions.flatMap(s => 
        s.session_enrollments?.filter((e: any) => e.feedback_rating).map((e: any) => e.feedback_rating) || []
      );
      return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    })(),
  } : null;

  // Chart data
  const trendData = snapshots?.map(s => ({
    period: format(new Date(s.period_start), 'QQQ yyyy'),
    rating: s.avg_rating,
    completion: s.completion_rate,
    sessions: s.total_sessions,
  })) || [];

  const activeFlag = flags?.find(f => f.is_active);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!provider) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Provider not found</h2>
          <Button onClick={() => navigate('/providers/performance')} className="mt-4">
            Back to Performance Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/providers/performance')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{provider.name_en}</h1>
                <Badge variant="outline" className="gap-1">
                  {provider.is_local ? (
                    <><Building className="h-3 w-3" /> Local</>
                  ) : (
                    <><Globe className="h-3 w-3" /> International</>
                  )}
                </Badge>
                {activeFlag && (
                  <Badge className={flagConfig[activeFlag.flag_type as FlagType]?.color}>
                    {flagConfig[activeFlag.flag_type as FlagType]?.label}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{provider.country}, {provider.city}</p>
            </div>
          </div>
          {canManageFlags && (
            <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Flag className="h-4 w-4 mr-2" />
                  Set Flag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Provider Flag</DialogTitle>
                  <DialogDescription>
                    Set an internal flag for this provider
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={selectedFlag} onValueChange={(v) => setSelectedFlag(v as FlagType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preferred_partner">Preferred Partner</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="do_not_use">Do Not Use</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Reason for this flag..."
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowFlagDialog(false)}>Cancel</Button>
                  <Button onClick={() => setFlagMutation.mutate()}>Set Flag</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            {canViewCost && <TabsTrigger value="cost">Cost & Utilisation</TabsTrigger>}
            <TabsTrigger value="hse">HSE & Compliance</TabsTrigger>
            <TabsTrigger value="comments">Comments & Actions</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">
                      {summaryMetrics?.avgRating?.toFixed(2) || '-'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">
                      {summaryMetrics?.totalSessions || 0}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">
                      {summaryMetrics?.totalParticipants || 0}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Participants</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">
                      {summaryMetrics?.completedSessions || 0}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold">
                      {summaryMetrics?.cancelledSessions || 0}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                </CardContent>
              </Card>
            </div>

            {/* Trend Charts */}
            {trendData.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Rating Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" fontSize={12} />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="rating" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Sessions by Quarter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" fontSize={12} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Session History</CardTitle>
                <CardDescription>{sessions?.length || 0} sessions found</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Participants</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((session) => {
                      const ratings = session.session_enrollments
                        ?.filter((e: any) => e.feedback_rating)
                        .map((e: any) => e.feedback_rating) || [];
                      const avgRating = ratings.length > 0 
                        ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(2)
                        : '-';

                      return (
                        <TableRow key={session.id}>
                          <TableCell>
                            {format(new Date(session.start_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{session.courses?.name_en}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {session.courses?.course_categories?.name_en || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {session.session_enrollments?.length || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              {avgRating}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={session.status === 'completed' ? 'default' : 
                                session.status === 'cancelled' ? 'destructive' : 'secondary'}
                            >
                              {session.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost Tab */}
          {canViewCost && (
            <TabsContent value="cost">
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle>Cost & Utilisation</CardTitle>
                  <CardDescription>Financial metrics for this provider</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Cost data integration pending</p>
                    <p className="text-sm">Connect to financial system to view cost metrics</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* HSE Tab */}
          <TabsContent value="hse">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  HSE & Compliance Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const hseSessions = sessions?.filter(s => 
                    s.courses?.course_categories?.name_en?.toLowerCase().includes('hse')
                  ) || [];

                  if (hseSessions.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No HSE sessions found for this provider</p>
                      </div>
                    );
                  }

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead className="text-right">Participants</TableHead>
                          <TableHead className="text-right">Completed</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hseSessions.map((session) => {
                          const completed = session.session_enrollments?.filter(
                            (e: any) => e.completion_status === 'completed'
                          ).length || 0;
                          const total = session.session_enrollments?.length || 0;
                          
                          return (
                            <TableRow key={session.id}>
                              <TableCell>
                                {format(new Date(session.start_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>{session.courses?.name_en}</TableCell>
                              <TableCell className="text-right">{total}</TableCell>
                              <TableCell className="text-right">
                                <span className={completed === total ? 'text-green-600' : 'text-yellow-600'}>
                                  {completed}/{total}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {(() => {
                                  const ratings = session.session_enrollments
                                    ?.filter((e: any) => e.feedback_rating)
                                    .map((e: any) => e.feedback_rating) || [];
                                  return ratings.length > 0 
                                    ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(2)
                                    : '-';
                                })()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={session.status === 'completed' ? 'default' : 'destructive'}
                                >
                                  {session.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-6">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Add Comment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Select value={commentType} onValueChange={setCommentType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                      <SelectItem value="cost">Cost</SelectItem>
                      <SelectItem value="reliability">Reliability</SelectItem>
                      <SelectItem value="hse">HSE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Add your comment about this provider..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={() => addCommentMutation.mutate()}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Comment History</CardTitle>
              </CardHeader>
              <CardContent>
                {comments && comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{comment.comment_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No comments yet</p>
                )}
              </CardContent>
            </Card>

            {/* Flag History */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Flag History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flags && flags.length > 0 ? (
                  <div className="space-y-3">
                    {flags.map((flag) => (
                      <div 
                        key={flag.id} 
                        className={`p-3 rounded-lg ${flag.is_active ? 'bg-muted' : 'bg-muted/50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <Badge className={flagConfig[flag.flag_type as FlagType]?.color}>
                            {flagConfig[flag.flag_type as FlagType]?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(flag.set_at), 'MMM d, yyyy')}
                            {flag.is_active && ' (Active)'}
                          </span>
                        </div>
                        {flag.reason && (
                          <p className="text-sm text-muted-foreground mt-2">{flag.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No flags set</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}