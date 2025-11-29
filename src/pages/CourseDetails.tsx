import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  Calendar,
  Building,
  Monitor,
  Globe,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CourseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          category:course_categories(name_en, name_ar, description_en),
          provider:training_providers(name_en, name_ar, city, country, website)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['course-sessions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('course_id', id)
        .eq('status', 'scheduled')
        .gte('start_date', new Date().toISOString())
        .order('start_date');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
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
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/courses')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Button>

        {/* Course Header */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <Card className="card-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{course.name_en}</CardTitle>
                    {course.name_ar && (
                      <CardDescription className="text-lg mt-1" dir="rtl">
                        {course.name_ar}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {course.is_mandatory && (
                      <Badge variant="destructive">Mandatory</Badge>
                    )}
                    {course.code && (
                      <Badge variant="outline">{course.code}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">
                    {course.description_en || 'No description available'}
                  </p>
                </div>

                <Separator />

                {/* Course Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {course.duration_days} days
                        {course.duration_hours && ` (${course.duration_hours}h)`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {course.delivery_mode === 'online' ? (
                      <Monitor className="h-5 w-5 text-primary" />
                    ) : (
                      <Building className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery</p>
                      <p className="font-medium capitalize">
                        {course.delivery_mode.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {course.training_location === 'abroad' ? (
                      <Globe className="h-5 w-5 text-primary" />
                    ) : (
                      <MapPin className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium capitalize">
                        {course.training_location || 'Local'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity</p>
                      <p className="font-medium">
                        {course.min_participants || 1}-{course.max_participants || 'Unlimited'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prerequisites */}
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Prerequisites
                      </h3>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {course.prerequisites.map((prereq, i) => (
                          <li key={i}>{prereq}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Target Grades */}
                {course.target_grades && course.target_grades.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Target Grades</h3>
                      <div className="flex flex-wrap gap-2">
                        {course.target_grades.map((grade) => (
                          <Badge key={grade} variant="secondary">
                            {grade}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Provider */}
                {course.provider && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Training Provider</h3>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="font-medium">{course.provider.name_en}</p>
                        {course.provider.city && (
                          <p className="text-sm text-muted-foreground">
                            {course.provider.city}, {course.provider.country}
                          </p>
                        )}
                        {course.provider.website && (
                          <a
                            href={course.provider.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Visit Website
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Sessions & Actions */}
          <div className="lg:w-80 space-y-4">
            {/* Request Training Card */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Request Training</CardTitle>
                <CardDescription>
                  Submit a request for this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/request/${course.id}`)}
                >
                  Create Request
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Sessions */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions && sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className="p-3 bg-muted rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {format(new Date(session.start_date), 'MMM dd, yyyy')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {session.capacity && session.enrolled_count !== null
                              ? `${session.capacity - session.enrolled_count} seats`
                              : 'Open'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {session.location_en || 'TBD'}
                        </p>
                        {session.instructor_name && (
                          <p className="text-xs text-muted-foreground">
                            Instructor: {session.instructor_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming sessions scheduled
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
