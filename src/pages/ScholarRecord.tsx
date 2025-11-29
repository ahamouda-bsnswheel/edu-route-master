import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, ArrowLeft, User, Building, Calendar, AlertTriangle,
  BookOpen, FileText, Bell, Plus, Edit, Trash2, Upload, CheckCircle,
  XCircle, Clock, TrendingUp, TrendingDown, Flag, Save
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  useScholarRecord, useAcademicTerms, useAcademicModules, useAcademicEvents,
  useAcademicDocuments, useUpdateScholarRecord, useTermMutation, useModuleMutation,
  useDeleteModule, useCreateEvent, useOverrideRiskLevel,
  AcademicTerm, AcademicModule, AcademicEvent
} from '@/hooks/useAcademicProgress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_enrolled: { label: 'Not Yet Enrolled', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  on_leave: { label: 'On Leave', variant: 'outline' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'default' },
  withdrawn: { label: 'Withdrawn', variant: 'destructive' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const RISK_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  on_track: { label: 'On Track', color: 'text-green-600', icon: TrendingUp },
  watch: { label: 'Watch', color: 'text-amber-600', icon: Clock },
  at_risk: { label: 'At Risk', color: 'text-orange-600', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-600', icon: TrendingDown },
};

const TERM_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  planned: { label: 'Planned', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  repeated: { label: 'Repeated', variant: 'secondary' },
};

const EVENT_TYPES = [
  { value: 'academic_warning', label: 'Academic Warning' },
  { value: 'probation', label: 'Probation' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'leave', label: 'Leave of Absence' },
  { value: 'extension', label: 'Extension' },
  { value: 'program_transfer', label: 'Program Transfer' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'withdrawal', label: 'Withdrawal' },
];

export default function ScholarRecord() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isLnD = hasRole('l_and_d') || hasRole('admin');
  
  const { data: record, isLoading } = useScholarRecord(id || null);
  const { data: terms } = useAcademicTerms(id || null);
  const { data: events } = useAcademicEvents(id || null);
  const { data: documents } = useAcademicDocuments(id || null);
  
  const updateRecord = useUpdateScholarRecord();
  const termMutation = useTermMutation();
  const moduleMutation = useModuleMutation();
  const deleteModule = useDeleteModule();
  const createEvent = useCreateEvent();
  const overrideRisk = useOverrideRiskLevel();
  
  const [selectedTerm, setSelectedTerm] = useState<AcademicTerm | null>(null);
  const [termDialog, setTermDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);
  const [riskDialog, setRiskDialog] = useState(false);
  
  const [termForm, setTermForm] = useState<Partial<AcademicTerm>>({});
  const [moduleForm, setModuleForm] = useState<Partial<AcademicModule>>({});
  const [eventForm, setEventForm] = useState<Partial<AcademicEvent>>({});
  const [riskForm, setRiskForm] = useState({ level: '', reason: '' });
  
  const { data: termModules } = useAcademicModules(selectedTerm?.id || null);
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!record) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Scholar record not found</h2>
          <Button onClick={() => navigate('/scholars')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scholars
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  const statusInfo = STATUS_CONFIG[record.status] || STATUS_CONFIG.active;
  const riskInfo = RISK_CONFIG[record.risk_level] || RISK_CONFIG.on_track;
  const RiskIcon = riskInfo.icon;
  
  const creditsProgress = record.total_credits_required 
    ? (record.credits_completed / record.total_credits_required) * 100 
    : 0;
  
  const handleSaveTerm = async () => {
    if (!termForm.term_name) {
      toast.error('Term name is required');
      return;
    }
    
    await termMutation.mutateAsync({
      ...termForm,
      scholar_record_id: id,
    });
    setTermDialog(false);
    setTermForm({});
  };
  
  const handleSaveModule = async () => {
    if (!moduleForm.module_name || !moduleForm.credits) {
      toast.error('Module name and credits are required');
      return;
    }
    
    await moduleMutation.mutateAsync({
      ...moduleForm,
      term_id: selectedTerm?.id,
    });
    setModuleDialog(false);
    setModuleForm({});
  };
  
  const handleSaveEvent = async () => {
    if (!eventForm.event_type || !eventForm.event_date) {
      toast.error('Event type and date are required');
      return;
    }
    
    await createEvent.mutateAsync({
      ...eventForm,
      scholar_record_id: id,
    });
    setEventDialog(false);
    setEventForm({});
  };
  
  const handleOverrideRisk = async () => {
    if (!riskForm.level || !riskForm.reason) {
      toast.error('Risk level and reason are required');
      return;
    }
    
    await overrideRisk.mutateAsync({
      recordId: id!,
      riskLevel: riskForm.level,
      reason: riskForm.reason,
    });
    setRiskDialog(false);
    setRiskForm({ level: '', reason: '' });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/scholars')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-7 w-7" />
              {record.employee?.first_name_en} {record.employee?.last_name_en}
            </h1>
            <p className="text-muted-foreground">
              {record.program_name} at {record.institution}
            </p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="terms">Academic Terms</TabsTrigger>
            <TabsTrigger value="events">Events & Warnings</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            {isLnD && <TabsTrigger value="notes">Internal Notes</TabsTrigger>}
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Employee Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Employee Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground text-xs">Name</Label>
                    <p className="font-medium">{record.employee?.first_name_en} {record.employee?.last_name_en}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Employee ID</Label>
                    <p>{record.employee?.employee_id || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Job Title</Label>
                    <p>{record.employee?.job_title_en || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Grade</Label>
                    <p>{record.employee?.grade || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Program Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building className="h-4 w-4" />
                    Program Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground text-xs">Program</Label>
                    <p className="font-medium">{record.program_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Institution</Label>
                    <p>{record.institution}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Country</Label>
                    <p>{record.country}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Degree Level</Label>
                    <p className="capitalize">{record.degree_level.replace('_', ' ')}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Progress & Risk */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Progress & Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Risk Level</span>
                    <div className={`flex items-center gap-1 ${riskInfo.color}`}>
                      <RiskIcon className="h-4 w-4" />
                      <span className="font-medium">{riskInfo.label}</span>
                    </div>
                  </div>
                  {isLnD && (
                    <Button variant="outline" size="sm" onClick={() => setRiskDialog(true)}>
                      <Flag className="h-3 w-3 mr-1" />
                      Override Risk
                    </Button>
                  )}
                  {record.cumulative_gpa && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Cumulative GPA</span>
                        <span className="font-medium">{record.cumulative_gpa} / {record.gpa_scale}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Credits Progress</span>
                      <span className="font-medium">{record.credits_completed} / {record.total_credits_required || '?'}</span>
                    </div>
                    <Progress value={creditsProgress} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Current Term</span>
                      <span className="font-medium">{record.current_term_number} / {record.total_terms || '?'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Start Date</Label>
                    <p className="font-medium">
                      {record.actual_start_date 
                        ? format(new Date(record.actual_start_date), 'MMM d, yyyy')
                        : 'Not started'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Expected End</Label>
                    <p className="font-medium">
                      {record.expected_end_date 
                        ? format(new Date(record.expected_end_date), 'MMM d, yyyy')
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Actual End</Label>
                    <p className="font-medium">
                      {record.actual_end_date 
                        ? format(new Date(record.actual_end_date), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Term Structure</Label>
                    <p className="font-medium capitalize">{record.term_structure}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Terms Tab */}
          <TabsContent value="terms" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Academic Terms</h3>
              {isLnD && (
                <Button onClick={() => {
                  setTermForm({ term_number: (terms?.length || 0) + 1 });
                  setTermDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Term
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Terms List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  {terms && terms.length > 0 ? (
                    <div className="space-y-2">
                      {terms.map(term => {
                        const termStatus = TERM_STATUS_CONFIG[term.status] || TERM_STATUS_CONFIG.planned;
                        return (
                          <div
                            key={term.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedTerm?.id === term.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedTerm(term)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{term.term_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Credits: {term.credits_earned} / {term.credits_attempted}
                                  {term.term_gpa && ` • GPA: ${term.term_gpa}`}
                                </p>
                              </div>
                              <Badge variant={termStatus.variant}>{termStatus.label}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No terms recorded yet</p>
                  )}
                </CardContent>
              </Card>
              
              {/* Modules for Selected Term */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Modules {selectedTerm && `- ${selectedTerm.term_name}`}</span>
                    {isLnD && selectedTerm && (
                      <Button size="sm" onClick={() => {
                        setModuleForm({});
                        setModuleDialog(true);
                      }}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTerm ? (
                    termModules && termModules.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Module</TableHead>
                            <TableHead>Credits</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Status</TableHead>
                            {isLnD && <TableHead></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {termModules.map(module => (
                            <TableRow key={module.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{module.module_name}</p>
                                  {module.module_code && (
                                    <p className="text-xs text-muted-foreground">{module.module_code}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{module.credits}</TableCell>
                              <TableCell>{module.grade || '-'}</TableCell>
                              <TableCell>
                                {module.passed === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {module.passed === false && <XCircle className="h-4 w-4 text-red-500" />}
                                {module.passed === null && <Clock className="h-4 w-4 text-muted-foreground" />}
                              </TableCell>
                              {isLnD && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        setModuleForm(module);
                                        setModuleDialog(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => deleteModule.mutate(module.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No modules recorded for this term</p>
                    )
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Select a term to view modules</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Events & Warnings</h3>
              {isLnD && (
                <Button onClick={() => {
                  setEventForm({});
                  setEventDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              )}
            </div>
            
            <Card>
              <CardContent className="pt-6">
                {events && events.length > 0 ? (
                  <div className="space-y-4">
                    {events.map(event => (
                      <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className={`p-2 rounded-full ${
                          event.event_type === 'graduation' ? 'bg-green-100 text-green-600' :
                          event.event_type === 'academic_warning' || event.event_type === 'probation' ? 'bg-amber-100 text-amber-600' :
                          event.event_type === 'suspension' || event.event_type === 'withdrawal' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type}
                            </p>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(event.event_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {event.description && <p className="text-sm mt-1">{event.description}</p>}
                          {event.reason && (
                            <p className="text-sm text-muted-foreground mt-1">Reason: {event.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No events recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Academic Documents</h3>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                {documents && documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.file_name}</TableCell>
                          <TableCell className="capitalize">{doc.document_type.replace('_', ' ')}</TableCell>
                          <TableCell>{doc.academic_year || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              doc.verification_status === 'verified' ? 'default' :
                              doc.verification_status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {doc.verification_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Internal Notes Tab (L&D only) */}
          {isLnD && (
            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Internal Notes</CardTitle>
                  <CardDescription>These notes are only visible to L&D staff</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={record.notes_internal || ''}
                    placeholder="Add internal notes about this scholar..."
                    className="min-h-[200px]"
                    onChange={(e) => {
                      // Would need debounced save
                    }}
                  />
                  <Button className="mt-4" onClick={() => {
                    updateRecord.mutate({ id: id!, notes_internal: record.notes_internal });
                  }}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
        
        {/* Term Dialog */}
        <Dialog open={termDialog} onOpenChange={setTermDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{termForm.id ? 'Edit Term' : 'Add New Term'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Term Number</Label>
                  <Input
                    type="number"
                    value={termForm.term_number || ''}
                    onChange={(e) => setTermForm(f => ({ ...f, term_number: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Term Name</Label>
                  <Input
                    value={termForm.term_name || ''}
                    placeholder="e.g., Year 1 - Semester 1"
                    onChange={(e) => setTermForm(f => ({ ...f, term_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={termForm.start_date || ''}
                    onChange={(e) => setTermForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={termForm.end_date || ''}
                    onChange={(e) => setTermForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Credits Attempted</Label>
                  <Input
                    type="number"
                    value={termForm.credits_attempted || ''}
                    onChange={(e) => setTermForm(f => ({ ...f, credits_attempted: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Credits Earned</Label>
                  <Input
                    type="number"
                    value={termForm.credits_earned || ''}
                    onChange={(e) => setTermForm(f => ({ ...f, credits_earned: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Term GPA</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={termForm.term_gpa || ''}
                    onChange={(e) => setTermForm(f => ({ ...f, term_gpa: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={termForm.status || 'planned'}
                  onValueChange={(v) => setTermForm(f => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="repeated">Repeated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={termForm.notes || ''}
                  onChange={(e) => setTermForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTermDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveTerm} disabled={termMutation.isPending}>
                Save Term
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Module Dialog */}
        <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{moduleForm.id ? 'Edit Module' : 'Add New Module'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Module Code</Label>
                  <Input
                    value={moduleForm.module_code || ''}
                    placeholder="e.g., CS101"
                    onChange={(e) => setModuleForm(f => ({ ...f, module_code: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Module Name *</Label>
                  <Input
                    value={moduleForm.module_name || ''}
                    onChange={(e) => setModuleForm(f => ({ ...f, module_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Credits *</Label>
                  <Input
                    type="number"
                    value={moduleForm.credits || ''}
                    onChange={(e) => setModuleForm(f => ({ ...f, credits: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Grade</Label>
                  <Input
                    value={moduleForm.grade || ''}
                    placeholder="e.g., A, B+, 85"
                    onChange={(e) => setModuleForm(f => ({ ...f, grade: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Module Type</Label>
                  <Select
                    value={moduleForm.module_type || 'core'}
                    onValueChange={(v) => setModuleForm(f => ({ ...f, module_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="elective">Elective</SelectItem>
                      <SelectItem value="prerequisite">Prerequisite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Passed</Label>
                  <Select
                    value={moduleForm.passed === true ? 'true' : moduleForm.passed === false ? 'false' : 'pending'}
                    onValueChange={(v) => setModuleForm(f => ({ 
                      ...f, 
                      passed: v === 'true' ? true : v === 'false' ? false : undefined 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="true">Passed</SelectItem>
                      <SelectItem value="false">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exam Attempts</Label>
                  <Input
                    type="number"
                    value={moduleForm.exam_attempts || 1}
                    onChange={(e) => setModuleForm(f => ({ ...f, exam_attempts: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveModule} disabled={moduleMutation.isPending}>
                Save Module
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Event Dialog */}
        <Dialog open={eventDialog} onOpenChange={setEventDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Academic Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Event Type *</Label>
                <Select
                  value={eventForm.event_type || ''}
                  onValueChange={(v) => setEventForm(f => ({ ...f, event_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Event Date *</Label>
                  <Input
                    type="date"
                    value={eventForm.event_date || ''}
                    onChange={(e) => setEventForm(f => ({ ...f, event_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={eventForm.end_date || ''}
                    onChange={(e) => setEventForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={eventForm.description || ''}
                  onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={eventForm.reason || ''}
                  onChange={(e) => setEventForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEventDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveEvent} disabled={createEvent.isPending}>
                Record Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Risk Override Dialog */}
        <Dialog open={riskDialog} onOpenChange={setRiskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Risk Level</DialogTitle>
              <DialogDescription>
                Manually set the risk level for this scholar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Risk Level</Label>
                <Select value={riskForm.level} onValueChange={(v) => setRiskForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="watch">Watch</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason for Override *</Label>
                <Textarea
                  value={riskForm.reason}
                  onChange={(e) => setRiskForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain why you are overriding the calculated risk level..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRiskDialog(false)}>Cancel</Button>
              <Button onClick={handleOverrideRisk} disabled={overrideRisk.isPending}>
                Save Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
