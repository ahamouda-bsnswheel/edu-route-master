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
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Building,
  Send,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

type Step = 'course' | 'session' | 'details' | 'review';

export default function TrainingRequest() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<Step>('course');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState('normal');
  const [abroadReason, setAbroadReason] = useState('');

  const steps: { key: Step; label: string }[] = [
    { key: 'course', label: 'Course Info' },
    { key: 'session', label: 'Select Session' },
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

  // Fetch fresh manager_id from profile to ensure it's current
  const { data: freshProfile } = useQuery({
    queryKey: ['fresh-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('manager_id')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Get manager_id from fresh profile query or fallback to auth context
      const managerId = freshProfile?.manager_id || profile?.manager_id;

      if (!managerId) {
        throw new Error('No manager assigned to your profile. Please contact HR to set up your reporting structure.');
      }

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
          current_approval_level: 1,
          current_approver_id: managerId,
          estimated_cost: course?.cost_amount,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create initial approval record for manager
      const { error: approvalError } = await supabase
        .from('approvals')
        .insert({
          request_id: request.id,
          approver_id: managerId,
          approver_role: 'manager',
          approval_level: 1,
          status: 'pending',
        });

      if (approvalError) throw approvalError;

      return request;
    },
    onSuccess: () => {
      toast({
        title: 'Request Submitted',
        description: 'Your training request has been submitted for approval. Your manager will be notified.',
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

            {/* Step 2: Session Selection */}
            {currentStep === 'session' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Select a Session (Optional)</h2>
                <p className="text-muted-foreground">
                  Choose a preferred session or leave blank for any available session.
                </p>

                <RadioGroup value={selectedSession || ''} onValueChange={setSelectedSession}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                      <RadioGroupItem value="" id="any" />
                      <Label htmlFor="any" className="flex-1 cursor-pointer">
                        <span className="font-medium">Any Available Session</span>
                        <p className="text-sm text-muted-foreground">
                          L&D will assign you to an appropriate session
                        </p>
                      </Label>
                    </div>

                    {sessions?.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center space-x-3 p-4 bg-muted rounded-lg"
                      >
                        <RadioGroupItem value={session.id} id={session.id} />
                        <Label htmlFor={session.id} className="flex-1 cursor-pointer">
                          <span className="font-medium">
                            {format(new Date(session.start_date), 'MMMM dd, yyyy')} -{' '}
                            {format(new Date(session.end_date), 'MMMM dd, yyyy')}
                          </span>
                          <p className="text-sm text-muted-foreground">
                            {session.location_en || 'Location TBD'}
                            {session.instructor_name && ` • ${session.instructor_name}`}
                          </p>
                          {session.capacity && (
                            <Badge variant="outline" className="mt-1">
                              {(session.capacity || 0) - (session.enrolled_count || 0)} seats available
                            </Badge>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {(!sessions || sessions.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming sessions scheduled. Your request will be considered for future sessions.
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
                    <span className="text-sm text-muted-foreground">Session</span>
                    <p className="font-medium">
                      {selectedSession
                        ? sessions?.find((s) => s.id === selectedSession)
                          ? format(
                              new Date(
                                sessions.find((s) => s.id === selectedSession)!.start_date
                              ),
                              'MMMM dd, yyyy'
                            )
                          : 'Selected Session'
                        : 'Any Available Session'}
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
