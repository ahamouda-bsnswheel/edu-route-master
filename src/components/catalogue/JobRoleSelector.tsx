import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Search } from 'lucide-react';
import { useState } from 'react';

interface JobRoleSelectorProps {
  selectedRoles: string[];
  onSelectionChange: (roles: string[]) => void;
}

export function JobRoleSelector({ selectedRoles, onSelectionChange }: JobRoleSelectorProps) {
  const [search, setSearch] = useState('');

  const { data: jobRoles } = useQuery({
    queryKey: ['job-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_roles')
        .select('*')
        .eq('is_active', true)
        .order('job_family', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const filteredRoles = jobRoles?.filter(r =>
    r.name_en?.toLowerCase().includes(search.toLowerCase()) ||
    r.code?.toLowerCase().includes(search.toLowerCase()) ||
    r.job_family?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = (id: string) => {
    if (selectedRoles.includes(id)) {
      onSelectionChange(selectedRoles.filter(r => r !== id));
    } else {
      onSelectionChange([...selectedRoles, id]);
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Job Role Mapping
        </CardTitle>
        <CardDescription>
          Link this course to target job roles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search job roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {selectedRoles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {jobRoles?.filter(r => selectedRoles.includes(r.id)).map(r => (
              <Badge key={r.id} variant="secondary" className="gap-1">
                {r.name_en}
              </Badge>
            ))}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredRoles?.map((role) => (
            <div
              key={role.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
              onClick={() => toggleRole(role.id)}
            >
              <Checkbox checked={selectedRoles.includes(role.id)} />
              <div className="flex-1">
                <p className="font-medium text-sm">{role.name_en}</p>
                <p className="text-xs text-muted-foreground">{role.job_family} • {role.code}</p>
              </div>
            </div>
          ))}
          {(!filteredRoles || filteredRoles.length === 0) && (
            <p className="text-muted-foreground text-center py-4">No job roles found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
