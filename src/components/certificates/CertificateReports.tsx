import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  BarChart,
  FileText,
  Download,
  Award,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function CertificateReports() {
  const [periodFilter, setPeriodFilter] = useState('3months');

  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case '1month':
        return { start: subMonths(now, 1), end: now };
      case '3months':
        return { start: subMonths(now, 3), end: now };
      case '6months':
        return { start: subMonths(now, 6), end: now };
      case '1year':
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: subMonths(now, 3), end: now };
    }
  };

  // Fetch certificate stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['certificate-stats', periodFilter],
    queryFn: async () => {
      const { start, end } = getDateRange();

      // Total issued in period
      const { count: totalIssued } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .gte('issued_at', start.toISOString())
        .lte('issued_at', end.toISOString());

      // By status
      const { data: statusData } = await supabase
        .from('certificates')
        .select('status')
        .gte('issued_at', start.toISOString())
        .lte('issued_at', end.toISOString());

      const statusCounts = (statusData || []).reduce((acc: Record<string, number>, cert) => {
        acc[cert.status || 'valid'] = (acc[cert.status || 'valid'] || 0) + 1;
        return acc;
      }, {});

      // Revoked in period
      const { count: revoked } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'revoked')
        .gte('revoked_at', start.toISOString())
        .lte('revoked_at', end.toISOString());

      // Expiring soon (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: expiringSoon } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'valid')
        .lte('expires_at', thirtyDaysFromNow.toISOString())
        .gte('expires_at', new Date().toISOString());

      // Already expired
      const { count: expired } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'valid')
        .lt('expires_at', new Date().toISOString());

      return {
        totalIssued: totalIssued || 0,
        valid: statusCounts.valid || 0,
        revoked: revoked || 0,
        expiringSoon: expiringSoon || 0,
        expired: expired || 0,
      };
    },
  });

  // Fetch by course/category breakdown
  const { data: byCourse, isLoading: courseLoading } = useQuery({
    queryKey: ['certificates-by-course', periodFilter],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('certificates')
        .select('course_name_en')
        .gte('issued_at', start.toISOString())
        .lte('issued_at', end.toISOString());

      const counts = (data || []).reduce((acc: Record<string, number>, cert) => {
        const course = cert.course_name_en || 'Unknown';
        acc[course] = (acc[course] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .map(([course, count]) => ({ course, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Fetch revocation report
  const { data: revocations } = useQuery({
    queryKey: ['certificate-revocations', periodFilter],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('certificates')
        .select('certificate_number, participant_name_en, course_name_en, revoked_at, revocation_reason')
        .eq('status', 'revoked')
        .gte('revoked_at', start.toISOString())
        .lte('revoked_at', end.toISOString())
        .order('revoked_at', { ascending: false })
        .limit(20);

      return data;
    },
  });

  // Fetch expiring certificates
  const { data: expiring } = useQuery({
    queryKey: ['expiring-certificates'],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data } = await supabase
        .from('certificates')
        .select('certificate_number, participant_name_en, course_name_en, expires_at')
        .eq('status', 'valid')
        .lte('expires_at', thirtyDaysFromNow.toISOString())
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })
        .limit(20);

      return data;
    },
  });

  const exportReport = (type: string) => {
    let csvContent = '';
    let filename = '';

    if (type === 'issuance' && byCourse) {
      csvContent = 'Course,Count\n' + byCourse.map(r => `"${r.course}",${r.count}`).join('\n');
      filename = `certificate_issuance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (type === 'revocations' && revocations) {
      csvContent = 'Certificate Number,Participant,Course,Revoked At,Reason\n' +
        revocations.map(r => 
          `"${r.certificate_number}","${r.participant_name_en}","${r.course_name_en}","${r.revoked_at}","${r.revocation_reason || ''}"`
        ).join('\n');
      filename = `certificate_revocations_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (type === 'expiring' && expiring) {
      csvContent = 'Certificate Number,Participant,Course,Expires At\n' +
        expiring.map(r => 
          `"${r.certificate_number}","${r.participant_name_en}","${r.course_name_en}","${r.expires_at}"`
        ).join('\n');
      filename = `expiring_certificates_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Certificate Reports</h2>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Last Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Issued</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.totalIssued || 0}</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Valid</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-success">{stats?.valid || 0}</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Revoked</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-destructive">{stats?.revoked || 0}</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm text-muted-foreground">Expiring Soon</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-warning">{stats?.expiringSoon || 0}</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Expired</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.expired || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Issuance by Course */}
      <Card className="card-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Issuance by Course
            </CardTitle>
            <CardDescription>Top 10 courses by certificate count</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportReport('issuance')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {courseLoading ? (
            <p>Loading...</p>
          ) : byCourse && byCourse.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Certificates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCourse.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.course}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{row.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No data for this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Expiring Certificates */}
      <Card className="card-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Expiring Soon (30 days)
            </CardTitle>
            <CardDescription>Certificates requiring renewal</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportReport('expiring')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {expiring && expiring.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiring.map((cert: any) => (
                  <TableRow key={cert.certificate_number}>
                    <TableCell className="font-mono text-sm">{cert.certificate_number}</TableCell>
                    <TableCell>{cert.participant_name_en}</TableCell>
                    <TableCell>{cert.course_name_en}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-warning border-warning">
                        {format(new Date(cert.expires_at), 'MMM dd, yyyy')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No certificates expiring soon.</p>
          )}
        </CardContent>
      </Card>

      {/* Revocations */}
      <Card className="card-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Revoked Certificates
            </CardTitle>
            <CardDescription>Certificates revoked in this period</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportReport('revocations')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {revocations && revocations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Revoked</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revocations.map((cert: any) => (
                  <TableRow key={cert.certificate_number}>
                    <TableCell className="font-mono text-sm">{cert.certificate_number}</TableCell>
                    <TableCell>{cert.participant_name_en}</TableCell>
                    <TableCell>{cert.course_name_en}</TableCell>
                    <TableCell>
                      {cert.revoked_at ? format(new Date(cert.revoked_at), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{cert.revocation_reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No revocations in this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
