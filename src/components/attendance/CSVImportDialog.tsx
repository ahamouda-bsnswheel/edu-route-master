import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  enrollments: any[];
}

interface ParsedRow {
  participantId: string;
  status: string;
  comments: string;
  valid: boolean;
  error?: string;
  enrollment?: any;
}

export function CSVImportDialog({ open, onOpenChange, sessionId, enrollments }: CSVImportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');

  const validStatuses = ['confirmed', 'absent', 'partial'];

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header row
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const [participantId, , , status, comments] = parts;

      // Find matching enrollment
      const enrollment = enrollments.find(e => 
        e.participant_id === participantId || 
        e.participant_id?.startsWith(participantId)
      );

      // Validate status
      const normalizedStatus = status?.toLowerCase();
      const isValidStatus = validStatuses.includes(normalizedStatus);

      let error: string | undefined;
      if (!enrollment) {
        error = 'Participant not found in session';
      } else if (!isValidStatus) {
        error = `Invalid status: ${status}. Must be Present/Absent/Partial`;
      }

      return {
        participantId,
        status: normalizedStatus === 'present' ? 'confirmed' : normalizedStatus,
        comments: comments || '',
        valid: !error,
        error,
        enrollment,
      };
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      setParsedData(parsed);
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const validRows = parsedData.filter(r => r.valid && r.enrollment);

      for (const row of validRows) {
        const oldStatus = row.enrollment.status;

        const { error } = await supabase
          .from('session_enrollments')
          .update({
            status: row.status,
            attendance_comments: row.comments,
          })
          .eq('id', row.enrollment.id);

        if (error) throw error;

        // Log change
        if (oldStatus !== row.status) {
          await supabase.from('attendance_audit_log').insert({
            enrollment_id: row.enrollment.id,
            field_changed: 'attendance_status',
            old_value: oldStatus,
            new_value: row.status,
            reason: 'CSV Import',
            changed_by: user?.id,
          });
        }
      }

      return validRows.length;
    },
    onSuccess: (count) => {
      toast({
        title: 'Import Successful',
        description: `Updated attendance for ${count} participants.`,
      });
      queryClient.invalidateQueries({ queryKey: ['session-enrollments-attendance'] });
      onOpenChange(false);
      setParsedData([]);
      setFileName('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message,
      });
    },
  });

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Import Attendance from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with attendance data. The file should have columns: 
            Employee ID, Name, Email, Status (Present/Absent/Partial), Comments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">{fileName}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select CSV File
              </Button>
            )}
          </div>

          {/* Validation Summary */}
          {parsedData.length > 0 && (
            <div className="flex gap-4">
              <Badge variant="outline" className="text-success border-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Valid: {validCount}
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="text-destructive border-destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Invalid: {invalidCount}
                </Badge>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Participant ID</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 20).map((row, index) => (
                    <TableRow key={index} className={!row.valid ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.participantId?.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.status === 'confirmed' ? 'Present' : 
                           row.status === 'absent' ? 'Absent' : 'Partial'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.comments || '-'}
                      </TableCell>
                      <TableCell>
                        {row.error && (
                          <span className="text-xs text-destructive">{row.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.length > 20 && (
                <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                  Showing 20 of {parsedData.length} rows
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => importMutation.mutate()}
            disabled={validCount === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing...' : `Import ${validCount} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
