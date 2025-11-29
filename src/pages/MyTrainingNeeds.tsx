import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Send, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useActiveTNAPeriods,
  useMyTNASubmission,
  useTNAItems,
  useCreateTNASubmission,
  useSaveTNAItem,
  useDeleteTNAItem,
  useSubmitTNA,
  type TNAItem,
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

export default function MyTrainingNeeds() {
  const { profile } = useAuth();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TNAItem | null>(null);

  const { data: periods = [], isLoading: periodsLoading } = useActiveTNAPeriods();
  const { data: submission, isLoading: submissionLoading } = useMyTNASubmission(selectedPeriodId);
  const { data: items = [], isLoading: itemsLoading } = useTNAItems(submission?.id || null);

  const createSubmission = useCreateTNASubmission();
  const saveItem = useSaveTNAItem();
  const deleteItem = useDeleteTNAItem();
  const submitTNA = useSubmitTNA();

  // Auto-select first period
  useState(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0].id);
    }
  });

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
  const canEdit = submission?.status === 'draft' || submission?.status === 'returned';
  const canSubmit = submission?.status === 'draft' && items.length > 0;

  const handleStartTNA = async () => {
    if (!selectedPeriodId || !profile?.id) return;
    await createSubmission.mutateAsync({
      periodId: selectedPeriodId,
      employeeId: profile.id,
    });
  };

  const handleSaveItem = async (item: Partial<TNAItem> & { submission_id: string }) => {
    await saveItem.mutateAsync(item);
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!submission?.id) return;
    await deleteItem.mutateAsync({ itemId, submissionId: submission.id });
  };

  const handleSubmitTNA = async () => {
    if (!submission?.id) return;
    await submitTNA.mutateAsync(submission.id);
  };

  const handleEditItem = (item: TNAItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  return (
    <DashboardLayout title="My Training Needs" description="Submit your training needs for the planning period">
      <div className="space-y-6">
        {/* Period Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Training Needs Analysis
            </CardTitle>
            <CardDescription>
              Select a planning period to view or submit your training needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {periodsLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : periods.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active TNA periods available. Please check back later or contact L&D.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center gap-4">
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select planning period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {submission && (
                  <Badge className={statusColors[submission.status]}>
                    {statusLabels[submission.status]}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission Content */}
        {selectedPeriodId && !submissionLoading && (
          <>
            {/* Return comments alert */}
            {submission?.status === 'returned' && submission.return_comments && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Returned for Review:</strong> {submission.return_comments}
                </AlertDescription>
              </Alert>
            )}

            {/* Employee Info Header */}
            {selectedPeriod && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employee</p>
                      <p className="font-medium">{profile?.first_name_en} {profile?.last_name_en}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Employee ID</p>
                      <p className="font-medium">{profile?.employee_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Position</p>
                      <p className="font-medium">{profile?.job_title_en || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Planning Period</p>
                      <p className="font-medium">{selectedPeriod.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Submission Yet */}
            {!submission && selectedPeriod?.allow_employee_submission && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No TNA Started</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your training needs analysis for {selectedPeriod.name}
                  </p>
                  <Button onClick={handleStartTNA} disabled={createSubmission.isPending}>
                    {createSubmission.isPending ? 'Starting...' : 'Start TNA Form'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!submission && !selectedPeriod?.allow_employee_submission && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Employee Self-Submission Disabled</h3>
                  <p className="text-muted-foreground">
                    Your manager will submit training needs on your behalf for this period.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Training Needs List */}
            {submission && (
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
                        {submitTNA.isPending ? 'Submitting...' : 'Submit for Approval'}
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
                          Add your first training need
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
            )}
          </>
        )}

        {/* Item Form Dialog */}
        {submission && (
          <TNAItemForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            item={editingItem}
            submissionId={submission.id}
            onSave={handleSaveItem}
            isSaving={saveItem.isPending}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
