import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Award,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  valid: { label: 'Valid', color: 'bg-success text-success-foreground', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-warning text-warning-foreground', icon: AlertTriangle },
  revoked: { label: 'Revoked', color: 'bg-destructive text-destructive-foreground', icon: XCircle },
};

export default function TeamCertificates() {
  const { user, hasRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberCerts, setShowMemberCerts] = useState(false);

  const isManager = hasRole('manager') || hasRole('hrbp') || hasRole('l_and_d') || hasRole('admin');

  // Fetch team members
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ['team-members-certs', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, email, employee_id, job_title_en');

      if (hasRole('manager') && !hasRole('l_and_d') && !hasRole('admin') && !hasRole('hrbp')) {
        query = query.eq('manager_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isManager,
  });

  // Fetch all team certificates
  const { data: teamCertificates, isLoading: certsLoading } = useQuery({
    queryKey: ['team-certificates', teamMembers?.map(t => t.id)],
    queryFn: async () => {
      if (!teamMembers || teamMembers.length === 0) return [];

      const teamIds = teamMembers.map(t => t.id);
      
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          course:courses(id, name_en, category_id, category:course_categories(name_en))
        `)
        .in('employee_id', teamIds)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      
      return data?.map(cert => ({
        ...cert,
        computed_status: cert.status === 'valid' && cert.expires_at && new Date(cert.expires_at) < new Date() 
          ? 'expired' 
          : cert.status
      }));
    },
    enabled: !!teamMembers && teamMembers.length > 0,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['course-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_categories')
        .select('id, name_en')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Group certificates by member
  const memberCertificates = teamMembers?.map(member => {
    const certs = teamCertificates?.filter(c => c.employee_id === member.id) || [];
    const validCount = certs.filter(c => c.computed_status === 'valid').length;
    const expiredCount = certs.filter(c => c.computed_status === 'expired').length;
    return { ...member, certificates: certs, validCount, expiredCount, totalCount: certs.length };
  }).filter(member => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const name = `${member.first_name_en || ''} ${member.last_name_en || ''}`.toLowerCase();
      return name.includes(search) || member.employee_id?.toLowerCase().includes(search);
    }
    return true;
  });

  const openCertificate = (pdfUrl: string) => {
    if (pdfUrl.startsWith('data:text/html;base64,')) {
      const html = decodeURIComponent(escape(atob(pdfUrl.split(',')[1])));
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } else {
      window.open(pdfUrl, '_blank');
    }
  };

  const stats = {
    totalMembers: teamMembers?.length || 0,
    totalCertificates: teamCertificates?.length || 0,
    validCertificates: teamCertificates?.filter(c => c.computed_status === 'valid').length || 0,
    membersWithCerts: new Set(teamCertificates?.map(c => c.employee_id)).size,
  };

  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view team certificates.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Certificates</h1>
          <p className="text-muted-foreground mt-1">
            View and track your team's training certificates
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Total Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCertificates}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Valid Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.validCertificates}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Members with Certs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.membersWithCerts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Members Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Certificate Summary
            </CardTitle>
            <CardDescription>
              Click on a team member to view their certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamLoading || certsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : memberCertificates && memberCertificates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Total Certificates</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Expired</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberCertificates.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {member.first_name_en} {member.last_name_en}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.job_title_en || member.employee_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.totalCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success text-success-foreground">
                          {member.validCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.expiredCount > 0 ? (
                          <Badge className="bg-warning text-warning-foreground">
                            {member.expiredCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowMemberCerts(true);
                          }}
                          disabled={member.totalCount === 0}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No team members found</h3>
                <p className="text-muted-foreground mt-1">
                  Team certificate data will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Certificates Dialog */}
        <Dialog open={showMemberCerts} onOpenChange={setShowMemberCerts}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Certificates - {selectedMember?.first_name_en} {selectedMember?.last_name_en}
              </DialogTitle>
              <DialogDescription>
                {selectedMember?.totalCount || 0} certificates
              </DialogDescription>
            </DialogHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Certificate ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedMember?.certificates?.map((cert: any) => {
                  const status = statusConfig[cert.computed_status || 'valid'];
                  const StatusIcon = status?.icon || CheckCircle;
                  
                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <p className="font-medium">{cert.course_name_en}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{cert.certificate_number}</span>
                      </TableCell>
                      <TableCell>
                        {cert.completion_date
                          ? format(new Date(cert.completion_date), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={status?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cert.pdf_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCertificate(cert.pdf_url)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
