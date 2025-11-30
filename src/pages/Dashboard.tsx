import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  ArrowRight,
  Plus,
} from 'lucide-react';

export default function Dashboard() {
  const { profile, roles, isManager, isLandD, isHRBP, isCHRO } = useAuth();
  const navigate = useNavigate();

  const firstName = profile?.first_name_en || 'User';
  const isHigherRole = isManager || isLandD || isHRBP || isCHRO;

  // Mock stats - in real app these would come from API
  const stats = {
    myRequests: { pending: 2, approved: 5, total: 7 },
    teamRequests: { pending: 8, approved: 23, total: 31 },
    upcomingTraining: 3,
    completedCourses: 12,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {firstName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your training requests
            </p>
          </div>
          <Button onClick={() => navigate('/courses')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Training Request
          </Button>
        </div>

        {/* Role Badge */}
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge key={role} variant="secondary" className="capitalize">
              {role.replace('_', ' ')}
            </Badge>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="card-shadow hover:card-shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myRequests.pending}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card className="card-shadow hover:card-shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved Training
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myRequests.approved}</div>
              <p className="text-xs text-muted-foreground">
                This year
              </p>
            </CardContent>
          </Card>

          <Card className="card-shadow hover:card-shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Sessions
              </CardTitle>
              <Calendar className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingTraining}</div>
              <p className="text-xs text-muted-foreground">
                Next 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="card-shadow hover:card-shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Courses
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCourses}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Manager/Admin Stats */}
        {isHigherRole && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Training Overview
                </CardTitle>
                <CardDescription>
                  Requests from your team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-warning/10 rounded-lg">
                    <div className="text-2xl font-bold text-warning">
                      {stats.teamRequests.pending}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <div className="text-2xl font-bold text-success">
                      {stats.teamRequests.approved}
                    </div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {stats.teamRequests.total}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/approvals')}
                >
                  View Pending Approvals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Action Required
                </CardTitle>
                <CardDescription>
                  Items that need your attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-warning rounded-full" />
                    <span className="text-sm">Pending approvals</span>
                  </div>
                  <Badge variant="secondary">{stats.teamRequests.pending}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-info rounded-full" />
                    <span className="text-sm">Sessions to schedule</span>
                  </div>
                  <Badge variant="secondary">4</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-destructive rounded-full" />
                    <span className="text-sm">Overdue reviews</span>
                  </div>
                  <Badge variant="secondary">2</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/courses')}
              >
                <BookOpen className="h-6 w-6 text-primary" />
                <span>Browse Courses</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/my-requests')}
              >
                <FileText className="h-6 w-6 text-primary" />
                <span>My Requests</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/calendar')}
              >
                <Calendar className="h-6 w-6 text-primary" />
                <span>Training Calendar</span>
              </Button>
              {isHigherRole && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/team-requests')}
                >
                  <Users className="h-6 w-6 text-primary" />
                  <span>Team Overview</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
