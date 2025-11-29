import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Send, Plus, X, Building2, User, Globe, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const providerCategories = [
  'HSE', 'Technical', 'Leadership', 'Behavioural', 'IT', 'University', 
  'Language', 'Professional', 'Compliance', 'Soft Skills', 'Other'
];

const deliveryModes = ['Classroom (ILT)', 'Virtual (VILT)', 'E-Learning', 'Blended', 'On-the-Job'];
const languages = ['Arabic', 'English', 'French', 'Turkish', 'Italian', 'Spanish', 'Other'];
const expertiseAreas = [
  'Oil & Gas Upstream', 'Oil & Gas Downstream', 'Refinery Operations', 
  'Drilling', 'HSE Compliance', 'Project Management', 'IT & Digital',
  'Finance & Accounting', 'HR Management', 'General Management'
];

const countries = [
  'Libya', 'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Egypt', 'Tunisia', 'Morocco', 'UK', 'USA', 'Germany', 'France', 
  'Netherlands', 'Italy', 'Turkey', 'Malaysia', 'Singapore', 'Other'
];

interface Contact {
  id?: string;
  contact_name: string;
  contact_role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  notes: string;
}

export default function ProviderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    legal_name: '',
    country: '',
    city: '',
    is_local: false,
    description: '',
    website: '',
    vendor_code: '',
    contact_email: '',
    contact_phone: '',
    categories: [] as string[],
    delivery_modes: [] as string[],
    languages: [] as string[],
    expertise_areas: [] as string[],
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState<Contact>({
    contact_name: '',
    contact_role: '',
    email: '',
    phone: '',
    is_primary: false,
    notes: '',
  });

  // Fetch existing provider
  const { data: existingProvider } = useQuery({
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
    enabled: isEditing,
  });

  // Fetch existing contacts
  const { data: existingContacts } = useQuery({
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
    enabled: isEditing,
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingProvider) {
      setFormData({
        name_en: existingProvider.name_en || '',
        name_ar: existingProvider.name_ar || '',
        legal_name: existingProvider.legal_name || '',
        country: existingProvider.country || '',
        city: existingProvider.city || '',
        is_local: existingProvider.is_local || false,
        description: existingProvider.description || '',
        website: existingProvider.website || '',
        vendor_code: existingProvider.vendor_code || '',
        contact_email: existingProvider.contact_email || '',
        contact_phone: existingProvider.contact_phone || '',
        categories: (existingProvider.categories as string[]) || [],
        delivery_modes: (existingProvider.delivery_modes as string[]) || [],
        languages: (existingProvider.languages as string[]) || [],
        expertise_areas: (existingProvider.expertise_areas as string[]) || [],
      });
    }
  }, [existingProvider]);

  useEffect(() => {
    if (existingContacts) {
      setContacts(existingContacts.map(c => ({
        id: c.id,
        contact_name: c.contact_name,
        contact_role: c.contact_role || '',
        email: c.email,
        phone: c.phone || '',
        is_primary: c.is_primary || false,
        notes: c.notes || '',
      })));
    }
  }, [existingContacts]);

  // Auto-set is_local based on country
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      is_local: prev.country === 'Libya',
    }));
  }, [formData.country]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (submitForApproval: boolean) => {
      const providerData = {
        name_en: formData.name_en,
        name_ar: formData.name_ar || null,
        legal_name: formData.legal_name || null,
        country: formData.country || null,
        city: formData.city || null,
        is_local: formData.is_local,
        description: formData.description || null,
        website: formData.website || null,
        vendor_code: formData.vendor_code || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        categories: formData.categories,
        delivery_modes: formData.delivery_modes,
        languages: formData.languages,
        expertise_areas: formData.expertise_areas,
        provider_status: (submitForApproval ? 'pending_approval' : 'draft') as 'draft' | 'pending_approval',
        submitted_by: submitForApproval ? user?.id : null,
        submitted_at: submitForApproval ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      let providerId = id;

      if (isEditing) {
        const { error } = await supabase
          .from('training_providers')
          .update(providerData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('training_providers')
          .insert({
            ...providerData,
            created_by: user?.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        providerId = data.id;
      }

      // Update contacts
      if (providerId) {
        // Delete removed contacts
        if (isEditing) {
          const existingIds = existingContacts?.map(c => c.id) || [];
          const currentIds = contacts.filter(c => c.id).map(c => c.id);
          const toDelete = existingIds.filter(id => !currentIds.includes(id));
          
          if (toDelete.length > 0) {
            await supabase
              .from('provider_contacts')
              .delete()
              .in('id', toDelete);
          }
        }

        // Upsert contacts
        for (const contact of contacts) {
          if (contact.id) {
            await supabase
              .from('provider_contacts')
              .update({
                contact_name: contact.contact_name,
                contact_role: contact.contact_role || null,
                email: contact.email,
                phone: contact.phone || null,
                is_primary: contact.is_primary,
                notes: contact.notes || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', contact.id);
          } else {
            await supabase
              .from('provider_contacts')
              .insert({
                provider_id: providerId,
                contact_name: contact.contact_name,
                contact_role: contact.contact_role || null,
                email: contact.email,
                phone: contact.phone || null,
                is_primary: contact.is_primary,
                notes: contact.notes || null,
              });
          }
        }

        // Log action
        await supabase.from('provider_audit_log').insert({
          provider_id: providerId,
          action: isEditing ? 'updated' : 'created',
          actor_id: user?.id,
          new_status: submitForApproval ? 'pending_approval' : 'draft',
        });
      }

      return providerId;
    },
    onSuccess: (providerId) => {
      queryClient.invalidateQueries({ queryKey: ['providers-admin'] });
      queryClient.invalidateQueries({ queryKey: ['provider', id] });
      toast.success(isEditing ? 'Provider updated' : 'Provider created');
      navigate(`/providers/${providerId}`);
    },
    onError: (error) => {
      toast.error('Failed to save provider');
      console.error(error);
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'categories' | 'delivery_modes' | 'languages' | 'expertise_areas', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  const addContact = () => {
    if (!newContact.contact_name || !newContact.email) {
      toast.error('Contact name and email are required');
      return;
    }
    setContacts(prev => [...prev, { ...newContact }]);
    setNewContact({
      contact_name: '',
      contact_role: '',
      email: '',
      phone: '',
      is_primary: false,
      notes: '',
    });
  };

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const setPrimaryContact = (index: number) => {
    setContacts(prev => prev.map((c, i) => ({
      ...c,
      is_primary: i === index,
    })));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/providers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Edit Provider' : 'New Provider'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Update provider information' : 'Add a new training provider to the registry'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">
              <Building2 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <User className="h-4 w-4 mr-2" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="capabilities">
              <Briefcase className="h-4 w-4 mr-2" />
              Capabilities
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Provider name and identification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_en">Display Name (English) *</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => handleInputChange('name_en', e.target.value)}
                      placeholder="Provider name in English"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">Display Name (Arabic)</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) => handleInputChange('name_ar', e.target.value)}
                      placeholder="اسم المزود بالعربية"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legal_name">Legal Name</Label>
                    <Input
                      id="legal_name"
                      value={formData.legal_name}
                      onChange={(e) => handleInputChange('legal_name', e.target.value)}
                      placeholder="Legal entity name (if different)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor_code">Vendor Code (ERP)</Label>
                    <Input
                      id="vendor_code"
                      value={formData.vendor_code}
                      onChange={(e) => handleInputChange('vendor_code', e.target.value)}
                      placeholder="Vendor code from ERP system"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the provider"
                    rows={3}
                  />
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={(value) => handleInputChange('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City name"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={formData.is_local ? 'default' : 'secondary'}>
                    {formData.is_local ? 'Local (Libya)' : 'International'}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Automatically determined based on country selection
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://www.provider.com"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Contact</CardTitle>
                <CardDescription>Primary contact information (for quick reference)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      placeholder="contact@provider.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Phone</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder="+218 XX XXX XXXX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Provider Contacts</CardTitle>
                <CardDescription>Add multiple contacts for this provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing contacts */}
                {contacts.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Added Contacts</h4>
                    {contacts.map((contact, index) => (
                      <div key={index} className="border rounded-lg p-4 relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeContact(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{contact.contact_name}</p>
                          {contact.is_primary && <Badge variant="default">Primary</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{contact.contact_role}</p>
                        <p className="text-sm">{contact.email}</p>
                        {contact.phone && <p className="text-sm">{contact.phone}</p>}
                        {!contact.is_primary && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 mt-2"
                            onClick={() => setPrimaryContact(index)}
                          >
                            Set as Primary
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new contact */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-4">Add New Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name *</Label>
                      <Input
                        value={newContact.contact_name}
                        onChange={(e) => setNewContact(prev => ({ ...prev, contact_name: e.target.value }))}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role/Title</Label>
                      <Input
                        value={newContact.contact_role}
                        onChange={(e) => setNewContact(prev => ({ ...prev, contact_role: e.target.value }))}
                        placeholder="e.g., Training Manager"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@provider.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={newContact.phone}
                        onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+218 XX XXX XXXX"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Checkbox
                      id="is_primary"
                      checked={newContact.is_primary}
                      onCheckedChange={(checked) => setNewContact(prev => ({ ...prev, is_primary: checked as boolean }))}
                    />
                    <Label htmlFor="is_primary">Set as primary contact</Label>
                  </div>
                  <Button onClick={addContact} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Capabilities Tab */}
          <TabsContent value="capabilities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Categories</CardTitle>
                <CardDescription>What types of training does this provider offer?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {providerCategories.map(category => (
                    <Badge
                      key={category}
                      variant={formData.categories.includes(category) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('categories', category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Modes</CardTitle>
                <CardDescription>How does this provider deliver training?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {deliveryModes.map(mode => (
                    <Badge
                      key={mode}
                      variant={formData.delivery_modes.includes(mode) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('delivery_modes', mode)}
                    >
                      {mode}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
                <CardDescription>In which languages can this provider deliver training?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {languages.map(lang => (
                    <Badge
                      key={lang}
                      variant={formData.languages.includes(lang) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('languages', lang)}
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Areas of Expertise</CardTitle>
                <CardDescription>What are this provider's specialty areas?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {expertiseAreas.map(area => (
                    <Badge
                      key={area}
                      variant={formData.expertise_areas.includes(area) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('expertise_areas', area)}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/providers')}>
            Cancel
          </Button>
          <Button 
            variant="outline"
            onClick={() => saveMutation.mutate(false)}
            disabled={!formData.name_en || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button 
            onClick={() => saveMutation.mutate(true)}
            disabled={!formData.name_en || saveMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit for Approval
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
