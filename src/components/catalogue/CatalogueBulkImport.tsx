import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ParsedRow {
  code: string;
  name_en: string;
  name_ar?: string;
  category?: string;
  delivery_mode: string;
  duration_hours?: number;
  duration_days?: number;
  description_en?: string;
  description_ar?: string;
  objectives?: string;
  target_audience?: string;
  training_location?: string;
  abroad_country?: string;
  abroad_city?: string;
  local_site?: string;
  provider_name?: string;
  cost_amount?: number;
  cost_currency?: string;
  is_mandatory?: boolean;
  validity_months?: number;
}

interface ImportResult {
  row: number;
  code: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

export function CatalogueBulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [importAsDraft, setImportAsDraft] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (value) {
          // Map common header variations
          const mappedHeader = mapHeader(header);
          if (mappedHeader) {
            row[mappedHeader] = value;
          }
        }
      });

      if (row.code && row.name_en && row.delivery_mode) {
        // Parse numeric fields
        if (row.duration_hours) row.duration_hours = parseInt(row.duration_hours) || undefined;
        if (row.duration_days) row.duration_days = parseInt(row.duration_days) || undefined;
        if (row.cost_amount) row.cost_amount = parseFloat(row.cost_amount) || undefined;
        if (row.validity_months) row.validity_months = parseInt(row.validity_months) || undefined;
        if (row.is_mandatory) row.is_mandatory = row.is_mandatory.toLowerCase() === 'true' || row.is_mandatory === '1';
        
        rows.push(row as ParsedRow);
      }
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const mapHeader = (header: string): string | null => {
    const mapping: Record<string, string> = {
      'code': 'code',
      'course_code': 'code',
      'title_en': 'name_en',
      'name_en': 'name_en',
      'title_english': 'name_en',
      'title_ar': 'name_ar',
      'name_ar': 'name_ar',
      'title_arabic': 'name_ar',
      'category': 'category',
      'delivery_mode': 'delivery_mode',
      'delivery': 'delivery_mode',
      'mode': 'delivery_mode',
      'duration_hours': 'duration_hours',
      'hours': 'duration_hours',
      'duration_days': 'duration_days',
      'days': 'duration_days',
      'description_en': 'description_en',
      'description': 'description_en',
      'description_ar': 'description_ar',
      'objectives': 'objectives',
      'target_audience': 'target_audience',
      'audience': 'target_audience',
      'training_location': 'training_location',
      'location': 'training_location',
      'abroad_country': 'abroad_country',
      'country': 'abroad_country',
      'abroad_city': 'abroad_city',
      'city': 'abroad_city',
      'local_site': 'local_site',
      'site': 'local_site',
      'provider': 'provider_name',
      'provider_name': 'provider_name',
      'cost': 'cost_amount',
      'cost_amount': 'cost_amount',
      'price': 'cost_amount',
      'currency': 'cost_currency',
      'cost_currency': 'cost_currency',
      'mandatory': 'is_mandatory',
      'is_mandatory': 'is_mandatory',
      'validity': 'validity_months',
      'validity_months': 'validity_months',
    };
    return mapping[header] || null;
  };

  const validateData = (data: ParsedRow[]): string[] => {
    const errors: string[] = [];
    const codes = new Set<string>();
    const validDeliveryModes = ['classroom', 'online', 'blended', 'on_the_job'];

    data.forEach((row, index) => {
      const rowNum = index + 2; // Account for header row

      if (!row.code) {
        errors.push(`Row ${rowNum}: Missing required field 'code'`);
      } else if (codes.has(row.code)) {
        errors.push(`Row ${rowNum}: Duplicate code '${row.code}'`);
      } else {
        codes.add(row.code);
      }

      if (!row.name_en) {
        errors.push(`Row ${rowNum}: Missing required field 'name_en'`);
      }

      if (!row.delivery_mode) {
        errors.push(`Row ${rowNum}: Missing required field 'delivery_mode'`);
      } else if (!validDeliveryModes.includes(row.delivery_mode.toLowerCase())) {
        errors.push(`Row ${rowNum}: Invalid delivery_mode '${row.delivery_mode}'. Valid values: ${validDeliveryModes.join(', ')}`);
      }

      if (row.training_location && !['local', 'abroad'].includes(row.training_location.toLowerCase())) {
        errors.push(`Row ${rowNum}: Invalid training_location '${row.training_location}'. Valid values: local, abroad`);
      }
    });

    return errors;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResults([]);
    setProgress(0);

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);
      setParsedData(data);
      
      const errors = validateData(data);
      setValidationErrors(errors);

      if (data.length === 0) {
        toast.error('No valid data found in the file');
      } else if (errors.length > 0) {
        toast.warning(`Found ${data.length} rows with ${errors.length} validation issues`);
      } else {
        toast.success(`Parsed ${data.length} valid rows`);
      }
    } catch (error) {
      toast.error('Failed to parse file');
      console.error(error);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const results: ImportResult[] = [];
      const total = parsedData.length;

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        setProgress(Math.round(((i + 1) / total) * 100));

        try {
          // Check if code already exists
          const { data: existing } = await supabase
            .from('courses')
            .select('id')
            .eq('code', row.code)
            .single();

          if (existing) {
            results.push({
              row: i + 2,
              code: row.code,
              status: 'skipped',
              message: 'Code already exists'
            });
            continue;
          }

          // Insert new course
          const { error } = await supabase
            .from('courses')
            .insert({
              code: row.code,
              name_en: row.name_en,
              name_ar: row.name_ar || null,
              delivery_mode: row.delivery_mode.toLowerCase() as 'classroom' | 'online' | 'blended' | 'on_the_job',
              duration_hours: row.duration_hours || null,
              duration_days: row.duration_days || null,
              description_en: row.description_en || null,
              description_ar: row.description_ar || null,
              objectives: row.objectives || null,
              target_audience: row.target_audience || null,
              training_location: (row.training_location?.toLowerCase() as 'local' | 'abroad') || 'local',
              abroad_country: row.abroad_country || null,
              abroad_city: row.abroad_city || null,
              local_site: row.local_site || null,
              cost_amount: row.cost_amount || null,
              cost_currency: row.cost_currency || 'LYD',
              is_mandatory: row.is_mandatory || false,
              validity_months: row.validity_months || null,
              catalogue_status: importAsDraft ? 'draft' : 'active',
              migration_source: 'bulk_import',
              is_active: true,
            });

          if (error) throw error;

          results.push({
            row: i + 2,
            code: row.code,
            status: 'success',
            message: 'Imported successfully'
          });
        } catch (error: any) {
          results.push({
            row: i + 2,
            code: row.code,
            status: 'error',
            message: error.message || 'Unknown error'
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setImportResults(results);
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;

      queryClient.invalidateQueries({ queryKey: ['catalogue-courses'] });

      if (errorCount === 0) {
        toast.success(`Import complete: ${successCount} imported, ${skippedCount} skipped`);
      } else {
        toast.warning(`Import complete with errors: ${successCount} imported, ${errorCount} errors, ${skippedCount} skipped`);
      }
    },
    onError: (error) => {
      toast.error('Import failed');
      console.error(error);
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleImport = () => {
    if (!file || parsedData.length === 0) {
      toast.error('Please select a valid file first');
      return;
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    setIsProcessing(true);
    setImportResults([]);
    importMutation.mutate();
  };

  const handleClear = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportResults([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = ['code', 'name_en', 'name_ar', 'category', 'delivery_mode', 'duration_hours', 'duration_days', 'description_en', 'description_ar', 'objectives', 'target_audience', 'training_location', 'abroad_country', 'abroad_city', 'local_site', 'cost_amount', 'cost_currency', 'is_mandatory', 'validity_months'];
    const sampleRow = ['HSE-001', 'Fire Safety Training', 'تدريب السلامة من الحريق', 'HSE', 'classroom', '8', '1', 'Basic fire safety training', 'تدريب أساسي على السلامة', 'Learn fire safety procedures', 'All employees', 'local', '', '', 'Tripoli HQ', '500', 'LYD', 'true', '12'];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalogue_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Catalogue Items
        </CardTitle>
        <CardDescription>
          Import courses and programs from CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Upload a CSV file with catalogue items
          </p>
          <div className="flex items-center justify-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-xs"
            />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>
          {file && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="secondary">{file.name}</Badge>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Parsed Data Summary */}
        {parsedData.length > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Parsed Data</span>
              <Badge variant={validationErrors.length > 0 ? 'destructive' : 'default'}>
                {parsedData.length} rows
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {validationErrors.length === 0 
                ? 'All rows validated successfully' 
                : `${validationErrors.length} validation issues found`}
            </p>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Validation Errors</span>
            </div>
            <ScrollArea className="h-32">
              <ul className="text-sm text-destructive space-y-1">
                {validationErrors.slice(0, 20).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {validationErrors.length > 20 && (
                  <li>... and {validationErrors.length - 20} more errors</li>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}

        {/* Import Options */}
        {parsedData.length > 0 && validationErrors.length === 0 && (
          <div className="flex items-center gap-2">
            <Checkbox 
              id="importAsDraft" 
              checked={importAsDraft}
              onCheckedChange={(checked) => setImportAsDraft(checked as boolean)}
            />
            <label htmlFor="importAsDraft" className="text-sm">
              Import as Draft (requires approval to activate)
            </label>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Processing... {progress}%
            </p>
          </div>
        )}

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Import Results</h4>
            <div className="flex gap-4 mb-2">
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                {importResults.filter(r => r.status === 'success').length} Success
              </Badge>
              <Badge variant="secondary">
                {importResults.filter(r => r.status === 'skipped').length} Skipped
              </Badge>
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {importResults.filter(r => r.status === 'error').length} Errors
              </Badge>
            </div>
            <ScrollArea className="h-32">
              <ul className="text-sm space-y-1">
                {importResults.filter(r => r.status === 'error').map((result, i) => (
                  <li key={i} className="text-destructive">
                    Row {result.row} ({result.code}): {result.message}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        {/* Required Columns Info */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Required Columns:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>code</strong> - Unique course identifier</li>
            <li>• <strong>name_en</strong> - English title</li>
            <li>• <strong>delivery_mode</strong> - classroom, online, blended, or on_the_job</li>
          </ul>
          <h4 className="font-medium mt-4 mb-2">Optional Columns:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• name_ar, category, duration_hours, duration_days, description_en, description_ar</li>
            <li>• objectives, target_audience, training_location (local/abroad)</li>
            <li>• abroad_country, abroad_city, local_site, cost_amount, cost_currency</li>
            <li>• is_mandatory (true/false), validity_months</li>
          </ul>
        </div>

        <Button
          onClick={handleImport}
          disabled={!file || isProcessing || validationErrors.length > 0 || parsedData.length === 0}
          className="w-full"
        >
          {isProcessing ? 'Importing...' : `Import ${parsedData.length} Items`}
        </Button>
      </CardContent>
    </Card>
  );
}
