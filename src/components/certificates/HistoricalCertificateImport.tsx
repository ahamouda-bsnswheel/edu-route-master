import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface ImportRow {
  employee_id: string;
  participant_name_en: string;
  participant_name_ar?: string;
  course_name_en: string;
  course_name_ar?: string;
  completion_date: string;
  provider_name?: string;
  trainer_name?: string;
  duration_hours?: string;
  cpd_hours?: string;
  expires_at?: string;
}

interface ValidationResult {
  row: number;
  data: ImportRow;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export function HistoricalCertificateImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedData, setParsedData] = useState<ValidationResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const downloadTemplate = () => {
    const headers = [
      'employee_id',
      'participant_name_en',
      'participant_name_ar',
      'course_name_en',
      'course_name_ar',
      'completion_date',
      'provider_name',
      'trainer_name',
      'duration_hours',
      'cpd_hours',
      'expires_at',
    ];
    
    const sampleRow = [
      'EMP001',
      'John Doe',
      'جون دو',
      'Safety Training',
      'تدريب السلامة',
      '2024-01-15',
      'Training Provider Inc',
      'Ahmed Ali',
      '8',
      '4',
      '2026-01-15',
    ];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'certificate_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row as ImportRow;
    });
  };

  const validateRow = async (row: ImportRow, rowNumber: number): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!row.employee_id) errors.push('Employee ID is required');
    if (!row.participant_name_en) errors.push('Participant name (EN) is required');
    if (!row.course_name_en) errors.push('Course name (EN) is required');
    if (!row.completion_date) errors.push('Completion date is required');

    // Date validation
    if (row.completion_date && isNaN(Date.parse(row.completion_date))) {
      errors.push('Invalid completion date format (use YYYY-MM-DD)');
    }
    if (row.expires_at && isNaN(Date.parse(row.expires_at))) {
      errors.push('Invalid expiry date format (use YYYY-MM-DD)');
    }

    // Numeric validation
    if (row.duration_hours && isNaN(Number(row.duration_hours))) {
      errors.push('Duration hours must be a number');
    }
    if (row.cpd_hours && isNaN(Number(row.cpd_hours))) {
      errors.push('CPD hours must be a number');
    }

    // Warnings
    if (!row.provider_name) warnings.push('Provider name is missing');

    return {
      row: rowNumber,
      data: row,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'No data found in the CSV file.',
      });
      return;
    }

    const validationResults = await Promise.all(
      rows.map((row, index) => validateRow(row, index + 2))
    );

    setParsedData(validationResults);
    setShowPreview(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importCertificates = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Valid Rows',
        description: 'Please fix the errors before importing.',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validRows.length });

    let successCount = 0;
    let errorCount = 0;

    // Get a placeholder course for historical imports
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .limit(1);

    const placeholderCourseId = courses?.[0]?.id;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i].data;

      try {
        // Look up employee by employee_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('employee_id', row.employee_id)
          .maybeSingle();

        const employeeId = profile?.id || user?.id; // Fallback to current user if not found

        // Insert certificate - certificate_number is auto-generated by trigger
        const { error } = await supabase.from('certificates').insert({
          employee_id: employeeId,
          course_id: placeholderCourseId!,
          participant_employee_id: row.employee_id,
          participant_name_en: row.participant_name_en,
          participant_name_ar: row.participant_name_ar || null,
          course_name_en: row.course_name_en,
          course_name_ar: row.course_name_ar || null,
          completion_date: row.completion_date,
          provider_name: row.provider_name || null,
          trainer_name: row.trainer_name || null,
          duration_hours: row.duration_hours ? parseInt(row.duration_hours) : null,
          cpd_hours: row.cpd_hours ? parseFloat(row.cpd_hours) : null,
          expires_at: row.expires_at || null,
          is_historical_import: true,
          import_source: 'csv_import',
          status: 'valid',
        } as any);

        if (error) throw error;
        successCount++;
      } catch (err) {
        errorCount++;
      }

      setImportProgress({ current: i + 1, total: validRows.length });
    }

    // Log audit
    await supabase.from('certificate_audit_log').insert({
      action: 'bulk_import',
      actor_id: user?.id,
      details: {
        total: validRows.length,
        success: successCount,
        errors: errorCount,
        source: 'csv_import',
      },
    });

    toast({
      title: 'Import Complete',
      description: `Imported ${successCount} certificates. ${errorCount} errors.`,
    });

    setIsImporting(false);
    setShowPreview(false);
    setParsedData([]);
    queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const errorCount = parsedData.filter(r => !r.isValid).length;
  const warningCount = parsedData.filter(r => r.warnings.length > 0).length;

  return (
    <div className="space-y-6">
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Historical Certificate Import
          </CardTitle>
          <CardDescription>
            Import legacy certificates from CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button asChild>
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    Upload CSV
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Required fields: employee_id, participant_name_en, course_name_en, completion_date</p>
            <p>Date format: YYYY-MM-DD</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 py-4">
            <Badge className="bg-success text-success-foreground">
              <CheckCircle className="h-3 w-3 mr-1" />
              Valid: {validCount}
            </Badge>
            <Badge className="bg-destructive text-destructive-foreground">
              <XCircle className="h-3 w-3 mr-1" />
              Errors: {errorCount}
            </Badge>
            <Badge className="bg-warning text-warning-foreground">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Warnings: {warningCount}
            </Badge>
          </div>

          {isImporting && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between text-sm">
                <span>Importing...</span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <Progress value={(importProgress.current / importProgress.total) * 100} />
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 50).map((result) => (
                  <TableRow key={result.row} className={!result.isValid ? 'bg-destructive/10' : ''}>
                    <TableCell>{result.row}</TableCell>
                    <TableCell>
                      {result.isValid ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell>{result.data.employee_id}</TableCell>
                    <TableCell>{result.data.participant_name_en}</TableCell>
                    <TableCell>{result.data.course_name_en}</TableCell>
                    <TableCell>{result.data.completion_date}</TableCell>
                    <TableCell>
                      {result.errors.length > 0 && (
                        <span className="text-destructive text-xs">
                          {result.errors.join('; ')}
                        </span>
                      )}
                      {result.warnings.length > 0 && (
                        <span className="text-warning text-xs ml-1">
                          {result.warnings.join('; ')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedData.length > 50 && (
              <p className="text-sm text-muted-foreground p-4">
                Showing first 50 rows of {parsedData.length}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={importCertificates} disabled={validCount === 0 || isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import {validCount} Certificates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
