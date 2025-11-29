import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Building2, Check, ChevronsUpDown, Info, Globe, MapPin, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderSelectorProps {
  value: string | null;
  onChange: (providerId: string | null) => void;
  className?: string;
}

export function ProviderSelector({ value, onChange, className }: ProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch active providers
  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_providers')
        .select('*')
        .eq('provider_status', 'active')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  // Filter providers by search
  const filteredProviders = providers?.filter(provider => {
    const searchLower = search.toLowerCase();
    return (
      provider.name_en?.toLowerCase().includes(searchLower) ||
      provider.name_ar?.toLowerCase().includes(searchLower) ||
      provider.country?.toLowerCase().includes(searchLower) ||
      ((provider.categories as string[]) || []).some(c => c.toLowerCase().includes(searchLower))
    );
  }) || [];

  // Get selected provider
  const selectedProvider = providers?.find(p => p.id === value);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedProvider ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {selectedProvider.name_en}
                {selectedProvider.is_local ? (
                  <Badge variant="outline" className="text-xs">Local</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Int'l</Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Select provider...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search providers..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Loading...' : 'No provider found.'}
              </CommandEmpty>
              <CommandGroup>
                {filteredProviders.map((provider) => (
                  <CommandItem
                    key={provider.id}
                    value={provider.id}
                    onSelect={() => {
                      onChange(provider.id === value ? null : provider.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === provider.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name_en}</span>
                        {provider.is_local ? (
                          <Badge variant="outline" className="text-xs">Local</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Int'l</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {provider.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {provider.country}
                          </span>
                        )}
                        {((provider.categories as string[]) || []).slice(0, 2).map(cat => (
                          <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Info hover card */}
      {selectedProvider && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-4 w-4" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">{selectedProvider.name_en}</h4>
                {selectedProvider.name_ar && (
                  <p className="text-sm text-muted-foreground">{selectedProvider.name_ar}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {selectedProvider.is_local ? (
                  <Badge variant="default">Local (Libya)</Badge>
                ) : (
                  <Badge variant="secondary">International</Badge>
                )}
              </div>
              {selectedProvider.country && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedProvider.country}</span>
                  {selectedProvider.city && <span>• {selectedProvider.city}</span>}
                </div>
              )}
              {((selectedProvider.categories as string[]) || []).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {((selectedProvider.categories as string[]) || []).map(cat => (
                      <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedProvider.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedProvider.contact_email}</span>
                </div>
              )}
              {selectedProvider.internal_rating && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Rating: </span>
                  <span className="font-medium">{selectedProvider.internal_rating}/5</span>
                </div>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
}
