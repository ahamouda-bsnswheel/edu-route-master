import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Target, Search } from 'lucide-react';
import { useState } from 'react';

interface CompetencySelectorProps {
  selectedCompetencies: string[];
  onSelectionChange: (competencies: string[]) => void;
}

export function CompetencySelector({ selectedCompetencies, onSelectionChange }: CompetencySelectorProps) {
  const [search, setSearch] = useState('');

  const { data: competencies } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competencies')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const filteredCompetencies = competencies?.filter(c =>
    c.name_en?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCompetency = (id: string) => {
    if (selectedCompetencies.includes(id)) {
      onSelectionChange(selectedCompetencies.filter(c => c !== id));
    } else {
      onSelectionChange([...selectedCompetencies, id]);
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Competency Mapping
        </CardTitle>
        <CardDescription>
          Link this course to competencies from the library
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search competencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {selectedCompetencies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {competencies?.filter(c => selectedCompetencies.includes(c.id)).map(c => (
              <Badge key={c.id} variant="secondary" className="gap-1">
                {c.name_en}
              </Badge>
            ))}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredCompetencies?.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
              onClick={() => toggleCompetency(comp.id)}
            >
              <Checkbox checked={selectedCompetencies.includes(comp.id)} />
              <div className="flex-1">
                <p className="font-medium text-sm">{comp.name_en}</p>
                <p className="text-xs text-muted-foreground">{comp.category} • {comp.code}</p>
              </div>
            </div>
          ))}
          {(!filteredCompetencies || filteredCompetencies.length === 0) && (
            <p className="text-muted-foreground text-center py-4">No competencies found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
