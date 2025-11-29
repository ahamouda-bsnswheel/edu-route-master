import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';

export function CatalogueReports() {
  const { data: courses } = useQuery({
    queryKey: ['catalogue-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, category:course_categories(name_en)');
      if (error) throw error;
      return data;
    },
  });

  const byCategory = courses?.reduce((acc, c) => {
    const cat = c.category?.name_en || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const byMode = courses?.reduce((acc, c) => {
    const mode = c.delivery_mode || 'Unknown';
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const byLocation = courses?.reduce((acc, c) => {
    const loc = c.training_location === 'abroad' ? 'International' : 'Local';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byCategory).map(([cat, count]) => (
                <div key={cat} className="flex justify-between">
                  <span className="text-sm">{cat}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              By Delivery Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byMode).map(([mode, count]) => (
                <div key={mode} className="flex justify-between">
                  <span className="text-sm capitalize">{mode.replace('_', ' ')}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Local vs International
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byLocation).map(([loc, count]) => (
                <div key={loc} className="flex justify-between">
                  <span className="text-sm">{loc}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
