import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TNAItem } from '@/hooks/useTNA';

interface TNAItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: TNAItem | null;
  submissionId: string;
  onSave: (item: Partial<TNAItem> & { submission_id: string }) => void;
  isSaving?: boolean;
}

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const currentYear = new Date().getFullYear();
const quarterOptions = [
  ...quarters.map(q => `${q} ${currentYear}`),
  ...quarters.map(q => `${q} ${currentYear + 1}`),
];

export function TNAItemForm({ open, onOpenChange, item, submissionId, onSave, isSaving }: TNAItemFormProps) {
  const [formData, setFormData] = useState({
    competency_id: '',
    competency_text: '',
    training_type: 'short_term',
    training_location: 'local',
    course_id: '',
    course_text: '',
    justification: '',
    priority: 'medium',
    target_quarter: '',
    estimated_cost: '',
    cost_currency: 'LYD',
  });

  // Fetch competencies
  const { data: competencies = [] } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competencies')
        .select('id, name_en, code')
        .eq('is_active', true)
        .order('name_en');
      if (error) throw error;
      return data;
    },
  });

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-catalogue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name_en, code, cost_amount')
        .eq('is_active', true)
        .order('name_en');
      if (error) throw error;
      return data;
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        competency_id: item.competency_id || '',
        competency_text: item.competency_text || '',
        training_type: item.training_type || 'short_term',
        training_location: item.training_location || 'local',
        course_id: item.course_id || '',
        course_text: item.course_text || '',
        justification: item.justification || '',
        priority: item.priority || 'medium',
        target_quarter: item.target_quarter || '',
        estimated_cost: item.estimated_cost?.toString() || '',
        cost_currency: item.cost_currency || 'LYD',
      });
    } else {
      setFormData({
        competency_id: '',
        competency_text: '',
        training_type: 'short_term',
        training_location: 'local',
        course_id: '',
        course_text: '',
        justification: '',
        priority: 'medium',
        target_quarter: '',
        estimated_cost: '',
        cost_currency: 'LYD',
      });
    }
  }, [item, open]);

  // Auto-populate cost when course is selected
  useEffect(() => {
    if (formData.course_id) {
      const selectedCourse = courses.find(c => c.id === formData.course_id);
      if (selectedCourse?.cost_amount) {
        setFormData(prev => ({
          ...prev,
          estimated_cost: selectedCourse.cost_amount.toString(),
        }));
      }
    }
  }, [formData.course_id, courses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      ...(item?.id && { id: item.id }),
      submission_id: submissionId,
      competency_id: formData.competency_id || null,
      competency_text: formData.competency_text || null,
      training_type: formData.training_type as 'short_term' | 'long_term',
      training_location: formData.training_location as 'local' | 'abroad',
      course_id: formData.course_id || null,
      course_text: formData.course_text || null,
      justification: formData.justification || null,
      priority: formData.priority as 'high' | 'medium' | 'low',
      target_quarter: formData.target_quarter || null,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      cost_currency: formData.cost_currency,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Training Need' : 'Add Training Need'}</DialogTitle>
          <DialogDescription>
            Fill in the details of the training need
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Competency */}
          <div className="space-y-2">
            <Label>Competency / Skill / Topic</Label>
            <Select
              value={formData.competency_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, competency_id: value, competency_text: '' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select from competency framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- Custom text --</SelectItem>
                {competencies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.competency_id && (
              <Input
                placeholder="Or enter custom competency/topic"
                value={formData.competency_text}
                onChange={(e) => setFormData(prev => ({ ...prev, competency_text: e.target.value }))}
              />
            )}
          </div>

          {/* Type and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Training Type</Label>
              <Select
                value={formData.training_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, training_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_term">Short-term</SelectItem>
                  <SelectItem value="long_term">Long-term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={formData.training_location}
                onValueChange={(value) => setFormData(prev => ({ ...prev, training_location: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="abroad">Abroad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Course */}
          <div className="space-y-2">
            <Label>Suggested Course / Program</Label>
            <Select
              value={formData.course_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, course_id: value, course_text: '' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select from course catalogue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- Custom text --</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code ? `${c.code} - ` : ''}{c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.course_id && (
              <Input
                placeholder="Or enter custom course/program name"
                value={formData.course_text}
                onChange={(e) => setFormData(prev => ({ ...prev, course_text: e.target.value }))}
              />
            )}
          </div>

          {/* Priority and Target */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Completion</Label>
              <Select
                value={formData.target_quarter}
                onValueChange={(value) => setFormData(prev => ({ ...prev, target_quarter: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estimated Cost (optional)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.estimated_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={formData.cost_currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cost_currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LYD">LYD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label>Justification / Business Need</Label>
            <Textarea
              placeholder="Explain why this training is needed and how it aligns with business objectives..."
              value={formData.justification}
              onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : item ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
