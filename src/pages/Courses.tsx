import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Monitor,
  Building,
  Briefcase,
  Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const deliveryModeIcons = {
  classroom: Building,
  online: Monitor,
  blended: Briefcase,
  on_the_job: Users,
};

const costLevelColors = {
  low: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-destructive/10 text-destructive',
};

export default function Courses() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const navigate = useNavigate();

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          category:course_categories(name_en, name_ar),
          provider:training_providers(name_en, name_ar)
        `)
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['course-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  const filteredCourses = courses?.filter((course) => {
    const matchesSearch =
      course.name_en.toLowerCase().includes(search.toLowerCase()) ||
      course.description_en?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category_id === categoryFilter;
    const matchesMode = modeFilter === 'all' || course.delivery_mode === modeFilter;

    return matchesSearch && matchesCategory && matchesMode;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Course Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Browse and request training courses
          </p>
        </div>

        {/* Filters */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Delivery Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="classroom">Classroom</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="blended">Blended</SelectItem>
                  <SelectItem value="on_the_job">On the Job</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {filteredCourses?.length || 0} courses found
        </div>

        {/* Course Grid */}
        {coursesLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="card-shadow">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses?.map((course) => {
              const DeliveryIcon = deliveryModeIcons[course.delivery_mode] || Monitor;

              return (
                <Card
                  key={course.id}
                  className="card-shadow hover:card-shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                          {course.name_en}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {course.category?.name_en || 'Uncategorized'}
                        </CardDescription>
                      </div>
                      {course.is_mandatory && (
                        <Badge variant="destructive" className="ml-2 shrink-0">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description_en || 'No description available'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1">
                        <DeliveryIcon className="h-3 w-3" />
                        {course.delivery_mode.replace('_', ' ')}
                      </Badge>
                      {course.duration_days && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {course.duration_days} days
                        </Badge>
                      )}
                      {course.training_location && (
                        <Badge variant="outline" className="gap-1">
                          {course.training_location === 'abroad' ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {course.training_location}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        {course.cost_level && (
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${costLevelColors[course.cost_level]}`}
                          >
                            {course.cost_level} cost
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="text-primary">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!coursesLoading && filteredCourses?.length === 0 && (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No courses found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
