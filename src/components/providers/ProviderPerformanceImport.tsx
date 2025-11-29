import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, History } from 'lucide-react';

interface ImportRow {
  provider_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  total_sessions?: number;
  total_participants?: number;
  avg_rating?: number;
  completion_rate?: number;
  cancellation_rate?: number;
  total_cost?: number;
  errors?: string[];
}

export function ProviderPerformanceImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [importSource, setImportSource] = useState('legacy_lms');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  // Fetch providers for mapping
  const { data: providers } = useQuery({
    queryKey: ['all-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_providers')
        .select('id, name_en, name_ar')
        .order('name_en');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing snapshots
  const { data: snapshots } = useQuery({
    queryKey: ['performance-snapshots-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_performance_snapshots')
        .select('*, training_providers(name_en)')
        .eq('is_historical_import', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i];
      });
      
      // Parse numbers
      if (row.total_sessions) row.total_sessions = parseInt(row.total_sessions) || 0;
      if (row.total_participants) row.total_participants = parseInt(row.total_participants) || 0;
      if (row.avg_rating) row.avg_rating = parseFloat(row.avg_rating) || null;
      if (row.completion_rate) row.completion_rate = parseFloat(row.completion_rate) || null;
      if (row.cancellation_rate) row.cancellation_rate = parseFloat(row.cancellation_rate) || null;
      if (row.total_cost) row.total_cost = parseFloat(row.total_cost) || null;
      
      // Validate
      const errors: string[] = [];
      if (!row.provider_name) errors.push('Missing provider name');
      if (!row.period_type) errors.push('Missing period type');
      if (!row.period_start) errors.push('Missing period start');
      if (!row.period_end) errors.push('Missing period end');
      
      row.errors = errors;
      return row as ImportRow;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    const text = await selectedFile.text();
    const data = parseCSV(text);
    setParsedData(data);
    setImportResults(null);
  };

  const findProviderByName = (name: string) => {
    return providers?.find(p => 
      p.name_en?.toLowerCase() === name.toLowerCase() ||
      p.name_ar?.toLowerCase() === name.toLowerCase()
    );
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    
    setIsImporting(true);
    setImportProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      
      if (row.errors && row.errors.length > 0) {
        failed++;
        continue;
      }

      const provider = findProviderByName(row.provider_name);
      if (!provider) {
        row.errors = ['Provider not found in registry'];
        failed++;
        continue;
      }

      try {
        const { error } = await supabase
          .from('provider_performance_snapshots')
          .upsert({
            provider_id: provider.id,
            period_type: row.period_type,
            period_start: row.period_start,
            period_end: row.period_end,
            total_sessions: row.total_sessions || 0,
            total_participants: row.total_participants || 0,
            avg_rating: row.avg_rating,
            completion_rate: row.completion_rate,
            cancellation_rate: row.cancellation_rate,
            total_cost: row.total_cost,
            is_historical_import: true,
            import_source: importSource,
          }, {
            onConflict: 'provider_id,period_type,period_start',
          });

        if (error) throw error;
        success++;
      } catch (err) {
        failed++;
        row.errors = [(err as Error).message];
      }

      setImportProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    // Log import
    await supabase.from('provider_performance_audit_log').insert({
      action: 'historical_import',
      entity_type: 'snapshot',
      new_value: { total: parsedData.length, success, failed, source: importSource },
      actor_id: user?.id,
    });

    setImportResults({ success, failed });
    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ['performance-snapshots-history'] });
    toast.success(`Import completed: ${success} success, ${failed} failed`);
  };

  const downloadTemplate = () => {
    const headers = [
      'provider_name',
      'period_type',
      'period_start',
      'period_end',
      'total_sessions',
      'total_participants',
      'avg_rating',
      'completion_rate',
      'cancellation_rate',
      'total_cost',
    ];
    const sampleRow = [
      'Sample Provider',
      'quarterly',
      '2024-01-01',
      '2024-03-31',
      '25',
      '350',
      '4.2',
      '92.5',
      '3.5',
      '150000',
    ];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider-performance-template.csv';
    a.click();
  };

  const validRows = parsedData.filter(r => !r.errors || r.errors.length === 0);
  const invalidRows = parsedData.filter(r => r.errors && r.errors.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Historical Performance Data
          </CardTitle>
          <CardDescription>
            Import historical provider performance data from legacy systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <span className="text-sm text-muted-foreground">
              Use this template to format your import data
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Import Source</Label>
              <Select value={importSource} onValueChange={setImportSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legacy_lms">Legacy LMS</SelectItem>
                  <SelectItem value="excel_records">Excel Records</SelectItem>
                  <SelectItem value="erp_system">ERP System</SelectItem>
                  <SelectItem value="manual_entry">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {parsedData.length > 0 && (
            <>
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertTitle>File parsed</AlertTitle>
                <AlertDescription>
                  Found {parsedData.length} rows: {validRows.length} valid, {invalidRows.length} with errors
                </AlertDescription>
              </Alert>

              {invalidRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {invalidRows.slice(0, 5).map((row, i) => (
                        <li key={i}>
                          {row.provider_name || 'Row ' + (i + 1)}: {row.errors?.join(', ')}
                        </li>
                      ))}
                      {invalidRows.length > 5 && (
                        <li>...and {invalidRows.length - 5} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i} className={row.errors?.length ? 'bg-red-50 dark:bg-red-950' : ''}>
                        <TableCell>{row.provider_name}</TableCell>
                        <TableCell>
                          {row.period_type} ({row.period_start} - {row.period_end})
                        </TableCell>
                        <TableCell>{row.total_sessions}</TableCell>
                        <TableCell>{row.total_participants}</TableCell>
                        <TableCell>{row.avg_rating}</TableCell>
                        <TableCell>
                          {row.errors?.length ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : (
                            <Badge variant="secondary">Ready</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Importing... {importProgress}%
                  </p>
                </div>
              )}

              {importResults && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Import Complete</AlertTitle>
                  <AlertDescription>
                    Successfully imported {importResults.success} records. 
                    {importResults.failed > 0 && ` ${importResults.failed} failed.`}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleImport} 
                disabled={validRows.length === 0 || isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {validRows.length} Records
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Import History
          </CardTitle>
          <CardDescription>
            Previously imported historical performance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Imported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>{(snapshot.training_providers as any)?.name_en}</TableCell>
                    <TableCell>
                      {snapshot.period_type} ({format(new Date(snapshot.period_start), 'MMM yyyy')})
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{snapshot.import_source}</Badge>
                    </TableCell>
                    <TableCell>{snapshot.total_sessions}</TableCell>
                    <TableCell>{snapshot.avg_rating?.toFixed(2) || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(snapshot.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No historical imports yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}