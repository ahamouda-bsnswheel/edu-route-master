import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RotateCcw } from 'lucide-react';
import { useRiskConfig, useUpdateRiskConfig } from '@/hooks/useScholarRisk';

export function RiskConfigPanel() {
  const { data: config, isLoading } = useRiskConfig();
  const updateConfig = useUpdateRiskConfig();
  
  const [factors, setFactors] = useState<Record<string, any>>({});
  const [bands, setBands] = useState<Record<string, any>>({});
  const [cadence, setCadence] = useState<Record<string, any>>({});
  const [notifications, setNotifications] = useState<Record<string, any>>({});

  useEffect(() => {
    if (config) {
      setFactors(config.risk_factors?.config_value || {});
      setBands(config.risk_bands?.config_value || {});
      setCadence(config.scoring_cadence?.config_value || {});
      setNotifications(config.notification_settings?.config_value || {});
    }
  }, [config]);

  const handleSaveFactors = () => {
    updateConfig.mutate({ configKey: 'risk_factors', configValue: factors });
  };

  const handleSaveBands = () => {
    updateConfig.mutate({ configKey: 'risk_bands', configValue: bands });
  };

  const handleSaveCadence = () => {
    updateConfig.mutate({ configKey: 'scoring_cadence', configValue: cadence });
  };

  const handleSaveNotifications = () => {
    updateConfig.mutate({ configKey: 'notification_settings', configValue: notifications });
  };

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  return (
    <Tabs defaultValue="factors" className="space-y-4">
      <TabsList>
        <TabsTrigger value="factors">Risk Factors</TabsTrigger>
        <TabsTrigger value="bands">Risk Bands</TabsTrigger>
        <TabsTrigger value="cadence">Scoring Cadence</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="factors">
        <Card>
          <CardHeader>
            <CardTitle>Risk Factor Weights</CardTitle>
            <CardDescription>
              Configure the importance of each factor in the risk calculation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>GPA Weight</Label>
                  <span className="text-sm text-muted-foreground">{Math.round((factors.gpa_weight || 0.25) * 100)}%</span>
                </div>
                <Slider
                  value={[(factors.gpa_weight || 0.25) * 100]}
                  onValueChange={([v]) => setFactors({ ...factors, gpa_weight: v / 100 })}
                  max={50}
                  step={5}
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Credits Progress Weight</Label>
                  <span className="text-sm text-muted-foreground">{Math.round((factors.credits_weight || 0.20) * 100)}%</span>
                </div>
                <Slider
                  value={[(factors.credits_weight || 0.20) * 100]}
                  onValueChange={([v]) => setFactors({ ...factors, credits_weight: v / 100 })}
                  max={50}
                  step={5}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Failed Modules Weight</Label>
                  <span className="text-sm text-muted-foreground">{Math.round((factors.failed_modules_weight || 0.20) * 100)}%</span>
                </div>
                <Slider
                  value={[(factors.failed_modules_weight || 0.20) * 100]}
                  onValueChange={([v]) => setFactors({ ...factors, failed_modules_weight: v / 100 })}
                  max={50}
                  step={5}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Academic Events Weight</Label>
                  <span className="text-sm text-muted-foreground">{Math.round((factors.events_weight || 0.15) * 100)}%</span>
                </div>
                <Slider
                  value={[(factors.events_weight || 0.15) * 100]}
                  onValueChange={([v]) => setFactors({ ...factors, events_weight: v / 100 })}
                  max={50}
                  step={5}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Timeline Weight</Label>
                  <span className="text-sm text-muted-foreground">{Math.round((factors.timeline_weight || 0.20) * 100)}%</span>
                </div>
                <Slider
                  value={[(factors.timeline_weight || 0.20) * 100]}
                  onValueChange={([v]) => setFactors({ ...factors, timeline_weight: v / 100 })}
                  max={50}
                  step={5}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Low GPA Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={factors.gpa_threshold_low || 2.0}
                  onChange={(e) => setFactors({ ...factors, gpa_threshold_low: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Medium GPA Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={factors.gpa_threshold_medium || 2.5}
                  onChange={(e) => setFactors({ ...factors, gpa_threshold_medium: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Credits Behind Threshold (%)</Label>
                <Input
                  type="number"
                  step="5"
                  value={(factors.credits_behind_threshold || 0.20) * 100}
                  onChange={(e) => setFactors({ ...factors, credits_behind_threshold: parseFloat(e.target.value) / 100 })}
                />
              </div>
              <div>
                <Label>Max Failed Core Modules</Label>
                <Input
                  type="number"
                  value={factors.max_failed_core_modules || 2}
                  onChange={(e) => setFactors({ ...factors, max_failed_core_modules: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveFactors} disabled={updateConfig.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Factors
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bands">
        <Card>
          <CardHeader>
            <CardTitle>Risk Band Thresholds</CardTitle>
            <CardDescription>
              Define score ranges for each risk level (0-100)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-green-600">On Track (max)</Label>
                <Input
                  type="number"
                  value={bands.on_track?.max || 39}
                  onChange={(e) => setBands({ ...bands, on_track: { min: 0, max: parseInt(e.target.value) } })}
                />
              </div>
              <div>
                <Label className="text-amber-600">Watch (max)</Label>
                <Input
                  type="number"
                  value={bands.watch?.max || 59}
                  onChange={(e) => setBands({ ...bands, watch: { min: (bands.on_track?.max || 39) + 1, max: parseInt(e.target.value) } })}
                />
              </div>
              <div>
                <Label className="text-orange-600">At Risk (max)</Label>
                <Input
                  type="number"
                  value={bands.at_risk?.max || 79}
                  onChange={(e) => setBands({ ...bands, at_risk: { min: (bands.watch?.max || 59) + 1, max: parseInt(e.target.value) } })}
                />
              </div>
              <div>
                <Label className="text-red-600">Critical (min)</Label>
                <Input
                  type="number"
                  value={(bands.at_risk?.max || 79) + 1}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveBands} disabled={updateConfig.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Bands
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cadence">
        <Card>
          <CardHeader>
            <CardTitle>Scoring Cadence</CardTitle>
            <CardDescription>
              Configure when batch risk scoring runs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequency</Label>
                <Select
                  value={cadence.frequency || 'weekly'}
                  onValueChange={(v) => setCadence({ ...cadence, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="after_results">After Term Results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Day of Week</Label>
                <Select
                  value={cadence.day_of_week || 'sunday'}
                  onValueChange={(v) => setCadence({ ...cadence, day_of_week: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time (24h)</Label>
                <Input
                  type="time"
                  value={cadence.time || '02:00'}
                  onChange={(e) => setCadence({ ...cadence, time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveCadence} disabled={updateConfig.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Cadence
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure who gets notified when risk escalates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Notify L&D Team</Label>
                <input
                  type="checkbox"
                  checked={notifications.notify_l_and_d !== false}
                  onChange={(e) => setNotifications({ ...notifications, notify_l_and_d: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Notify HRBP</Label>
                <input
                  type="checkbox"
                  checked={notifications.notify_hrbp !== false}
                  onChange={(e) => setNotifications({ ...notifications, notify_hrbp: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Notify Manager</Label>
                <input
                  type="checkbox"
                  checked={notifications.notify_manager !== false}
                  onChange={(e) => setNotifications({ ...notifications, notify_manager: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div>
              <Label>Escalation Threshold</Label>
              <Select
                value={notifications.escalation_threshold || 'at_risk'}
                onValueChange={(v) => setNotifications({ ...notifications, escalation_threshold: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watch">Watch (notify early)</SelectItem>
                  <SelectItem value="at_risk">At Risk (default)</SelectItem>
                  <SelectItem value="critical">Critical only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only send notifications when risk reaches this level or higher
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveNotifications} disabled={updateConfig.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
