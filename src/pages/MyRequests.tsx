import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Clock, CheckCircle, XCircle, Plus, Eye } from 'lucide-react';
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
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No requests found</h3>
          <p className="text-muted-foreground mt-1">
            Start by browsing the course catalog
          </p>
          <Button onClick={() => navigate('/courses')} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Browse Courses
          </Button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto -mx-6 px-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request #</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request) => {
            const status = statusConfig[request.status || 'draft'];
            const StatusIcon = status.icon;

            return (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {request.request_number || '-'}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.course?.name_en}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {request.course?.delivery_mode?.replace('_', ' ')} •{' '}
                      {request.course?.duration_days} days
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${status.color} gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.submitted_at
                    ? format(new Date(request.submitted_at), 'MMM dd, yyyy')
                    : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {request.priority || 'normal'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/requests/${request.id}`)}
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
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Requests</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your training requests
            </p>
          </div>
          <Button onClick={() => navigate('/courses')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {pendingRequests.length}
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {approvedRequests.length}
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allRequests.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Training Requests</CardTitle>
            <CardDescription>
              View all your training requests and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All ({allRequests.length})</TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({pendingRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    Approved ({approvedRequests.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                  {renderRequestTable(allRequests)}
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                  {renderRequestTable(pendingRequests)}
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
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
