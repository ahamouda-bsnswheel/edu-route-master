import { useState, useRef } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileSpreadsheet, AlertCircle, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ImportRow {
  course_name: string;
  provider?: string;
  training_type: string;
  training_location: string;
  entity?: string;
  department?: string;
  planned_participants: number;
  unit_cost?: number;
  total_cost?: number;
  target_quarter?: string;
  priority?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface LegacyPlanImportProps {
  planId: string;
  planName: string;
}

export function LegacyPlanImport({ planId, planName }: LegacyPlanImportProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isHistorical, setIsHistorical] = useState(false);
  const [linkToTNA, setLinkToTNA] = useState(true);
  
  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    course_name: '',
    provider: '',
    training_type: '',
    training_location: '',
    entity: '',
    department: '',
    planned_participants: '',
    unit_cost: '',
    total_cost: '',
    target_quarter: '',
    priority: '',
  });
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<string[][]>([]);
  
  const requiredFields = ['course_name', 'training_type', 'training_location', 'planned_participants'];
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('File must contain headers and at least one data row');
        return;
      }
      
      const headerRow = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });
      
      setHeaders(headerRow);
      setRawData(dataRows);
      
      // Auto-map columns based on common names
      const autoMapping: Record<string, string> = {};
      headerRow.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('course') || lowerHeader.includes('name')) {
          autoMapping.course_name = header;
        } else if (lowerHeader.includes('provider') || lowerHeader.includes('vendor')) {
          autoMapping.provider = header;
        } else if (lowerHeader.includes('type') && !autoMapping.training_type) {
          autoMapping.training_type = header;
        } else if (lowerHeader.includes('location') || lowerHeader.includes('local') || lowerHeader.includes('abroad')) {
          autoMapping.training_location = header;
        } else if (lowerHeader.includes('entity') || lowerHeader.includes('org')) {
          autoMapping.entity = header;
        } else if (lowerHeader.includes('department') || lowerHeader.includes('dept')) {
          autoMapping.department = header;
        } else if (lowerHeader.includes('participant') || lowerHeader.includes('volume') || lowerHeader.includes('count')) {
          autoMapping.planned_participants = header;
        } else if (lowerHeader.includes('unit') && lowerHeader.includes('cost')) {
          autoMapping.unit_cost = header;
        } else if (lowerHeader.includes('total') && lowerHeader.includes('cost')) {
          autoMapping.total_cost = header;
        } else if (lowerHeader.includes('quarter') || lowerHeader.includes('q1') || lowerHeader.includes('q2')) {
          autoMapping.target_quarter = header;
        } else if (lowerHeader.includes('priority')) {
          autoMapping.priority = header;
        }
      });
      
      setColumnMapping(prev => ({ ...prev, ...autoMapping }));
      setErrors([]);
      setParsedData([]);
    };
    
    reader.readAsText(file);
  };
  
  const validateAndParse = () => {
    const validationErrors: ValidationError[] = [];
    const parsed: ImportRow[] = [];
    
    rawData.forEach((row, rowIndex) => {
      const getColumnValue = (field: string) => {
        const colName = columnMapping[field];
        if (!colName) return undefined;
        const colIndex = headers.indexOf(colName);
        return colIndex >= 0 ? row[colIndex] : undefined;
      };
      
      const courseName = getColumnValue('course_name');
      const trainingType = getColumnValue('training_type')?.toLowerCase();
      const trainingLocation = getColumnValue('training_location')?.toLowerCase();
      const participants = parseInt(getColumnValue('planned_participants') || '0');
      
      // Validate required fields
      if (!courseName) {
        validationErrors.push({ row: rowIndex + 2, field: 'course_name', message: 'Course name is required' });
      }
      if (!trainingType || !['short_term', 'long_term', 'short', 'long'].includes(trainingType)) {
        validationErrors.push({ row: rowIndex + 2, field: 'training_type', message: 'Invalid training type (short_term/long_term)' });
      }
      if (!trainingLocation || !['local', 'abroad'].includes(trainingLocation)) {
        validationErrors.push({ row: rowIndex + 2, field: 'training_location', message: 'Invalid location (local/abroad)' });
      }
      if (!participants || participants <= 0) {
        validationErrors.push({ row: rowIndex + 2, field: 'planned_participants', message: 'Participants must be > 0' });
      }
      
      const unitCost = parseFloat(getColumnValue('unit_cost') || '0');
      const totalCost = parseFloat(getColumnValue('total_cost') || '0');
      const priority = getColumnValue('priority')?.toLowerCase() || 'medium';
      
      parsed.push({
        course_name: courseName || '',
        provider: getColumnValue('provider'),
        training_type: trainingType?.includes('long') ? 'long_term' : 'short_term',
        training_location: trainingLocation === 'abroad' ? 'abroad' : 'local',
        entity: getColumnValue('entity'),
        department: getColumnValue('department'),
        planned_participants: participants,
        unit_cost: unitCost || (totalCost / participants) || 0,
        total_cost: totalCost || (unitCost * participants) || 0,
        target_quarter: getColumnValue('target_quarter'),
        priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      });
    });
    
    setErrors(validationErrors);
    setParsedData(parsed);
    
    return validationErrors.length === 0;
  };
  
  const handleImport = async () => {
    if (!validateAndParse()) {
      toast.error('Please fix validation errors before importing');
      return;
    }
    
    setIsImporting(true);
    setProgress(0);
    
    try {
      const totalRows = parsedData.length;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < totalRows; i++) {
        const row = parsedData[i];
        
        try {
          // Try to match course from catalogue
          let courseId = null;
          if (linkToTNA) {
            const { data: courses } = await supabase
              .from('courses')
              .select('id')
              .ilike('name_en', `%${row.course_name}%`)
              .limit(1);
            
            if (courses && courses.length > 0) {
              courseId = courses[0].id;
            }
          }
          
          // Insert plan item
          const { error } = await supabase
            .from('training_plan_items')
            .insert({
              plan_id: planId,
              item_name: row.course_name,
              course_id: courseId,
              training_type: row.training_type,
              training_location: row.training_location,
              provider_name: row.provider || null,
              planned_participants: row.planned_participants,
              planned_sessions: Math.ceil(row.planned_participants / 20),
              unit_cost: row.unit_cost || 0,
              cost_currency: 'LYD',
              target_quarter: row.target_quarter || null,
              priority: row.priority as any,
              is_catalogue_linked: !!courseId,
              is_tna_backed: false,
              item_status: 'active',
            } as any);
          
          if (error) throw error;
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Error importing row:', err);
        }
        
        setProgress(Math.round(((i + 1) / totalRows) * 100));
      }
      
      // Update plan to mark as having legacy import
      if (isHistorical) {
        await supabase
          .from('training_plans')
          .update({ is_historical_import: true } as any)
          .eq('id', planId);
      }
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: planId,
        action: 'legacy_import',
        details: {
          total_rows: totalRows,
          success_count: successCount,
          error_count: errorCount,
          is_historical: isHistorical,
        },
      } as any);
      
      queryClient.invalidateQueries({ queryKey: ['training-plan-items', planId] });
      queryClient.invalidateQueries({ queryKey: ['training-plan', planId] });
      
      toast.success(`Imported ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setIsOpen(false);
      resetState();
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };
  
  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setHeaders([]);
    setRawData([]);
    setProgress(0);
    setColumnMapping({
      course_name: '',
      provider: '',
      training_type: '',
      training_location: '',
      entity: '',
      department: '',
      planned_participants: '',
      unit_cost: '',
      total_cost: '',
      target_quarter: '',
      priority: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Legacy Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Legacy Training Plan</DialogTitle>
          <DialogDescription>
            Import an existing training plan from CSV/Excel format
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
            />
            <p className="text-xs text-muted-foreground">
              File should contain columns for: Course Name, Training Type (short_term/long_term), 
              Location (local/abroad), Planned Participants, and optionally Provider, Cost, Quarter
            </p>
          </div>
          
          {/* Options */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="historical"
                checked={isHistorical}
                onCheckedChange={(checked) => setIsHistorical(!!checked)}
              />
              <Label htmlFor="historical" className="text-sm">
                Mark as historical (read-only)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="linkTNA"
                checked={linkToTNA}
                onCheckedChange={(checked) => setLinkToTNA(!!checked)}
              />
              <Label htmlFor="linkTNA" className="text-sm">
                Try to link to catalogue courses
              </Label>
            </div>
          </div>
          
          {/* Column Mapping */}
          {headers.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Column Mapping</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.keys(columnMapping).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {field.replace(/_/g, ' ')}
                      {requiredFields.includes(field) && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [field]: value }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Not mapped --</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              <Button variant="secondary" onClick={validateAndParse}>
                Validate Data
              </Button>
            </div>
          )}
          
          {/* Validation Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">{errors.length} validation errors found:</p>
                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                  {errors.slice(0, 10).map((error, i) => (
                    <li key={i}>Row {error.row}: {error.field} - {error.message}</li>
                  ))}
                  {errors.length > 10 && (
                    <li className="text-muted-foreground">...and {errors.length - 10} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Preview */}
          {parsedData.length > 0 && errors.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Preview ({parsedData.length} items)</h4>
                <Badge variant="outline">
                  <Check className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              </div>
              <div className="border rounded-lg overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Quarter</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{row.course_name}</TableCell>
                        <TableCell>{row.training_type}</TableCell>
                        <TableCell>{row.training_location}</TableCell>
                        <TableCell>{row.planned_participants}</TableCell>
                        <TableCell>{row.unit_cost?.toLocaleString()}</TableCell>
                        <TableCell>{row.target_quarter || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  Showing first 10 of {parsedData.length} items
                </p>
              )}
            </div>
          )}
          
          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importing... {progress}%
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || errors.length > 0 || isImporting}
          >
            {isImporting ? 'Importing...' : `Import ${parsedData.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
