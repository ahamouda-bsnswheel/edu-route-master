import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Sparkles, Check, X, RefreshCw, Info, AlertCircle, 
  Tag, Target, Briefcase, BarChart3, Globe, Monitor, Loader2 
} from 'lucide-react';

interface AITaggingPanelProps {
  courseId: string;
  readOnly?: boolean;
}

type TagType = 'topic' | 'category' | 'competency' | 'job_role' | 'difficulty' | 'language' | 'modality';
type ConfidenceLevel = 'high' | 'medium' | 'low';

const tagTypeConfig: Record<TagType, { label: string; icon: any; color: string }> = {
  topic: { label: 'Topics', icon: Tag, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  category: { label: 'Categories', icon: Target, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  competency: { label: 'Competencies', icon: BarChart3, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  job_role: { label: 'Job Roles', icon: Briefcase, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  difficulty: { label: 'Difficulty', icon: BarChart3, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  language: { label: 'Languages', icon: Globe, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  modality: { label: 'Modality', icon: Monitor, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
};

const confidenceColors: Record<ConfidenceLevel, string> = {
  high: 'border-green-500',
  medium: 'border-yellow-500',
  low: 'border-red-500',
};

export function AITaggingPanel({ courseId, readOnly = false }: AITaggingPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch approved tags
  const { data: approvedTags, isLoading: loadingApproved } = useQuery({
    queryKey: ['course-tags', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_tags')
        .select('*')
        .eq('course_id', courseId)
        .order('tag_type');
      if (error) throw error;
      return data;
    },
  });

  // Fetch AI suggestions
  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['ai-tag-suggestions', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tag_suggestions')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Generate tags mutation
  const generateTagsMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-course-tags', {
        body: { courseId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-tag-suggestions', courseId] });
      toast.success(`Generated ${data.suggestions_count} tag suggestions`);
    },
    onError: (error: any) => {
      console.error('Tag generation error:', error);
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('AI service rate limited. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('AI credits exhausted. Please add credits to continue.');
      } else {
        toast.error('Failed to generate tags. Please try again.');
      }
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  // Accept tag mutation
  const acceptTagMutation = useMutation({
    mutationFn: async (suggestion: any) => {
      // Add to approved tags
      const { error: insertError } = await supabase
        .from('course_tags')
        .insert({
          course_id: courseId,
          tag_type: suggestion.tag_type,
          tag_value: suggestion.tag_value,
          is_ai_generated: true,
          original_confidence: suggestion.confidence_score,
          added_by: user?.id,
        });
      if (insertError && !insertError.message.includes('duplicate')) throw insertError;

      // Update suggestion status
      await supabase
        .from('ai_tag_suggestions')
        .update({ status: 'accepted', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', suggestion.id);

      // Log feedback
      await supabase.from('ai_tag_feedback').insert({
        suggestion_id: suggestion.id,
        course_id: courseId,
        tag_type: suggestion.tag_type,
        tag_value: suggestion.tag_value,
        confidence_score: suggestion.confidence_score,
        action: 'accepted',
        model_version: suggestion.model_version,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-tags', courseId] });
      queryClient.invalidateQueries({ queryKey: ['ai-tag-suggestions', courseId] });
      toast.success('Tag accepted');
    },
    onError: () => toast.error('Failed to accept tag'),
  });

  // Reject tag mutation
  const rejectTagMutation = useMutation({
    mutationFn: async (suggestion: any) => {
      await supabase
        .from('ai_tag_suggestions')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', suggestion.id);

      await supabase.from('ai_tag_feedback').insert({
        suggestion_id: suggestion.id,
        course_id: courseId,
        tag_type: suggestion.tag_type,
        tag_value: suggestion.tag_value,
        confidence_score: suggestion.confidence_score,
        action: 'rejected',
        model_version: suggestion.model_version,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tag-suggestions', courseId] });
      toast.success('Tag rejected');
    },
    onError: () => toast.error('Failed to reject tag'),
  });

  // Remove approved tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tag: any) => {
      await supabase.from('course_tags').delete().eq('id', tag.id);
      await supabase.from('ai_tagging_audit_log').insert({
        action: 'tag_removed',
        entity_type: 'tag',
        entity_id: tag.id,
        old_value: { tag_type: tag.tag_type, tag_value: tag.tag_value },
        actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-tags', courseId] });
      toast.success('Tag removed');
    },
    onError: () => toast.error('Failed to remove tag'),
  });

  // Bulk actions
  const acceptAllHighConfidence = () => {
    const highConfidenceTags = suggestions?.filter(s => s.confidence_level === 'high') || [];
    highConfidenceTags.forEach(tag => acceptTagMutation.mutate(tag));
  };

  const rejectAllLowConfidence = () => {
    const lowConfidenceTags = suggestions?.filter(s => s.confidence_level === 'low') || [];
    lowConfidenceTags.forEach(tag => rejectTagMutation.mutate(tag));
  };

  // Group tags by type
  const groupedApproved = (approvedTags || []).reduce((acc, tag) => {
    const type = tag.tag_type as TagType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(tag);
    return acc;
  }, {} as Record<TagType, any[]>);

  const groupedSuggestions = (suggestions || []).reduce((acc, tag) => {
    const type = tag.tag_type as TagType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(tag);
    return acc;
  }, {} as Record<TagType, any[]>);

  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Tags & Metadata
              </CardTitle>
              <CardDescription>
                AI-suggested and approved tags for this course
              </CardDescription>
            </div>
            {!readOnly && (
              <Button 
                onClick={() => generateTagsMutation.mutate()} 
                disabled={isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate AI Tags
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Approved Tags Section */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Approved Tags
            </h4>
            {loadingApproved ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : Object.keys(groupedApproved).length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved tags yet</p>
            ) : (
              <div className="space-y-3">
                {(Object.keys(tagTypeConfig) as TagType[]).map(type => {
                  const tags = groupedApproved[type];
                  if (!tags || tags.length === 0) return null;
                  const config = tagTypeConfig[type];
                  const Icon = config.icon;
                  return (
                    <div key={type} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground w-24 flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}:
                      </span>
                      {tags.map((tag: any) => (
                        <Badge 
                          key={tag.id} 
                          variant="secondary" 
                          className={`${config.color} gap-1`}
                        >
                          {tag.tag_value}
                          {tag.is_ai_generated && (
                            <Sparkles className="h-3 w-3 opacity-50" />
                          )}
                          {!readOnly && (
                            <button
                              onClick={() => removeTagMutation.mutate(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {hasSuggestions && (
            <>
              <Separator />

              {/* AI Suggestions Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Suggestions
                    <Badge variant="outline" className="ml-2">
                      {suggestions.length} pending
                    </Badge>
                  </h4>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={acceptAllHighConfidence}
                        disabled={!suggestions.some(s => s.confidence_level === 'high')}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept High
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={rejectAllLowConfidence}
                        disabled={!suggestions.some(s => s.confidence_level === 'low')}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject Low
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {(Object.keys(tagTypeConfig) as TagType[]).map(type => {
                    const tags = groupedSuggestions[type];
                    if (!tags || tags.length === 0) return null;
                    const config = tagTypeConfig[type];
                    const Icon = config.icon;
                    return (
                      <div key={type} className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 flex items-center gap-1">
                          <Icon className="h-3 w-3" />
                          {config.label}:
                        </span>
                        {tags.map((tag: any) => (
                          <Popover key={tag.id}>
                            <PopoverTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={`cursor-pointer border-2 ${confidenceColors[tag.confidence_level as ConfidenceLevel]} hover:bg-muted gap-1`}
                              >
                                {tag.tag_value}
                                <Info className="h-3 w-3 opacity-50" />
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-3">
                                <div>
                                  <p className="font-medium">{tag.tag_value}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {tag.tag_type.replace('_', ' ')} • {tag.confidence_level} confidence ({Math.round(tag.confidence_score * 100)}%)
                                  </p>
                                </div>
                                {tag.explanation && (
                                  <div>
                                    <p className="text-sm font-medium">Why this tag?</p>
                                    <p className="text-sm text-muted-foreground">{tag.explanation}</p>
                                  </div>
                                )}
                                {tag.source_snippet && (
                                  <div>
                                    <p className="text-sm font-medium">Source</p>
                                    <p className="text-sm text-muted-foreground italic">"{tag.source_snippet}"</p>
                                  </div>
                                )}
                                {!readOnly && (
                                  <div className="flex gap-2 pt-2">
                                    <Button 
                                      size="sm" 
                                      className="flex-1"
                                      onClick={() => acceptTagMutation.mutate(tag)}
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      Accept
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="flex-1"
                                      onClick={() => rejectTagMutation.mutate(tag)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!hasSuggestions && !loadingSuggestions && (
            <div className="text-center py-4 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No AI suggestions yet</p>
              <p className="text-xs">Click "Generate AI Tags" to analyze this course</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
