import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning', icon: Clock },
  approved: { label: 'Approved', color: 'bg-success/10 text-success', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-primary/10 text-primary', icon: CheckCircle },
};

export default function MyRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_requests')
        .select(`
          *,
          course:courses(name_en, name_ar, delivery_mode, duration_days)
        `)
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const pendingRequests = requests?.filter((r) => r.status === 'pending') || [];
  const approvedRequests = requests?.filter((r) => r.status === 'approved') || [];
  const allRequests = requests || [];

  const renderRequestTable = (data: typeof requests) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-base font-medium">No requests found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Start by browsing the course catalog
          </p>
          <Button onClick={() => navigate('/courses')} size="sm" className="mt-3">
            <Plus className="h-4 w-4 mr-2" />
            Browse Courses
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.map((request) => {
          const status = statusConfig[request.status || 'draft'];
          const StatusIcon = status.icon;

          return (
            <div
              key={request.id}
              className="border rounded-lg p-3 space-y-2 bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/requests/${request.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{request.course?.name_en || 'Unknown Course'}</p>
                  <p className="text-xs text-muted-foreground">
                    #{request.request_number || '-'}
                  </p>
                </div>
                <Badge className={`${status.color} gap-1 shrink-0 text-xs`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">
                  {request.course?.delivery_mode?.replace('_', ' ')} • {request.course?.duration_days} days
                </span>
                <span>
                  {request.submitted_at
                    ? format(new Date(request.submitted_at), 'MMM dd, yyyy')
                    : '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Requests</h1>
            <p className="text-sm text-muted-foreground">
              Track your training requests
            </p>
          </div>
          <Button onClick={() => navigate('/courses')} size="sm" className="gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-warning">{pendingRequests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-lg font-bold text-success">{approvedRequests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{allRequests.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-base">Training Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="w-full grid grid-cols-3 h-auto p-1">
                  <TabsTrigger value="all" className="text-xs py-1.5">All</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs py-1.5">Pending</TabsTrigger>
                  <TabsTrigger value="approved" className="text-xs py-1.5">Approved</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-3">
                  {renderRequestTable(allRequests)}
                </TabsContent>
                <TabsContent value="pending" className="mt-3">
                  {renderRequestTable(pendingRequests)}
                </TabsContent>
                <TabsContent value="approved" className="mt-3">
                  {renderRequestTable(approvedRequests)}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
