import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useExportScenario } from '@/hooks/useScenarios';

interface ScenarioExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
  scenarioName: string;
}

export function ScenarioExportDialog({ open, onOpenChange, scenarioId, scenarioName }: ScenarioExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [includeBaseline, setIncludeBaseline] = useState(true);
  const [includeDeltas, setIncludeDeltas] = useState(true);
  const [includeCosts, setIncludeCosts] = useState(true);
  const [onlyCutItems, setOnlyCutItems] = useState(false);

  const exportMutation = useExportScenario();

  const handleExport = async () => {
    await exportMutation.mutateAsync({
      scenarioId,
      format,
      options: {
        includeBaseline,
        includeDeltas,
        includeCosts,
        onlyCutItems,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Scenario</DialogTitle>
          <DialogDescription>
            Export "{scenarioName}" data for analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'csv' | 'xlsx')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal">CSV (comma-separated)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="font-normal">Excel (.xlsx)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Include Columns</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="baseline" 
                  checked={includeBaseline} 
                  onCheckedChange={(c) => setIncludeBaseline(!!c)} 
                />
                <Label htmlFor="baseline" className="font-normal">Baseline volume & cost</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="deltas" 
                  checked={includeDeltas} 
                  onCheckedChange={(c) => setIncludeDeltas(!!c)} 
                />
                <Label htmlFor="deltas" className="font-normal">Delta columns (% change)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="costs" 
                  checked={includeCosts} 
                  onCheckedChange={(c) => setIncludeCosts(!!c)} 
                />
                <Label htmlFor="costs" className="font-normal">Cost data (requires permission)</Label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Filter Rows</Label>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="cutOnly" 
                checked={onlyCutItems} 
                onCheckedChange={(c) => setOnlyCutItems(!!c)} 
              />
              <Label htmlFor="cutOnly" className="font-normal">Only show cut/reduced items</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
