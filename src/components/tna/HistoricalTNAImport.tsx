import { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
}

const EXPECTED_COLUMNS = [
  'employee_id',
  'competency_text',
  'training_type',
  'training_location',
  'course_text',
  'justification',
  'priority',
  'target_quarter',
  'estimated_cost',
];

export function HistoricalTNAImport() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [periodId, setPeriodId] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch TNA periods
  const { data: periods = [] } = useQuery({
    queryKey: ['tna-periods-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tna_periods')
        .select('id, name, status')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setPreviewData(parsed.slice(0, 5)); // Preview first 5 rows
    };
    reader.readAsText(selectedFile);
  };

  const validateRow = (row: Record<string, string>, rowIndex: number): ImportError[] => {
    const errors: ImportError[] = [];

    if (!row.employee_id) {
      errors.push({ row: rowIndex + 2, field: 'employee_id', message: 'Employee ID is required' });
    }

    if (row.training_type && !['short_term', 'long_term'].includes(row.training_type.toLowerCase())) {
      errors.push({ row: rowIndex + 2, field: 'training_type', message: 'Must be "short_term" or "long_term"' });
    }

    if (row.training_location && !['local', 'abroad'].includes(row.training_location.toLowerCase())) {
      errors.push({ row: rowIndex + 2, field: 'training_location', message: 'Must be "local" or "abroad"' });
    }

    if (row.priority && !['high', 'medium', 'low'].includes(row.priority.toLowerCase())) {
      errors.push({ row: rowIndex + 2, field: 'priority', message: 'Must be "high", "medium", or "low"' });
    }

    if (row.estimated_cost && isNaN(parseFloat(row.estimated_cost))) {
      errors.push({ row: rowIndex + 2, field: 'estimated_cost', message: 'Must be a valid number' });
    }

    return errors;
  };

  const handleImport = async () => {
    if (!file || !periodId) {
      toast.error('Please select a file and period');
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      const errors: ImportError[] = [];
      let successCount = 0;
      let failedCount = 0;

      // Validate all rows first
      rows.forEach((row, index) => {
        const rowErrors = validateRow(row, index);
        errors.push(...rowErrors);
      });

      // Get all employee IDs for validation
      const employeeIds = [...new Set(rows.map(r => r.employee_id).filter(Boolean))];
      const { data: validEmployees } = await supabase
        .from('profiles')
        .select('employee_id, id')
        .in('employee_id', employeeIds);

      const employeeMap = new Map(validEmployees?.map(e => [e.employee_id, e.id]) || []);

      // Check for invalid employees
      rows.forEach((row, index) => {
        if (row.employee_id && !employeeMap.has(row.employee_id)) {
          errors.push({ row: index + 2, field: 'employee_id', message: `Employee "${row.employee_id}" not found` });
        }
      });

      if (errors.length > 0) {
        setResult({ success: 0, failed: rows.length, errors: errors.slice(0, 50) });
        toast.error(`Import failed: ${errors.length} validation errors`);
        setImporting(false);
        return;
      }

      // Process imports in batches
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            const employeeId = employeeMap.get(row.employee_id);
            if (!employeeId) {
              failedCount++;
              continue;
            }

            // Create or get submission for this employee/period
            let { data: submission } = await supabase
              .from('tna_submissions')
              .select('id')
              .eq('employee_id', employeeId)
              .eq('period_id', periodId)
              .single();

            if (!submission) {
              const { data: newSubmission, error: subError } = await supabase
                .from('tna_submissions')
                .insert({
                  employee_id: employeeId,
                  period_id: periodId,
                  status: 'locked',
                  is_historical_import: true,
                })
                .select('id')
                .single();

              if (subError) throw subError;
              submission = newSubmission;
            }

            // Insert the TNA item
            const { error: itemError } = await supabase
              .from('tna_items')
              .insert({
                submission_id: submission.id,
                competency_text: row.competency_text || null,
                training_type: (row.training_type?.toLowerCase() as 'short_term' | 'long_term') || 'short_term',
                training_location: (row.training_location?.toLowerCase() as 'local' | 'abroad') || 'local',
                course_text: row.course_text || null,
                justification: row.justification || null,
                priority: (row.priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
                target_quarter: row.target_quarter || null,
                estimated_cost: row.estimated_cost ? parseFloat(row.estimated_cost) : null,
                is_historical_import: true,
              });

            if (itemError) throw itemError;
            successCount++;
          } catch (err) {
            console.error('Import error for row:', row, err);
            failedCount++;
          }
        }

        setProgress(Math.round(((i + batch.length) / rows.length) * 100));
      }

      setResult({ success: successCount, failed: failedCount, errors });
      queryClient.invalidateQueries({ queryKey: ['tna-submissions'] });
      
      if (failedCount === 0) {
        toast.success(`Successfully imported ${successCount} training needs`);
      } else {
        toast.warning(`Imported ${successCount} records, ${failedCount} failed`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = EXPECTED_COLUMNS.join(',');
    const sampleRow = 'EMP001,Leadership Skills,short_term,local,Leadership Fundamentals,Improve team management,high,Q1 2026,5000';
    const csv = `${headers}\n${sampleRow}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tna_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFile(null);
    setPeriodId('');
    setPreviewData([]);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Historical TNA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Historical Training Needs</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import historical TNA records. Imported records will be marked as read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">Get the CSV template with required columns</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>

          {/* Period Selection */}
          <div className="space-y-2">
            <Label>Target Period</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select TNA period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name} ({period.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(previewData[0]).slice(0, 5).map((key) => (
                        <TableHead key={key} className="whitespace-nowrap text-xs">
                          {key}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        {Object.values(row).slice(0, 5).map((value, vidx) => (
                          <TableCell key={vidx} className="text-xs truncate max-w-[150px]">
                            {value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge variant={result.failed === 0 ? 'default' : 'secondary'} className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {result.success} Imported
                </Badge>
                {result.failed > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {result.failed} Failed
                  </Badge>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Row</TableHead>
                        <TableHead className="w-[120px]">Field</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="font-mono text-xs">{error.field}</TableCell>
                          <TableCell className="text-destructive">{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || !periodId || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
