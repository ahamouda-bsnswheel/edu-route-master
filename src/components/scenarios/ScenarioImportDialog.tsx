import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImportScenario } from '@/hooks/useScenarios';

interface ScenarioImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  course_code?: string;
  course_name?: string;
  entity?: string;
  category?: string;
  adjusted_volume?: number;
  adjusted_cost?: number;
  matched?: boolean;
  error?: string;
}

export function ScenarioImportDialog({ open, onOpenChange }: ScenarioImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [errorRows, setErrorRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportScenario();

  const { data: plans } = useQuery({
    queryKey: ['training-plans-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_plans')
        .select('id, name, version, status')
        .in('status', ['approved', 'draft'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Parse CSV/Excel file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: ParsedRow = {};
      
      headers.forEach((header, idx) => {
        const value = values[idx]?.trim();
        if (header.includes('course') && header.includes('code')) row.course_code = value;
        else if (header.includes('course') && header.includes('name')) row.course_name = value;
        else if (header.includes('entity')) row.entity = value;
        else if (header.includes('category')) row.category = value;
        else if (header.includes('volume') || header.includes('participants')) row.adjusted_volume = parseInt(value) || 0;
        else if (header.includes('cost')) row.adjusted_cost = parseFloat(value) || 0;
      });

      // Validate row
      if (!row.course_code && !row.course_name) {
        row.error = 'Missing course identifier';
        row.matched = false;
      } else if (row.adjusted_volume === undefined && row.adjusted_cost === undefined) {
        row.error = 'Missing adjusted volume or cost';
        row.matched = false;
      } else {
        row.matched = true;
      }

      rows.push(row);
    }

    setParsedData(rows);
    setValidRows(rows.filter(r => r.matched));
    setErrorRows(rows.filter(r => !r.matched));
    setStep('preview');
  };

  const handleImport = async () => {
    if (!selectedPlanId || !scenarioName || validRows.length === 0) return;

    setStep('importing');
    setImportProgress(10);

    const plan = plans?.find(p => p.id === selectedPlanId);
    
    try {
      await importMutation.mutateAsync({
        planId: selectedPlanId,
        planVersion: plan?.version || 1,
        name: scenarioName,
        description: scenarioDescription,
        importData: validRows.map(row => ({
          courseCode: row.course_code,
          courseName: row.course_name,
          entity: row.entity,
          category: row.category,
          adjustedVolume: row.adjusted_volume,
          adjustedCost: row.adjusted_cost,
        })),
      });

      setImportProgress(100);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1000);
    } catch (error) {
      setStep('preview');
    }
  };

  const resetForm = () => {
    setStep('upload');
    setSelectedPlanId('');
    setScenarioName('');
    setScenarioDescription('');
    setParsedData([]);
    setValidRows([]);
    setErrorRows([]);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Scenario from File</DialogTitle>
          <DialogDescription>
            Import an externally prepared scenario (e.g., from Finance) as a new scenario
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Basis Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (v{plan.version}) - {plan.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scenario Name</Label>
              <Input 
                value={scenarioName} 
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Finance Budget Cut Proposal"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                value={scenarioDescription} 
                onChange={(e) => setScenarioDescription(e.target.value)}
                placeholder="Describe the source and purpose of this imported scenario"
              />
            </div>

            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="scenario-file-input"
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload a CSV or Excel file with columns:
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                course_code, course_name, entity, category, adjusted_volume, adjusted_cost
              </p>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedPlanId || !scenarioName}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The file should contain plan line identifiers that match existing courses in the selected basis plan.
                Unmatched rows will be listed in an error report.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {validRows.length} valid rows
                </Badge>
                {errorRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <X className="h-3 w-3" />
                    {errorRows.length} errors
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Choose Different File
              </Button>
            </div>

            {errorRows.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {errorRows.length} rows could not be matched and will be skipped.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Course Code</TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="text-right">Adj. Volume</TableHead>
                    <TableHead className="text-right">Adj. Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 50).map((row, idx) => (
                    <TableRow key={idx} className={row.matched ? '' : 'bg-destructive/10'}>
                      <TableCell>
                        {row.matched ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.course_code || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{row.course_name || '-'}</TableCell>
                      <TableCell>{row.entity || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{row.adjusted_volume ?? '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.adjusted_cost?.toLocaleString() ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 50 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing first 50 of {parsedData.length} rows
              </p>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-primary mb-4 animate-pulse" />
              <p className="font-medium">Importing Scenario...</p>
              <p className="text-sm text-muted-foreground">
                Processing {validRows.length} rows
              </p>
            </div>
            <Progress value={importProgress} className="w-full" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'preview' && (
            <Button 
              onClick={handleImport} 
              disabled={validRows.length === 0 || importMutation.isPending}
            >
              Import {validRows.length} Rows
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
