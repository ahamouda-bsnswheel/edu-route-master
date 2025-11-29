import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Award,
  FileText,
  Search,
  Plus,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Download,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  valid: { label: 'Valid', color: 'bg-success text-success-foreground', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-warning text-warning-foreground', icon: AlertTriangle },
  revoked: { label: 'Revoked', color: 'bg-destructive text-destructive-foreground', icon: XCircle },
};

const templateStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', color: 'bg-success text-success-foreground' },
  archived: { label: 'Archived', color: 'bg-secondary text-secondary-foreground' },
};

export default function CertificateAdmin() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const canManage = hasRole('l_and_d') || hasRole('admin');

  // Fetch certificates
  const { data: certificates, isLoading: certsLoading } = useQuery({
    queryKey: ['admin-certificates', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          course:courses(name_en)
        `)
        .order('issued_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: canManage,
  });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: canManage,
  });

  // Filter certificates
  const filteredCertificates = certificates?.filter(cert => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        cert.certificate_number?.toLowerCase().includes(search) ||
        cert.course_name_en?.toLowerCase().includes(search) ||
        cert.participant_name_en?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ certId, reason }: { certId: string; reason: string }) => {
      const { error } = await supabase
        .from('certificates')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revocation_reason: reason,
        })
        .eq('id', certId);

      if (error) throw error;

      // Log audit
      await supabase.from('certificate_audit_log').insert({
        certificate_id: certId,
        action: 'revoked',
        details: { reason },
      });
    },
    onSuccess: () => {
      toast({ title: 'Certificate Revoked', description: 'The certificate has been revoked.' });
      queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
      setShowRevokeDialog(false);
      setRevokeReason('');
      setSelectedCert(null);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
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

  if (!canManage) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don't have permission to manage certificates.
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
            <h1 className="text-3xl font-bold text-foreground">Certificate Administration</h1>
            <p className="text-muted-foreground mt-1">
              Manage certificate templates, generation, and revocation
            </p>
          </div>
          <Button onClick={() => navigate('/certificate-templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        <Tabs defaultValue="certificates">
          <TabsList>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-4">
            {/* Filters */}
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by certificate number, course, or participant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Certificates Table */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Certificates</CardTitle>
                <CardDescription>
                  {filteredCertificates?.length || 0} certificates found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {certsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredCertificates && filteredCertificates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Certificate ID</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCertificates.map((cert: any) => {
                        const status = statusConfig[cert.status || 'valid'];
                        const StatusIcon = status?.icon || CheckCircle;
                        
                        return (
                          <TableRow key={cert.id}>
                            <TableCell>
                              <span className="font-mono text-sm">{cert.certificate_number}</span>
                            </TableCell>
                            <TableCell>{cert.participant_name_en || '-'}</TableCell>
                            <TableCell>{cert.course_name_en || cert.course?.name_en}</TableCell>
                            <TableCell>
                              {cert.issued_at
                                ? format(new Date(cert.issued_at), 'MMM dd, yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={status?.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {cert.pdf_url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openCertificate(cert.pdf_url)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {cert.status === 'valid' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedCert(cert);
                                      setShowRevokeDialog(true);
                                    }}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No certificates found</h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Certificate Templates</CardTitle>
                <CardDescription>
                  Manage certificate layouts and designs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : templates && templates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template: any) => {
                        const status = templateStatusConfig[template.status || 'draft'];
                        
                        return (
                          <TableRow key={template.id}>
                            <TableCell>
                              <p className="font-medium">{template.name}</p>
                              {template.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {template.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {template.language === 'bilingual' ? 'EN/AR' : template.language?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={status?.color}>{status?.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {template.is_default && (
                                <Badge variant="outline" className="text-primary">Default</Badge>
                              )}
                            </TableCell>
                            <TableCell>v{template.version}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/certificate-templates/${template.id}`)}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No templates yet</h3>
                    <p className="text-muted-foreground mt-1">
                      Create your first certificate template
                    </p>
                    <Button className="mt-4" onClick={() => navigate('/certificate-templates/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Revoke Dialog */}
        <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Certificate</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The certificate will be marked as revoked.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Certificate:</strong> {selectedCert?.certificate_number}
                </p>
                <p className="text-sm">
                  <strong>Participant:</strong> {selectedCert?.participant_name_en}
                </p>
                <p className="text-sm">
                  <strong>Course:</strong> {selectedCert?.course_name_en}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Reason for Revocation *</label>
                <Textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Provide a reason for revoking this certificate..."
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => revokeMutation.mutate({ certId: selectedCert?.id, reason: revokeReason })}
                disabled={!revokeReason.trim() || revokeMutation.isPending}
              >
                {revokeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4 mr-2" />
                )}
                Revoke Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
