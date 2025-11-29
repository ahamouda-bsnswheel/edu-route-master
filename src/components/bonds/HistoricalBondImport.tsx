import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ImportRow {
  employee_id: string;
  program_name: string;
  institution: string;
  country: string;
  degree_level: string;
  bond_type: string;
  bond_duration_months: number;
  funded_amount?: number;
  bond_start_date?: string;
  bond_end_date?: string;
  status: string;
  time_served_months?: number;
  repayment_amount?: number;
  repayment_status?: string;
}

interface ValidationResult {
  row: number;
  data: ImportRow;
  errors: string[];
  warnings: string[];
}

export function HistoricalBondImport() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      'employee_id',
      'program_name',
      'institution',
      'country',
      'degree_level',
      'bond_type',
      'bond_duration_months',
      'funded_amount',
      'bond_start_date',
      'bond_end_date',
      'status',
      'time_served_months',
      'repayment_amount',
      'repayment_status',
    ];
    const csv = headers.join(',') + '\n' + 
      'EMP001,Masters in Engineering,MIT,USA,masters,time_based,36,50000,2023-01-15,2026-01-15,active,12,,\n' +
      'EMP002,PhD in Computer Science,Stanford,USA,phd,mixed,48,100000,2022-06-01,2026-06-01,fulfilled,48,,';
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bond_import_template.csv';
    a.click();
  };

  const parseCSV = (content: string): ImportRow[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row: Record<string, string | number | undefined> = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (header.includes('months') || header.includes('amount')) {
          row[header] = value ? Number(value) : undefined;
        } else {
          row[header] = value || undefined;
        }
      });
      
      return row as unknown as ImportRow;
    });
  };

  const validateData = async (data: ImportRow[]): Promise<ValidationResult[]> => {
    const results: ValidationResult[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required fields
      if (!row.employee_id) errors.push('Employee ID is required');
      if (!row.program_name) errors.push('Program name is required');
      if (!row.institution) errors.push('Institution is required');
      if (!row.country) errors.push('Country is required');
      if (!row.degree_level) errors.push('Degree level is required');
      if (!row.bond_duration_months) errors.push('Bond duration is required');
      if (!row.status) errors.push('Status is required');

      // Validate status
      const validStatuses = ['pending', 'active', 'fulfilled', 'broken', 'waived_partial', 'waived_full', 'cancelled'];
      if (row.status && !validStatuses.includes(row.status)) {
        errors.push(`Invalid status: ${row.status}`);
      }

      // Validate bond type
      const validBondTypes = ['time_based', 'amount_based', 'mixed'];
      if (row.bond_type && !validBondTypes.includes(row.bond_type)) {
        errors.push(`Invalid bond type: ${row.bond_type}`);
      }

      // Check if employee exists
      if (row.employee_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('employee_id', row.employee_id)
          .maybeSingle();
        
        if (!profile) {
          warnings.push(`Employee ${row.employee_id} not found - will create placeholder`);
        }
      }

      results.push({
        row: i + 2, // 1-indexed + header row
        data: row,
        errors,
        warnings,
      });
    }

    return results;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsValidating(true);
    setImportComplete(false);

    try {
      const content = await selectedFile.text();
      const data = parseCSV(content);
      const results = await validateData(data);
      setValidationResults(results);
    } catch (error) {
      toast.error('Failed to parse CSV file');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    const validRows = validationResults.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setIsImporting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const result of validRows) {
        try {
          const row = result.data;

          // Find or create scholar record first
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('employee_id', row.employee_id)
            .maybeSingle();

          if (!profile) {
            // Skip if no profile found
            errorCount++;
            continue;
          }

          // Check if scholar record exists
          let scholarRecordId: string;
          const { data: existingScholar } = await supabase
            .from('scholar_records')
            .select('id')
            .eq('employee_id', profile.id)
            .maybeSingle();

          if (existingScholar) {
            scholarRecordId = existingScholar.id;
          } else {
            // Create scholar record
            const { data: newScholar, error: scholarError } = await supabase
              .from('scholar_records')
              .insert({
                employee_id: profile.id,
                application_id: null, // Historical import - no application
                program_name: row.program_name,
                institution: row.institution,
                country: row.country,
                degree_level: row.degree_level,
                status: row.status === 'fulfilled' ? 'completed' : 'active',
              })
              .select()
              .single();

            if (scholarError) throw scholarError;
            scholarRecordId = newScholar.id;
          }

          // Create bond record
          const { error: bondError } = await supabase
            .from('service_bonds')
            .insert({
              scholar_record_id: scholarRecordId,
              bond_type: row.bond_type || 'time_based',
              bond_duration_months: row.bond_duration_months,
              funded_amount: row.funded_amount,
              bond_start_date: row.bond_start_date,
              bond_end_date: row.bond_end_date,
              status: row.status,
              time_served_months: row.time_served_months || 0,
              final_repayment_amount: row.repayment_amount,
              repayment_status: row.repayment_status,
              is_historical_import: true,
              import_source: file?.name,
              created_by: user?.id,
            });

          if (bondError) throw bondError;
          successCount++;
        } catch (error) {
          console.error('Error importing row:', error);
          errorCount++;
        }
      }

      toast.success(`Import complete: ${successCount} successful, ${errorCount} failed`);
      setImportComplete(true);
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const hasErrors = validationResults.some(r => r.errors.length > 0);
  const validCount = validationResults.filter(r => r.errors.length === 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Historical Bond Import
        </CardTitle>
        <CardDescription>
          Import existing bond records from a CSV file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Upload CSV File</Label>
          <Input
            id="file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isImporting}
          />
        </div>

        {isValidating && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Validating data...
          </div>
        )}

        {validationResults.length > 0 && !isValidating && (
          <>
            <Alert variant={hasErrors ? 'destructive' : 'default'}>
              <AlertDescription>
                Found {validationResults.length} rows: {validCount} valid, {validationResults.length - validCount} with errors
              </AlertDescription>
            </Alert>

            <div className="max-h-[300px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow key={result.row}>
                      <TableCell>{result.row}</TableCell>
                      <TableCell>{result.data.employee_id}</TableCell>
                      <TableCell>{result.data.program_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.data.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {result.errors.length > 0 ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{result.errors[0]}</span>
                          </div>
                        ) : result.warnings.length > 0 ? (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{result.warnings[0]}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Valid</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!importComplete && (
              <Button 
                onClick={handleImport} 
                disabled={isImporting || validCount === 0}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validCount} Valid Records
                  </>
                )}
              </Button>
            )}

            {importComplete && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Import completed successfully
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
