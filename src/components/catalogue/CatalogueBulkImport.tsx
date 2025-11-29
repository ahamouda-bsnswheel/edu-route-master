import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function CatalogueBulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }
    setIsProcessing(true);
    // Placeholder for import logic
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Import functionality will be implemented with edge function');
    }, 1000);
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Catalogue Items
        </CardTitle>
        <CardDescription>
          Import courses and programs from Excel/CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Upload an Excel or CSV file with catalogue items
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="max-w-xs mx-auto"
          />
          {file && (
            <p className="mt-2 text-sm text-primary">{file.name}</p>
          )}
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Required Columns:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Code (unique identifier)</li>
            <li>• Title EN (English title)</li>
            <li>• Category</li>
            <li>• Delivery Mode (classroom, online, blended, vilt, on_the_job)</li>
          </ul>
        </div>

        <Button
          onClick={handleImport}
          disabled={!file || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : 'Start Import'}
        </Button>
      </CardContent>
    </Card>
  );
}
