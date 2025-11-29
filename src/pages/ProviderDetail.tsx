import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Edit, Building2, Globe, MapPin, Mail, Phone, 
  User, FileText, CreditCard, History, CheckCircle, XCircle, 
  Clock, AlertTriangle, Lock, ExternalLink, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ProviderStatus = 'draft' | 'pending_approval' | 'active' | 'inactive' | 'blocked';

const statusConfig: Record<ProviderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Edit },
  pending_approval: { label: 'Pending Approval', variant: 'outline', icon: Clock },
  active: { label: 'Active', variant: 'default', icon: CheckCircle },
  inactive: { label: 'Inactive', variant: 'secondary', icon: XCircle },
  blocked: { label: 'Blocked', variant: 'destructive', icon: AlertTriangle },
};

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasRole('l_and_d') || hasRole('admin');
  const canViewFinancial = hasRole('admin') || hasRole('chro');

  // Fetch provider
  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_providers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch contacts
  const { data: contacts } = useQuery({
    queryKey: ['provider-contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_contacts')
        .select('*')
        .eq('provider_id', id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch contracts
  const { data: contracts } = useQuery({
    queryKey: ['provider-contracts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_contracts')
        .select('*')
        .eq('provider_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id && canViewFinancial,
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['provider-audit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_audit_log')
        .select('*')
        .eq('provider_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!id && canManage,
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ newStatus, comment }: { newStatus: ProviderStatus; comment?: string }) => {
      const oldStatus = provider?.provider_status;
      
      // Update provider status
      const updateData: any = {
        provider_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'pending_approval') {
        updateData.submitted_at = new Date().toISOString();
        updateData.submitted_by = user?.id;
      } else if (newStatus === 'active') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }

      const { error } = await supabase
        .from('training_providers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Log status change
      await supabase.from('provider_audit_log').insert({
        provider_id: id,
        action: 'status_change',
        old_status: oldStatus as ProviderStatus,
        new_status: newStatus,
        actor_id: user?.id,
        comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', id] });
      queryClient.invalidateQueries({ queryKey: ['provider-audit', id] });
      toast.success('Provider status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status');
      console.error(error);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading provider...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!provider) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Provider not found</p>
          <Button onClick={() => navigate('/providers')}>Back to Providers</Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = (provider.provider_status || 'draft') as ProviderStatus;
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/providers')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{provider.name_en}</h1>
                <Badge variant={config.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
                {provider.is_local ? (
                  <Badge variant="outline">Local Provider</Badge>
                ) : (
                  <Badge variant="secondary">International</Badge>
                )}
              </div>
              {provider.name_ar && (
                <p className="text-lg text-muted-foreground">{provider.name_ar}</p>
              )}
              {provider.legal_name && provider.legal_name !== provider.name_en && (
                <p className="text-sm text-muted-foreground">Legal: {provider.legal_name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <>
                {status === 'draft' && (
                  <Button onClick={() => statusMutation.mutate({ newStatus: 'pending_approval' })}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </Button>
                )}
                {status === 'pending_approval' && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => statusMutation.mutate({ newStatus: 'draft', comment: 'Returned for revision' })}
                    >
                      Return for Revision
                    </Button>
                    <Button onClick={() => statusMutation.mutate({ newStatus: 'active' })}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Activate
                    </Button>
                  </>
                )}
                {status === 'active' && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => statusMutation.mutate({ newStatus: 'inactive', comment: 'Marked as inactive' })}
                    >
                      Mark Inactive
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => statusMutation.mutate({ newStatus: 'blocked', comment: 'Provider blocked' })}
                    >
                      Block Provider
                    </Button>
                  </>
                )}
                {(status === 'inactive' || status === 'blocked') && (
                  <Button onClick={() => statusMutation.mutate({ newStatus: 'active', comment: 'Reactivated' })}>
                    Reactivate
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate(`/providers/${id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            {canViewFinancial && (
              <TabsTrigger value="commercial">
                <Lock className="h-3 w-3 mr-1" />
                Commercial
              </TabsTrigger>
            )}
            {canManage && (
              <TabsTrigger value="history">History</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Provider Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Display Name</p>
                    <p className="font-medium">{provider.name_en}</p>
                  </div>
                  {provider.name_ar && (
                    <div>
                      <p className="text-sm text-muted-foreground">Arabic Name</p>
                      <p className="font-medium">{provider.name_ar}</p>
                    </div>
                  )}
                  {provider.legal_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Legal Name</p>
                      <p className="font-medium">{provider.legal_name}</p>
                    </div>
                  )}
                  {provider.vendor_code && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor Code</p>
                      <p className="font-medium">{provider.vendor_code}</p>
                    </div>
                  )}
                  {provider.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{provider.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{provider.country || 'Not specified'}</p>
                      {provider.city && (
                        <p className="text-sm text-muted-foreground">{provider.city}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Badge variant={provider.is_local ? 'default' : 'secondary'}>
                      {provider.is_local ? 'Local (Libya)' : 'International'}
                    </Badge>
                  </div>
                  {provider.website && (
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a 
                        href={provider.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {provider.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Contact */}
            {(provider.contact_email || provider.contact_phone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Quick Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6">
                    {provider.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${provider.contact_email}`} className="hover:underline">
                          {provider.contact_email}
                        </a>
                      </div>
                    )}
                    {provider.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${provider.contact_phone}`} className="hover:underline">
                          {provider.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Provider Contacts</CardTitle>
                <CardDescription>All contacts associated with this provider</CardDescription>
              </CardHeader>
              <CardContent>
                {!contacts || contacts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No contacts added yet</p>
                ) : (
                  <div className="grid gap-4">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.contact_name}</p>
                              {contact.is_primary && (
                                <Badge variant="default" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            {contact.contact_role && (
                              <p className="text-sm text-muted-foreground">{contact.contact_role}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                            </div>
                          )}
                        </div>
                        {contact.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{contact.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Capabilities Tab */}
          <TabsContent value="capabilities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Categories & Expertise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Training Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {((provider.categories as string[]) || []).length > 0 ? (
                      ((provider.categories as string[]) || []).map(cat => (
                        <Badge key={cat} variant="outline">{cat}</Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No categories specified</p>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Areas of Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {((provider.expertise_areas as string[]) || []).length > 0 ? (
                      ((provider.expertise_areas as string[]) || []).map(area => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No expertise areas specified</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Modes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {((provider.delivery_modes as string[]) || []).length > 0 ? (
                      ((provider.delivery_modes as string[]) || []).map(mode => (
                        <Badge key={mode} variant="outline">{mode}</Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No delivery modes specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {((provider.languages as string[]) || []).length > 0 ? (
                      ((provider.languages as string[]) || []).map(lang => (
                        <Badge key={lang} variant="outline">{lang}</Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No languages specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Commercial Tab (Restricted) */}
          {canViewFinancial && (
            <TabsContent value="commercial">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Contracts & Commercial Details
                  </CardTitle>
                  <CardDescription>Restricted access - visible to Finance and Admin only</CardDescription>
                </CardHeader>
                <CardContent>
                  {!contracts || contracts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No contracts on file</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contract Ref</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Payment Terms</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">{contract.contract_reference}</TableCell>
                            <TableCell>
                              {contract.contract_start_date 
                                ? format(new Date(contract.contract_start_date), 'MMM d, yyyy') 
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {contract.contract_end_date 
                                ? format(new Date(contract.contract_end_date), 'MMM d, yyyy') 
                                : '-'}
                            </TableCell>
                            <TableCell>{contract.payment_terms || '-'}</TableCell>
                            <TableCell>{contract.billing_currency}</TableCell>
                            <TableCell>
                              {contract.contract_value 
                                ? `${contract.contract_value.toLocaleString()} ${contract.billing_currency}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={contract.is_active ? 'default' : 'secondary'}>
                                {contract.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* History Tab */}
          {canManage && (
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Audit History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!auditLog || auditLog.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No audit history</p>
                  ) : (
                    <div className="space-y-4">
                      {auditLog.map((entry) => (
                        <div key={entry.id} className="border-l-2 border-muted pl-4 py-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">{entry.action.replace('_', ' ')}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at!), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {entry.old_status && entry.new_status && (
                            <p className="text-sm">
                              Status: <Badge variant="outline" className="mx-1">{entry.old_status}</Badge>
                              → <Badge variant="outline" className="mx-1">{entry.new_status}</Badge>
                            </p>
                          )}
                          {entry.field_changed && (
                            <p className="text-sm text-muted-foreground">
                              Changed: {entry.field_changed}
                            </p>
                          )}
                          {entry.comment && (
                            <p className="text-sm text-muted-foreground italic">"{entry.comment}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
