import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Building,
  Send,
  Loader2,
  CalendarIcon,
  Wallet,
} from 'lucide-react';
import { PerDiemEstimatePanel } from '@/components/per-diem/PerDiemEstimatePanel';
import { format, addMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import { requiresExtendedWorkflow, initializeWorkflow } from '@/hooks/useApprovalWorkflow';

type Step = 'course' | 'session' | 'details' | 'review';
type PreferredPeriodType = 'any' | 'specific_session' | 'quarter' | 'date_range';

// Generate quarter options for current and next year
const generateQuarterOptions = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const options = [];
  
  for (let year = currentYear; year <= currentYear + 1; year++) {
    for (let q = 1; q <= 4; q++) {
      const quarterStart = startOfQuarter(new Date(year, (q - 1) * 3, 1));
      // Only include future quarters
      if (quarterStart >= startOfQuarter(currentDate)) {
        options.push({
          value: `${year}-Q${q}`,
          label: `Q${q} ${year}`,
          startDate: quarterStart,
          endDate: endOfQuarter(quarterStart),
        });
      }
    }
  }
  return options;
};

export default function TrainingRequest() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<Step>('course');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [preferredPeriodType, setPreferredPeriodType] = useState<PreferredPeriodType>('any');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [dateRangeFrom, setDateRangeFrom] = useState<Date | undefined>();
  const [dateRangeTo, setDateRangeTo] = useState<Date | undefined>();
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState('normal');
  const [abroadReason, setAbroadReason] = useState('');

  const quarterOptions = generateQuarterOptions();

  const steps: { key: Step; label: string }[] = [
    { key: 'course', label: 'Course Info' },
    { key: 'session', label: 'Preferred Period' },
    { key: 'details', label: 'Request Details' },
    { key: 'review', label: 'Review & Submit' },
  ];

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          category:course_categories(name_en),
          provider:training_providers(name_en)
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: sessions } = useQuery({
    queryKey: ['course-sessions', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'scheduled')
        .gte('start_date', new Date().toISOString())
        .order('start_date');

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Determine if this requires extended workflow (Abroad/High-cost)
      const isExtendedWorkflow = requiresExtendedWorkflow(course || {});

      const { data: request, error: requestError } = await supabase
        .from('training_requests')
        .insert({
          requester_id: user?.id,
          course_id: courseId,
          session_id: selectedSession,
          justification,
          priority,
          abroad_reason: course?.training_location === 'abroad' ? abroadReason : null,
          status: 'pending',
          submitted_at: new Date().toISOString(),
          estimated_cost: course?.cost_amount,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Use the workflow engine to initialize approvals
      await initializeWorkflow({
        nominatorId: user?.id || '',
        employeeId: user?.id || '', // Employee is requesting for themselves
        requestId: request.id,
        courseName: course?.name_en || 'training',
        isExtendedWorkflow,
      });

      return { request, isExtendedWorkflow };
    },
    onSuccess: ({ isExtendedWorkflow }) => {
      toast({
        title: 'Request Submitted',
        description: isExtendedWorkflow
          ? 'Your training request has been submitted. It will go through the full approval chain (Manager → HRBP → L&D → CHRO).'
          : 'Your training request has been submitted for manager approval.',
      });
      navigate('/my-requests');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Failed to submit request. Please try again.',
      });
    },
  });

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'course':
        return !!course;
      case 'session':
        return true; // Session selection is optional
      case 'details':
        return justification.trim().length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].key);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].key);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  if (courseLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Course not found</h2>
          <Button onClick={() => navigate('/courses')} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={goBack} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Training Request</h1>
          <p className="text-muted-foreground mt-1">
            Submit a request for: {course.name_en}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  index < currentStepIndex
                    ? 'bg-primary border-primary text-primary-foreground'
                    : index === currentStepIndex
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`ml-2 text-sm hidden md:block ${
                  index === currentStepIndex ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 md:w-24 h-0.5 mx-2 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            {/* Step 1: Course Info */}
            {currentStep === 'course' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{course.name_en}</h2>
                <p className="text-muted-foreground">{course.description_en}</p>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{course.duration_days} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{course.delivery_mode?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{course.training_location || 'Local'}</span>
                  </div>
                  {course.cost_level && (
                    <div>
                      <Badge variant="outline" className="capitalize">
                        {course.cost_level} cost
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Preferred Period Selection */}
            {currentStep === 'session' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">Preferred Period</h2>
                  <p className="text-muted-foreground mt-1">
                    Choose when you'd like to attend this training.
                  </p>
                </div>

                <RadioGroup 
                  value={preferredPeriodType} 
                  onValueChange={(value) => {
                    setPreferredPeriodType(value as PreferredPeriodType);
                    if (value !== 'specific_session') {
                      setSelectedSession(null);
                    }
                    if (value !== 'quarter') {
                      setSelectedQuarter('');
                    }
                    if (value !== 'date_range') {
                      setDateRangeFrom(undefined);
                      setDateRangeTo(undefined);
                    }
                  }}
                >
                  <div className="space-y-3">
                    {/* Any Available */}
                    <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                      <RadioGroupItem value="any" id="any" />
                      <Label htmlFor="any" className="flex-1 cursor-pointer">
                        <span className="font-medium">Any Available Session</span>
                        <p className="text-sm text-muted-foreground">
                          L&D will assign you to an appropriate session when available
                        </p>
                      </Label>
                    </div>

                    {/* Quarter Selection */}
                    <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                      <RadioGroupItem value="quarter" id="quarter" className="mt-1" />
                      <Label htmlFor="quarter" className="flex-1 cursor-pointer">
                        <span className="font-medium">Preferred Quarter</span>
                        <p className="text-sm text-muted-foreground mb-2">
                          Select the quarter when you'd prefer to attend
                        </p>
                        {preferredPeriodType === 'quarter' && (
                          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                            <SelectTrigger className="w-full max-w-[200px] bg-background">
                              <SelectValue placeholder="Select quarter" />
                            </SelectTrigger>
                            <SelectContent>
                              {quarterOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </Label>
                    </div>

                    {/* Date Range Selection */}
                    <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                      <RadioGroupItem value="date_range" id="date_range" className="mt-1" />
                      <Label htmlFor="date_range" className="flex-1 cursor-pointer">
                        <span className="font-medium">Custom Date Range</span>
                        <p className="text-sm text-muted-foreground mb-2">
                          Specify a custom date range for your availability
                        </p>
                        {preferredPeriodType === 'date_range' && (
                          <div className="flex flex-wrap gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-[140px] justify-start text-left font-normal bg-background",
                                    !dateRangeFrom && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateRangeFrom ? format(dateRangeFrom, "MMM dd, yyyy") : "From"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dateRangeFrom}
                                  onSelect={setDateRangeFrom}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <span className="flex items-center text-muted-foreground">to</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-[140px] justify-start text-left font-normal bg-background",
                                    !dateRangeTo && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateRangeTo ? format(dateRangeTo, "MMM dd, yyyy") : "To"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dateRangeTo}
                                  onSelect={setDateRangeTo}
                                  disabled={(date) => date < (dateRangeFrom || new Date())}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </Label>
                    </div>

                    {/* Specific Session */}
                    {sessions && sessions.length > 0 && (
                      <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                        <RadioGroupItem value="specific_session" id="specific_session" className="mt-1" />
                        <Label htmlFor="specific_session" className="flex-1 cursor-pointer">
                          <span className="font-medium">Select Specific Session</span>
                          <p className="text-sm text-muted-foreground mb-2">
                            Choose from available scheduled sessions
                          </p>
                          {preferredPeriodType === 'specific_session' && (
                            <div className="space-y-2 mt-2">
                              {sessions.map((session) => (
                                <div
                                  key={session.id}
                                  onClick={() => setSelectedSession(session.id)}
                                  className={cn(
                                    "p-3 rounded-md border cursor-pointer transition-colors",
                                    selectedSession === session.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-background hover:border-primary/50"
                                  )}
                                >
                                  <span className="font-medium text-sm">
                                    {format(new Date(session.start_date), 'MMMM dd, yyyy')} -{' '}
                                    {format(new Date(session.end_date), 'MMMM dd, yyyy')}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    {session.location_en || 'Location TBD'}
                                    {session.instructor_name && ` • ${session.instructor_name}`}
                                  </p>
                                  {session.capacity && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      {(session.capacity || 0) - (session.enrolled_count || 0)} seats available
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </Label>
                      </div>
                    )}
                  </div>
                </RadioGroup>

                {(!sessions || sessions.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-2 border-t pt-4">
                    Note: No upcoming sessions are currently scheduled. Your request will be considered for future sessions.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Request Details */}
            {currentStep === 'details' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Request Details</h2>

                <div className="space-y-2">
                  <Label htmlFor="justification">
                    Justification <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explain why this training is important for your role and development..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters required
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <RadioGroup value={priority} onValueChange={setPriority}>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low">Low</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="normal" id="normal" />
                        <Label htmlFor="normal">Normal</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high">High</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {course.training_location === 'abroad' && (
                  <div className="space-y-2">
                    <Label htmlFor="abroadReason">
                      Reason for Abroad Training <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="abroadReason"
                      value={abroadReason}
                      onChange={(e) => setAbroadReason(e.target.value)}
                      placeholder="Explain why this training must be conducted abroad..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Review Your Request</h2>

                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <span className="text-sm text-muted-foreground">Course</span>
                    <p className="font-medium">{course.name_en}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Preferred Period</span>
                    <p className="font-medium">
                      {preferredPeriodType === 'any' && 'Any Available Session'}
                      {preferredPeriodType === 'quarter' && selectedQuarter && (
                        <>Quarter: {quarterOptions.find(q => q.value === selectedQuarter)?.label || selectedQuarter}</>
                      )}
                      {preferredPeriodType === 'date_range' && dateRangeFrom && dateRangeTo && (
                        <>{format(dateRangeFrom, 'MMM dd, yyyy')} - {format(dateRangeTo, 'MMM dd, yyyy')}</>
                      )}
                      {preferredPeriodType === 'specific_session' && selectedSession && (
                        <>
                          Specific Session: {sessions?.find((s) => s.id === selectedSession)
                            ? format(new Date(sessions.find((s) => s.id === selectedSession)!.start_date), 'MMMM dd, yyyy')
                            : 'Selected Session'}
                        </>
                      )}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Justification</span>
                    <p>{justification}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {priority}
                    </Badge>
                  </div>
                {abroadReason && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm text-muted-foreground">Abroad Reason</span>
                        <p>{abroadReason}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Per Diem Estimate for Abroad Training */}
                {course.training_location === 'abroad' && course.abroad_country && (dateRangeFrom && dateRangeTo || selectedSession) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Estimated Per Diem
                    </h3>
                    <PerDiemEstimatePanel
                      employeeId={user?.id || ''}
                      destinationCountry={course.abroad_country}
                      destinationCity={course.abroad_city || undefined}
                      plannedStartDate={
                        dateRangeFrom?.toISOString().split('T')[0] ||
                        (selectedSession && sessions?.find(s => s.id === selectedSession)?.start_date) ||
                        undefined
                      }
                      plannedEndDate={
                        dateRangeTo?.toISOString().split('T')[0] ||
                        (selectedSession && sessions?.find(s => s.id === selectedSession)?.end_date) ||
                        undefined
                      }
                      employeeGrade={5}
                      showDetailedView={false}
                    />
                  </div>
                )}

                <div className="p-4 border border-warning/50 bg-warning/10 rounded-lg">
                  <p className="text-sm">
                    By submitting this request, it will be sent to your manager for approval.
                    You will be notified of the decision via email.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
