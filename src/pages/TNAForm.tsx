import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Send, AlertCircle, CheckCircle, RotateCcw, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTNAItems,
  useSaveTNAItem,
  useDeleteTNAItem,
  useSubmitTNA,
  useApproveTNA,
  type TNAItem,
  type TNASubmission,
} from '@/hooks/useTNA';
import { TNAItemCard } from '@/components/tna/TNAItemCard';
import { TNAItemForm } from '@/components/tna/TNAItemForm';
import { Skeleton } from '@/components/ui/skeleton';

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  draft: 'Draft',
  submitted: 'Submitted',
  returned: 'Returned for Review',
  approved: 'Approved',
  locked: 'Locked',
};

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  locked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function TNAForm() {
  const { id: submissionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TNAItem | null>(null);

  // Fetch submission details
  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: ['tna-submission', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      
      const { data, error } = await supabase
        .from('tna_submissions')
        .select(`
          *,
          period:tna_periods(*)
        `)
        .eq('id', submissionId)
        .single();
      
      if (error) throw error;
      return data as TNASubmission & { period: any };
    },
    enabled: !!submissionId,
  });

  // Fetch employee profile
  const { data: employee } = useQuery({
    queryKey: ['employee-profile', submission?.employee_id],
    queryFn: async () => {
      if (!submission?.employee_id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, employee_id, job_title_en, department_id')
        .eq('id', submission.employee_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!submission?.employee_id,
  });

  const { data: items = [], isLoading: itemsLoading } = useTNAItems(submissionId || null);

  const saveItem = useSaveTNAItem();
  const deleteItem = useDeleteTNAItem();
  const submitTNA = useSubmitTNA();
  const approveTNA = useApproveTNA();

  // Determine permissions
  const isOwner = submission?.employee_id === user?.id;
  const isManager = hasRole('manager');
  const isLAndD = hasRole('l_and_d') || hasRole('admin');
  const canEdit = (isOwner || isManager || isLAndD) && 
    (submission?.status === 'draft' || submission?.status === 'returned');
  const canSubmit = (isOwner || isManager) && submission?.status === 'draft' && items.length > 0;
  const canApprove = isLAndD && submission?.status === 'submitted';

  const handleSaveItem = async (item: Partial<TNAItem> & { submission_id: string }) => {
    await saveItem.mutateAsync(item);
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!submissionId) return;
    await deleteItem.mutateAsync({ itemId, submissionId });
  };

  const handleSubmitTNA = async () => {
    if (!submissionId) return;
    await submitTNA.mutateAsync(submissionId);
  };

  const handleApprove = async () => {
    if (!submissionId) return;
    await approveTNA.mutateAsync({ submissionId, action: 'approve' });
  };

  const handleReturn = async () => {
    if (!submissionId) return;
    const comments = window.prompt('Enter comments for return:');
    if (comments !== null) {
      await approveTNA.mutateAsync({ submissionId, action: 'return', comments });
    }
  };

  const handleLock = async () => {
    if (!submissionId) return;
    await approveTNA.mutateAsync({ submissionId, action: 'lock' });
  };

  const handleEditItem = (item: TNAItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  if (submissionLoading) {
    return (
      <DashboardLayout title="Loading..." description="">
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }

  if (!submission) {
    return (
      <DashboardLayout title="TNA Not Found" description="">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The requested TNA submission could not be found.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="TNA Form" 
      description={`Training Needs Analysis - ${submission.period?.name || 'Unknown Period'}`}
    >
      <div className="space-y-6">
        {/* Back button and status */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge className={statusColors[submission.status]}>
            {statusLabels[submission.status]}
          </Badge>
        </div>

        {/* Return comments alert */}
        {submission.status === 'returned' && submission.return_comments && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Returned for Review:</strong> {submission.return_comments}
            </AlertDescription>
          </Alert>
        )}

        {/* Employee Info Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Employee</p>
                <p className="font-medium">
                  {employee?.first_name_en} {employee?.last_name_en}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Employee ID</p>
                <p className="font-medium">{employee?.employee_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Position</p>
                <p className="font-medium">{employee?.job_title_en || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Planning Period</p>
                <p className="font-medium">{submission.period?.name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training Needs List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Training Needs</CardTitle>
              <CardDescription>
                {items.length} training {items.length === 1 ? 'need' : 'needs'} identified
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Need
                </Button>
              )}
              {canSubmit && (
                <Button onClick={handleSubmitTNA} disabled={submitTNA.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitTNA.isPending ? 'Submitting...' : 'Submit'}
                </Button>
              )}
              {canApprove && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleReturn}
                    disabled={approveTNA.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Return
                  </Button>
                  <Button 
                    onClick={handleApprove}
                    disabled={approveTNA.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
              {isLAndD && submission.status === 'approved' && (
                <Button 
                  variant="secondary"
                  onClick={handleLock}
                  disabled={approveTNA.isPending}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No training needs added yet.</p>
                {canEdit && (
                  <Button variant="link" onClick={handleAddNew}>
                    Add the first training need
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <TNAItemCard
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    onEdit={() => handleEditItem(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item Form Dialog */}
        {submissionId && (
          <TNAItemForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            item={editingItem}
            submissionId={submissionId}
            onSave={handleSaveItem}
            isSaving={saveItem.isPending}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
