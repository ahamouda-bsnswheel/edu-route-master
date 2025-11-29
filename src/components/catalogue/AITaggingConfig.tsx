import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, Save, Sparkles, Tag, Target, Briefcase, BarChart3, Globe, Monitor } from 'lucide-react';

type TagType = 'topic' | 'category' | 'competency' | 'job_role' | 'difficulty' | 'language' | 'modality';

const tagTypeLabels: Record<TagType, { label: string; icon: any; description: string }> = {
  topic: { label: 'Topics/Keywords', icon: Tag, description: 'Subject matter keywords' },
  category: { label: 'Categories', icon: Target, description: 'Training categories (HSE, Technical, etc.)' },
  competency: { label: 'Competencies', icon: BarChart3, description: 'Skills and competencies' },
  job_role: { label: 'Job Roles', icon: Briefcase, description: 'Target job roles/families' },
  difficulty: { label: 'Difficulty', icon: BarChart3, description: 'Course difficulty level' },
  language: { label: 'Languages', icon: Globe, description: 'Delivery languages' },
  modality: { label: 'Modality', icon: Monitor, description: 'Delivery modality' },
};

export function AITaggingConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    is_enabled: true,
    use_controlled_vocabulary: false,
    high_confidence_threshold: 0.8,
    medium_confidence_threshold: 0.5,
    max_suggestions: 10,
  });

  // Fetch configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['ai-tagging-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tagging_config')
        .select('*')
        .order('tag_type');
      if (error) throw error;
      return data;
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('ai_tagging_config')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', editingConfig.id);
      if (error) throw error;

      // Log the change
      await supabase.from('ai_tagging_audit_log').insert({
        action: 'config_updated',
        entity_type: 'config',
        entity_id: editingConfig.id,
        old_value: editingConfig,
        new_value: { ...editingConfig, ...updates },
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tagging-config'] });
      setEditingConfig(null);
      toast.success('Configuration updated');
    },
    onError: () => toast.error('Failed to update configuration'),
  });

  const openEditDialog = (configItem: any) => {
    setEditingConfig(configItem);
    setEditForm({
      is_enabled: configItem.is_enabled,
      use_controlled_vocabulary: configItem.use_controlled_vocabulary,
      high_confidence_threshold: configItem.high_confidence_threshold,
      medium_confidence_threshold: configItem.medium_confidence_threshold,
      max_suggestions: configItem.max_suggestions,
    });
  };

  const handleSave = () => {
    updateConfigMutation.mutate(editForm);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Tagging Configuration
          </CardTitle>
          <CardDescription>
            Configure tag types, confidence thresholds, and suggestion limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading configuration...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vocabulary</TableHead>
                  <TableHead>High Threshold</TableHead>
                  <TableHead>Medium Threshold</TableHead>
                  <TableHead>Max Suggestions</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config?.map((item) => {
                  const tagType = item.tag_type as TagType;
                  const typeInfo = tagTypeLabels[tagType];
                  const Icon = typeInfo?.icon || Tag;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{typeInfo?.label || item.tag_type}</p>
                            <p className="text-xs text-muted-foreground">{typeInfo?.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_enabled ? 'default' : 'secondary'}>
                          {item.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.use_controlled_vocabulary ? (
                          <Badge variant="outline">{item.vocabulary_source || 'Controlled'}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Free text</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">≥ {(item.high_confidence_threshold * 100).toFixed(0)}%</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-600 font-medium">≥ {(item.medium_confidence_threshold * 100).toFixed(0)}%</span>
                      </TableCell>
                      <TableCell>{item.max_suggestions}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Edit {tagTypeLabels[editingConfig?.tag_type as TagType]?.label || 'Tag'} Configuration
            </DialogTitle>
            <DialogDescription>
              Configure how AI generates suggestions for this tag type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_enabled">Enable AI suggestions</Label>
              <Switch
                id="is_enabled"
                checked={editForm.is_enabled}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_enabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="use_controlled_vocabulary">Use controlled vocabulary</Label>
              <Switch
                id="use_controlled_vocabulary"
                checked={editForm.use_controlled_vocabulary}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, use_controlled_vocabulary: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="high_threshold">High confidence threshold (%)</Label>
              <Input
                id="high_threshold"
                type="number"
                min="0"
                max="100"
                value={Math.round(editForm.high_confidence_threshold * 100)}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  high_confidence_threshold: Number(e.target.value) / 100 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medium_threshold">Medium confidence threshold (%)</Label>
              <Input
                id="medium_threshold"
                type="number"
                min="0"
                max="100"
                value={Math.round(editForm.medium_confidence_threshold * 100)}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  medium_confidence_threshold: Number(e.target.value) / 100 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_suggestions">Maximum suggestions</Label>
              <Input
                id="max_suggestions"
                type="number"
                min="1"
                max="50"
                value={editForm.max_suggestions}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  max_suggestions: Number(e.target.value) 
                }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateConfigMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
