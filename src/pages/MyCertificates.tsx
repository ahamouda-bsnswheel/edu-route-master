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
  Award,
  Calendar,
  Download,
  Search,
  Filter,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { format, subYears } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  valid: { label: 'Valid', color: 'bg-success text-success-foreground', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-warning text-warning-foreground', icon: AlertTriangle },
  revoked: { label: 'Revoked', color: 'bg-destructive text-destructive-foreground', icon: XCircle },
};

export default function MyCertificates() {
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch certificates
  const { data: certificates, isLoading } = useQuery({
    queryKey: ['my-certificates', user?.id, periodFilter],
    queryFn: async () => {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          course:courses(id, name_en, category_id, category:course_categories(name_en))
        `)
        .eq('employee_id', user?.id)
        .order('issued_at', { ascending: false });

      if (periodFilter === '1year') {
        query = query.gte('issued_at', subYears(new Date(), 1).toISOString());
      } else if (periodFilter === '3years') {
        query = query.gte('issued_at', subYears(new Date(), 3).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Check for expired certificates
      return data?.map(cert => ({
        ...cert,
        computed_status: cert.status === 'valid' && cert.expires_at && new Date(cert.expires_at) < new Date() 
          ? 'expired' 
          : cert.status
      }));
    },
    enabled: !!user?.id,
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

  // Filter certificates
  const filteredCertificates = certificates?.filter(cert => {
    if (categoryFilter !== 'all' && cert.course?.category_id !== categoryFilter) {
      return false;
    }
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        cert.course_name_en?.toLowerCase().includes(search) ||
        cert.certificate_number?.toLowerCase().includes(search)
      );
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
    total: certificates?.length || 0,
    valid: certificates?.filter(c => c.computed_status === 'valid').length || 0,
    expired: certificates?.filter(c => c.computed_status === 'expired').length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Certificates</h1>
          <p className="text-muted-foreground mt-1">
            View and download your training certificates
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Total Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Valid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.valid}</div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.expired}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by course or certificate number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                  <SelectItem value="3years">Last 3 Years</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Certificates
            </CardTitle>
            <CardDescription>
              {filteredCertificates?.length || 0} certificates found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredCertificates && filteredCertificates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Certificate ID</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert: any) => {
                    const status = statusConfig[cert.computed_status || 'valid'];
                    const StatusIcon = status?.icon || CheckCircle;
                    
                    return (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cert.course_name_en}</p>
                            {cert.course?.category?.name_en && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {cert.course.category.name_en}
                              </Badge>
                            )}
                          </div>
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
                          {cert.expires_at
                            ? format(new Date(cert.expires_at), 'MMM dd, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {cert.pdf_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCertificate(cert.pdf_url)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            )}
                            {cert.verification_token && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(
                                  `${import.meta.env.VITE_SUPABASE_URL || 'https://rkerpnhqmskvqajtnljt.supabase.co'}/functions/v1/verify-certificate?t=${cert.verification_token}`,
                                  '_blank'
                                )}
                              >
                                <ExternalLink className="h-4 w-4" />
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
                <h3 className="text-lg font-medium">No certificates yet</h3>
                <p className="text-muted-foreground mt-1">
                  Complete training courses to earn certificates
                </p>
                <Button className="mt-4" onClick={() => window.location.href = '/courses'}>
                  <FileText className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
