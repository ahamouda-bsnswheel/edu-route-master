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
  name_en: string;
  name_ar?: string;
  legal_name?: string;
  country?: string;
  city?: string;
  vendor_code?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  categories?: string;
  description?: string;
}

interface ImportResult {
  row: number;
  name: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

export function ProviderBulkImport() {
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
          const mappedHeader = mapHeader(header);
          if (mappedHeader) {
            row[mappedHeader] = value;
          }
        }
      });

      if (row.name_en) {
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
      'name_en': 'name_en',
      'name': 'name_en',
      'provider_name': 'name_en',
      'name_ar': 'name_ar',
      'arabic_name': 'name_ar',
      'legal_name': 'legal_name',
      'country': 'country',
      'city': 'city',
      'vendor_code': 'vendor_code',
      'code': 'vendor_code',
      'email': 'contact_email',
      'contact_email': 'contact_email',
      'phone': 'contact_phone',
      'contact_phone': 'contact_phone',
      'website': 'website',
      'url': 'website',
      'categories': 'categories',
      'category': 'categories',
      'description': 'description',
    };
    return mapping[header] || null;
  };

  const validateData = (data: ParsedRow[]): string[] => {
    const errors: string[] = [];
    const names = new Set<string>();

    data.forEach((row, index) => {
      const rowNum = index + 2;

      if (!row.name_en) {
        errors.push(`Row ${rowNum}: Missing required field 'name_en'`);
      } else if (names.has(row.name_en.toLowerCase())) {
        errors.push(`Row ${rowNum}: Duplicate name '${row.name_en}'`);
      } else {
        names.add(row.name_en.toLowerCase());
      }

      if (row.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.contact_email)) {
        errors.push(`Row ${rowNum}: Invalid email format '${row.contact_email}'`);
      }

      if (row.website && !/^https?:\/\/.+/.test(row.website)) {
        errors.push(`Row ${rowNum}: Invalid website URL '${row.website}'`);
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
          // Check if name already exists
          const { data: existing } = await supabase
            .from('training_providers')
            .select('id')
            .ilike('name_en', row.name_en)
            .maybeSingle();

          if (existing) {
            results.push({
              row: i + 2,
              name: row.name_en,
              status: 'skipped',
              message: 'Provider with similar name already exists'
            });
            continue;
          }

          // Determine if local
          const isLocal = row.country?.toLowerCase() === 'libya';

          // Parse categories
          const categories = row.categories 
            ? row.categories.split(';').map(c => c.trim()).filter(Boolean)
            : [];

          // Insert new provider
          const { error } = await supabase
            .from('training_providers')
            .insert({
              name_en: row.name_en,
              name_ar: row.name_ar || null,
              legal_name: row.legal_name || null,
              country: row.country || null,
              city: row.city || null,
              is_local: isLocal,
              vendor_code: row.vendor_code || null,
              contact_email: row.contact_email || null,
              contact_phone: row.contact_phone || null,
              website: row.website || null,
              categories: categories,
              description: row.description || null,
              provider_status: importAsDraft ? 'draft' : 'active',
              migration_source: 'bulk_import',
              is_active: true,
            });

          if (error) throw error;

          results.push({
            row: i + 2,
            name: row.name_en,
            status: 'success',
            message: 'Imported successfully'
          });
        } catch (error: any) {
          results.push({
            row: i + 2,
            name: row.name_en,
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

      queryClient.invalidateQueries({ queryKey: ['providers-admin'] });

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
    const headers = ['name_en', 'name_ar', 'legal_name', 'country', 'city', 'vendor_code', 'contact_email', 'contact_phone', 'website', 'categories', 'description'];
    const sampleRow = ['ABC Training Institute', 'معهد التدريب', 'ABC Training LLC', 'Libya', 'Tripoli', 'VND-001', 'info@abc.ly', '+218 21 1234567', 'https://abc.ly', 'HSE;Technical;Leadership', 'Leading training provider in Libya'];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Providers
        </CardTitle>
        <CardDescription>
          Import training providers from CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Upload a CSV file with provider information
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
                    Row {result.row} ({result.name}): {result.message}
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
            <li>• <strong>name_en</strong> - Provider name (English)</li>
          </ul>
          <h4 className="font-medium mt-4 mb-2">Optional Columns:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• name_ar, legal_name, country, city, vendor_code</li>
            <li>• contact_email, contact_phone, website</li>
            <li>• categories (semicolon-separated), description</li>
          </ul>
        </div>

        <Button
          onClick={handleImport}
          disabled={!file || isProcessing || validationErrors.length > 0 || parsedData.length === 0}
          className="w-full"
        >
          {isProcessing ? 'Importing...' : `Import ${parsedData.length} Providers`}
        </Button>
      </CardContent>
    </Card>
  );
}
