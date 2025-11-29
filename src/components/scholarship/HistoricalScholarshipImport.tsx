import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ImportRow {
  employee_id: string;
  program_name: string;
  institution: string;
  country: string;
  program_type: string;
  start_date: string;
  end_date: string;
  status: string;
  total_cost?: string;
  currency?: string;
  decision_date?: string;
  remarks?: string;
}

interface ValidationResult {
  row: number;
  data: ImportRow;
  valid: boolean;
  errors: string[];
  employeeFound: boolean;
}

export function HistoricalScholarshipImport() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row as unknown as ImportRow;
    });
  };

  const validateRow = async (row: ImportRow, index: number): Promise<ValidationResult> => {
    const errors: string[] = [];
    let employeeFound = false;
    
    // Required fields
    if (!row.employee_id) errors.push('Employee ID is required');
    if (!row.program_name) errors.push('Program name is required');
    if (!row.institution) errors.push('Institution is required');
    if (!row.country) errors.push('Country is required');
    if (!row.program_type) errors.push('Program type is required');
    if (!row.status) errors.push('Status is required');
    
    // Validate dates
    if (row.start_date && isNaN(Date.parse(row.start_date))) {
      errors.push('Invalid start date format');
    }
    if (row.end_date && isNaN(Date.parse(row.end_date))) {
      errors.push('Invalid end date format');
    }
    
    // Validate status
    const validStatuses = ['approved', 'rejected', 'completed', 'in_progress', 'withdrawn'];
    if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Validate program type
    const validTypes = ['degree', 'diploma', 'professional_certification', 'long_term_technical'];
    if (row.program_type && !validTypes.includes(row.program_type.toLowerCase())) {
      errors.push(`Invalid program type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Check if employee exists
    if (row.employee_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('employee_id', row.employee_id)
        .single();
      
      if (profile) {
        employeeFound = true;
      } else {
        errors.push('Employee not found in system');
      }
    }
    
    return {
      row: index + 2, // +2 for header row and 1-based indexing
      data: row,
      valid: errors.length === 0,
      errors,
      employeeFound,
    };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setParsedData([]);
    setImportResult(null);
    
    const text = await selectedFile.text();
    const rows = parseCSV(text);
    
    // Validate all rows
    const results = await Promise.all(
      rows.map((row, index) => validateRow(row, index))
    );
    
    setParsedData(results);
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    
    setImporting(true);
    let success = 0;
    let failed = 0;
    
    for (const result of validRows) {
      try {
        // Get employee profile ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('employee_id', result.data.employee_id)
          .single();
        
        if (!profile) {
          failed++;
          continue;
        }
        
        // Calculate duration
        let durationMonths: number | null = null;
        if (result.data.start_date && result.data.end_date) {
          const start = new Date(result.data.start_date);
          const end = new Date(result.data.end_date);
          durationMonths = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
        }
        
        // Map status
        const statusMap: Record<string, string> = {
          'approved': 'accepted',
          'rejected': 'rejected',
          'completed': 'accepted',
          'in_progress': 'accepted',
          'withdrawn': 'withdrawn',
        };
        
        await supabase.from('scholarship_applications').insert({
          applicant_id: profile.id,
          program_name_custom: result.data.program_name,
          institution_custom: result.data.institution,
          country: result.data.country,
          program_type: result.data.program_type.toLowerCase(),
          start_date: result.data.start_date || null,
          end_date: result.data.end_date || null,
          duration_months: durationMonths,
          total_estimated_cost: result.data.total_cost ? parseFloat(result.data.total_cost) : null,
          currency: result.data.currency || 'LYD',
          status: statusMap[result.data.status.toLowerCase()] || 'accepted',
          is_historical_import: true,
          internal_notes: result.data.remarks || 'Historical import',
          submitted_at: result.data.decision_date || new Date().toISOString(),
        });
        
        success++;
      } catch (error) {
        console.error('Import error:', error);
        failed++;
      }
    }
    
    setImporting(false);
    setImportResult({ success, failed });
    
    if (success > 0) {
      toast.success(`Successfully imported ${success} scholarship applications`);
    }
    if (failed > 0) {
      toast.error(`Failed to import ${failed} applications`);
    }
  };

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Historical Scholarship Applications
          </CardTitle>
          <CardDescription>
            Upload a CSV file with historical scholarship/program application data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">CSV Format Requirements:</p>
              <p className="text-sm">
                Required columns: employee_id, program_name, institution, country, program_type, status
              </p>
              <p className="text-sm mt-1">
                Optional columns: start_date, end_date, total_cost, currency, decision_date, remarks
              </p>
              <p className="text-sm mt-1">
                Valid program types: degree, diploma, professional_certification, long_term_technical
              </p>
              <p className="text-sm mt-1">
                Valid statuses: approved, rejected, completed, in_progress, withdrawn
              </p>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>
          
          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {validCount} Valid
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {invalidCount} Invalid
                </Badge>
              </div>
              
              <div className="max-h-96 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 100).map((result, index) => (
                      <TableRow key={index} className={result.valid ? '' : 'bg-destructive/10'}>
                        <TableCell>{result.row}</TableCell>
                        <TableCell>
                          {result.data.employee_id}
                          {result.employeeFound && (
                            <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {result.data.program_name}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {result.data.institution}
                        </TableCell>
                        <TableCell>{result.data.country}</TableCell>
                        <TableCell>
                          <Badge variant={result.valid ? 'default' : 'destructive'}>
                            {result.data.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {result.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-destructive">
                                {result.errors[0]}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {parsedData.length > 100 && (
                <p className="text-sm text-muted-foreground">
                  Showing first 100 of {parsedData.length} rows
                </p>
              )}
              
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
              >
                {importing ? 'Importing...' : `Import ${validCount} Valid Records`}
              </Button>
            </div>
          )}
          
          {importResult && (
            <Alert variant={importResult.failed > 0 ? 'destructive' : 'default'}>
              <AlertDescription>
                Import completed: {importResult.success} successful, {importResult.failed} failed
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
