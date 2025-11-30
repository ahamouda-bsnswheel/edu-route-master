import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/hooks/useNotifications';
import {
  Users,
  Search,
  BookOpen,
  Plus,
  Trash2,
  Send,
  User,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function TeamNominations() {
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showNominationDialog, setShowNominationDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState('normal');
  const [searchQuery, setSearchQuery] = useState('');

  const isManager = hasRole('manager') || hasRole('hrbp') || hasRole('l_and_d') || hasRole('admin');

  // Fetch team members (direct reports)
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, email, job_title_en, employee_id')
        .eq('manager_id', user?.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isManager,
  });

  // Fetch courses with cost level for workflow determination
  const { data: courses } = useQuery({
    queryKey: ['courses-for-nomination'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name_en, delivery_mode, training_location, duration_days, cost_level')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing team nominations
  const { data: teamRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['team-nominations', user?.id],
    queryFn: async () => {
      if (!teamMembers?.length) return [];
      
      const teamMemberIds = teamMembers.map(m => m.id);
      
      const { data, error } = await supabase
        .from('training_requests')
        .select(`
          *,
          course:courses(name_en, delivery_mode)
        `)
        .in('requester_id', teamMemberIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!teamMembers?.length,
  });

  // Helper function to determine if course requires extended approval workflow
  const requiresExtendedWorkflow = (course: { training_location?: string; cost_level?: string }) => {
    // Abroad or high-cost courses require HRBP → L&D → CHRO approval
    return course?.training_location === 'abroad' || course?.cost_level === 'high';
  };

  // Helper function to find HRBP for an employee's entity
  const findHRBPForEntity = async (employeeId: string) => {
    // Get employee's entity_id
    const { data: employeeProfile } = await supabase
      .from('profiles')
      .select('entity_id')
      .eq('id', employeeId)
      .single();

    if (!employeeProfile?.entity_id) {
      // Fallback: find any HRBP if no entity match
      const { data: anyHrbp } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'hrbp')
        .limit(1)
        .single();
      return anyHrbp?.user_id;
    }

    // Find HRBP assigned to the same entity
    const { data: hrbpForEntity } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(entity_id)')
      .eq('role', 'hrbp')
      .eq('profiles.entity_id', employeeProfile.entity_id)
      .limit(1)
      .single();

    if (hrbpForEntity?.user_id) {
      return hrbpForEntity.user_id;
    }

    // Fallback: find any HRBP
    const { data: anyHrbp } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'hrbp')
      .limit(1)
      .single();
    return anyHrbp?.user_id;
  };

  // Helper function to find L&D user
  const findLandDUser = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'l_and_d')
      .limit(1)
      .single();
    return data?.user_id;
  };

  // Create nomination mutation
  const nominateMutation = useMutation({
    mutationFn: async () => {
      const selectedCourseData = courses?.find(c => c.id === selectedCourse);
      const isExtendedWorkflow = requiresExtendedWorkflow(selectedCourseData || {});
      
      // Create a training request for each selected team member
      const requests = selectedTeamMembers.map(memberId => ({
        requester_id: memberId,
        course_id: selectedCourse,
        request_type: 'nomination',
        justification,
        priority,
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
        current_approval_level: 1,
        current_approver_id: user?.id, // Manager is the first approver for nominations
      }));

      const { data: createdRequests, error } = await supabase
        .from('training_requests')
        .insert(requests)
        .select();

      if (error) throw error;

      // Process each request through the workflow
      for (const request of createdRequests || []) {
        // Record manager's auto-approval (Level 1)
        await supabase.from('approvals').insert({
          request_id: request.id,
          approver_id: user?.id,
          approval_level: 1,
          approver_role: 'manager',
          status: 'approved',
          decision_date: new Date().toISOString(),
          comments: 'Manager nomination - auto-approved',
        });

        // Notify the team member about nomination
        await createNotification({
          user_id: request.requester_id,
          title: 'Training Nomination',
          message: `Your manager has nominated you for ${selectedCourseData?.name_en || 'training'}.`,
          type: 'request_approved',
          reference_type: 'training_request',
          reference_id: request.id,
        });

        if (isExtendedWorkflow) {
          // Extended workflow: Manager → HRBP → L&D → CHRO
          const nextApproverId = await findHRBPForEntity(request.requester_id);
          
          if (nextApproverId) {
            // Update request to Level 2 (HRBP)
            await supabase
              .from('training_requests')
              .update({
                current_approval_level: 2,
                current_approver_id: nextApproverId,
                status: 'pending',
              })
              .eq('id', request.id);

            // Create pending approval for HRBP
            await supabase.from('approvals').insert({
              request_id: request.id,
              approver_id: nextApproverId,
              approval_level: 2,
              approver_role: 'hrbp',
              status: 'pending',
            });

            // Notify HRBP
            await createNotification({
              user_id: nextApproverId,
              title: 'Training Approval Required',
              message: `A training nomination for "${selectedCourseData?.name_en}" requires your approval.`,
              type: 'approval_required',
              reference_type: 'training_request',
              reference_id: request.id,
            });
          } else {
            // No HRBP found, try L&D
            const landDUserId = await findLandDUser();
            if (landDUserId) {
              await supabase
                .from('training_requests')
                .update({
                  current_approval_level: 3,
                  current_approver_id: landDUserId,
                  status: 'pending',
                })
                .eq('id', request.id);

              await supabase.from('approvals').insert({
                request_id: request.id,
                approver_id: landDUserId,
                approval_level: 3,
                approver_role: 'l_and_d',
                status: 'pending',
              });

              await createNotification({
                user_id: landDUserId,
                title: 'Training Approval Required',
                message: `A training nomination for "${selectedCourseData?.name_en}" requires your approval.`,
                type: 'approval_required',
                reference_type: 'training_request',
                reference_id: request.id,
              });
            }
          }
        } else {
          // Simple workflow: Local/Low-cost → Auto-approved after manager
          await supabase
            .from('training_requests')
            .update({
              status: 'approved',
              current_approver_id: null,
            })
            .eq('id', request.id);

          // Notify team member of full approval
          await createNotification({
            user_id: request.requester_id,
            title: 'Training Request Approved',
            message: `Your training nomination for "${selectedCourseData?.name_en}" has been fully approved.`,
            type: 'request_approved',
            reference_type: 'training_request',
            reference_id: request.id,
          });
        }
      }

      return createdRequests;
    },
    onSuccess: (data) => {
      const selectedCourseData = courses?.find(c => c.id === selectedCourse);
      const isExtendedWorkflow = requiresExtendedWorkflow(selectedCourseData || {});
      
      toast({
        title: 'Nominations Submitted',
        description: isExtendedWorkflow 
          ? `${data?.length || 0} nomination(s) sent for HRBP approval.`
          : `${data?.length || 0} nomination(s) have been approved.`,
      });
      queryClient.invalidateQueries({ queryKey: ['team-nominations'] });
      setShowNominationDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSelectedCourse('');
    setSelectedTeamMembers([]);
    setJustification('');
    setPriority('normal');
  };

  const filteredTeamMembers = teamMembers?.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.first_name_en?.toLowerCase().includes(query) ||
      member.last_name_en?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    );
  });

  const toggleTeamMember = (memberId: string) => {
    if (selectedTeamMembers.includes(memberId)) {
      setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== memberId));
    } else {
      setSelectedTeamMembers([...selectedTeamMembers, memberId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTeamMembers.length === filteredTeamMembers?.length) {
      setSelectedTeamMembers([]);
    } else {
      setSelectedTeamMembers(filteredTeamMembers?.map(m => m.id) || []);
    }
  };

  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground mt-2">
            Only managers can access team nominations.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Nominations</h1>
            <p className="text-muted-foreground mt-1">
              Nominate team members for training courses
            </p>
          </div>
          <Button onClick={() => setShowNominationDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Nomination
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Nominations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {teamRequests?.filter(r => r.status === 'pending').length || 0}
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
                {teamRequests?.filter(r => r.status === 'approved' || r.status === 'completed').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Requests Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Training Requests
            </CardTitle>
            <CardDescription>
              View and manage training nominations for your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestsLoading || teamLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : teamRequests && teamRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamRequests.map((request) => {
                    const member = teamMembers?.find(m => m.id === request.requester_id);
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.request_number || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {member?.first_name_en} {member?.last_name_en}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{request.course?.name_en}</TableCell>
                        <TableCell>
                          <Badge variant={request.request_type === 'nomination' ? 'secondary' : 'outline'}>
                            {request.request_type === 'nomination' ? 'Nomination' : 'Self-request'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === 'approved' || request.status === 'completed'
                                ? 'default'
                                : request.status === 'rejected'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No team requests yet</h3>
                <p className="text-muted-foreground mt-1">
                  Start by nominating team members for training
                </p>
                <Button className="mt-4" onClick={() => setShowNominationDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Nomination
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nomination Dialog */}
        <Dialog open={showNominationDialog} onOpenChange={setShowNominationDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nominate Team Members</DialogTitle>
              <DialogDescription>
                Select team members and a course for training nomination
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Course Selection */}
              <div>
                <label className="text-sm font-medium">Course *</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{course.name_en}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {course.delivery_mode?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Members Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Team Members *</label>
                  <Badge variant="outline">
                    {selectedTeamMembers.length} selected
                  </Badge>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {filteredTeamMembers && filteredTeamMembers.length > 0 ? (
                    <>
                      <div className="p-2 border-b bg-muted/50 flex items-center gap-2">
                        <Checkbox
                          checked={selectedTeamMembers.length === filteredTeamMembers.length}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm font-medium">Select All</span>
                      </div>
                      {filteredTeamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="p-2 flex items-center gap-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleTeamMember(member.id)}
                        >
                          <Checkbox
                            checked={selectedTeamMembers.includes(member.id)}
                            onCheckedChange={() => toggleTeamMember(member.id)}
                          />
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {member.first_name_en} {member.last_name_en}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.job_title_en || member.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No team members found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Justification */}
              <div>
                <label className="text-sm font-medium">Justification *</label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Why are these team members nominated for this training?"
                  className="mt-2"
                  rows={3}
                />
              </div>

              {selectedTeamMembers.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-info/10 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 text-info" />
                  <span>
                    {selectedTeamMembers.length} team member{selectedTeamMembers.length !== 1 ? 's' : ''} will be nominated
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNominationDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => nominateMutation.mutate()}
                disabled={!selectedCourse || selectedTeamMembers.length === 0 || !justification.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Nominations
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
