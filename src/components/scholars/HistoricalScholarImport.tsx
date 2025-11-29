import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportRow {
  employee_id: string;
  program_name: string;
  institution: string;
  country: string;
  degree_level: string;
  start_date?: string;
  end_date?: string;
  status: string;
  credits_completed?: string;
  total_credits?: string;
  cumulative_gpa?: string;
  gpa_scale?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function HistoricalScholarImport() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const downloadTemplate = () => {
    const headers = [
      'employee_id',
      'program_name',
      'institution',
      'country',
      'degree_level',
      'start_date',
      'end_date',
      'status',
      'credits_completed',
      'total_credits',
      'cumulative_gpa',
      'gpa_scale'
    ];
    const sampleRow = [
      'EMP001',
      'Master of Business Administration',
      'University of London',
      'United Kingdom',
      'masters',
      '2022-09-01',
      '2024-06-30',
      'completed',
      '120',
      '120',
      '3.5',
      '4.0'
    ];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scholar_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row as ImportRow;
    });
  };

  const validateData = (data: ImportRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const validStatuses = ['not_enrolled', 'active', 'on_leave', 'suspended', 'completed', 'withdrawn', 'failed'];
    const validDegreeLevels = ['bachelors', 'masters', 'doctorate', 'diploma', 'certificate', 'professional'];

    data.forEach((row, index) => {
      const rowNum = index + 2; // Account for header row

      if (!row.employee_id) {
        errors.push({ row: rowNum, field: 'employee_id', message: 'Employee ID is required' });
      }
      if (!row.program_name) {
        errors.push({ row: rowNum, field: 'program_name', message: 'Program name is required' });
      }
      if (!row.institution) {
        errors.push({ row: rowNum, field: 'institution', message: 'Institution is required' });
      }
      if (!row.country) {
        errors.push({ row: rowNum, field: 'country', message: 'Country is required' });
      }
      if (!row.degree_level || !validDegreeLevels.includes(row.degree_level.toLowerCase())) {
        errors.push({ row: rowNum, field: 'degree_level', message: `Invalid degree level. Valid values: ${validDegreeLevels.join(', ')}` });
      }
      if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
        errors.push({ row: rowNum, field: 'status', message: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
      }
      if (row.start_date && isNaN(Date.parse(row.start_date))) {
        errors.push({ row: rowNum, field: 'start_date', message: 'Invalid date format (use YYYY-MM-DD)' });
      }
      if (row.end_date && isNaN(Date.parse(row.end_date))) {
        errors.push({ row: rowNum, field: 'end_date', message: 'Invalid date format (use YYYY-MM-DD)' });
      }
      if (row.cumulative_gpa && (isNaN(parseFloat(row.cumulative_gpa)) || parseFloat(row.cumulative_gpa) < 0)) {
        errors.push({ row: rowNum, field: 'cumulative_gpa', message: 'Invalid GPA value' });
      }
    });

    return errors;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResults(null);
    setProgress(0);

    const text = await selectedFile.text();
    const data = parseCSV(text);
    const validationErrors = validateData(data);
    
    setParsedData(data);
    setErrors(validationErrors);
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    setImporting(true);
    setProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      
      try {
        // First, find the employee by their employee_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('employee_id', row.employee_id)
          .single();

        if (!profile) {
          console.error(`Employee not found: ${row.employee_id}`);
          failed++;
          continue;
        }

        // Create a placeholder application for historical import
        const { data: application, error: appError } = await supabase
          .from('scholarship_applications')
          .insert({
            applicant_id: profile.id,
            program_type: row.degree_level.toLowerCase(),
            country: row.country,
            institution_custom: row.institution,
            program_name_custom: row.program_name,
            status: 'accepted',
            is_historical_import: true,
            start_date: row.start_date || null,
            end_date: row.end_date || null,
          })
          .select('id')
          .single();

        if (appError || !application) {
          console.error('Failed to create application:', appError);
          failed++;
          continue;
        }

        // Create the scholar record
        const { error: recordError } = await supabase
          .from('scholar_records')
          .insert({
            application_id: application.id,
            employee_id: profile.id,
            program_name: row.program_name,
            institution: row.institution,
            country: row.country,
            degree_level: row.degree_level.toLowerCase(),
            actual_start_date: row.start_date || null,
            expected_end_date: row.end_date || null,
            actual_end_date: row.status === 'completed' ? row.end_date : null,
            status: row.status?.toLowerCase() || 'completed',
            credits_completed: row.credits_completed ? parseInt(row.credits_completed) : 0,
            total_credits_required: row.total_credits ? parseInt(row.total_credits) : null,
            cumulative_gpa: row.cumulative_gpa ? parseFloat(row.cumulative_gpa) : null,
            gpa_scale: row.gpa_scale ? parseFloat(row.gpa_scale) : 4.0,
          });

        if (recordError) {
          console.error('Failed to create scholar record:', recordError);
          failed++;
        } else {
          success++;
        }
      } catch (error) {
        console.error('Import error:', error);
        failed++;
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setImportResults({ success, failed });
    setImporting(false);
    
    if (success > 0) {
      toast.success(`Successfully imported ${success} scholar records`);
    }
    if (failed > 0) {
      toast.error(`Failed to import ${failed} records`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Historical Scholar Records
        </CardTitle>
        <CardDescription>
          Bulk import historical academic progress records from CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Upload CSV File</Label>
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={importing}
          />
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">{errors.length} validation error(s) found:</p>
              <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {errors.slice(0, 10).map((error, i) => (
                  <li key={i}>Row {error.row}, {error.field}: {error.message}</li>
                ))}
                {errors.length > 10 && <li>...and {errors.length - 10} more errors</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {parsedData.length > 0 && errors.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {parsedData.length} records ready to import
            </AlertDescription>
          </Alert>
        )}

        {importing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Importing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {importResults && (
          <Alert variant={importResults.failed > 0 ? 'destructive' : 'default'}>
            <AlertDescription>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {importResults.success} imported
                </div>
                {importResults.failed > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    {importResults.failed} failed
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {parsedData.length > 0 && (
          <>
            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.employee_id}</TableCell>
                      <TableCell>{row.program_name}</TableCell>
                      <TableCell>{row.institution}</TableCell>
                      <TableCell>{row.country}</TableCell>
                      <TableCell>{row.status || 'completed'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 10 && (
              <p className="text-sm text-muted-foreground">
                Showing first 10 of {parsedData.length} records
              </p>
            )}
          </>
        )}

        <Button 
          onClick={handleImport} 
          disabled={parsedData.length === 0 || errors.length > 0 || importing}
          className="w-full"
        >
          {importing ? 'Importing...' : `Import ${parsedData.length} Records`}
        </Button>
      </CardContent>
    </Card>
  );
}
