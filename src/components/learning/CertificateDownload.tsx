import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

interface CertificateDownloadProps {
  enrollmentId: string;
  courseName: string;
  certificateUrl?: string | null;
}

export function CertificateDownload({ enrollmentId, courseName, certificateUrl }: CertificateDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const downloadCertificate = async () => {
    // If certificate already exists, download it
    if (certificateUrl) {
      openCertificate(certificateUrl);
      return;
    }

    // Generate new certificate
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { enrollmentId },
      });

      if (error) throw error;

      if (data?.certificate?.html) {
        // Open in new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(data.certificate.html);
          newWindow.document.close();
        }

        toast({
          title: 'Certificate Generated',
          description: 'Your certificate has been opened in a new tab.',
        });
      }
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate certificate',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openCertificate = (url: string) => {
    // Handle data URL or regular URL
    if (url.startsWith('data:text/html;base64,')) {
      const html = decodeURIComponent(escape(atob(url.split(',')[1])));
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={downloadCertificate}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-1" />
      )}
      Certificate
    </Button>
  );
}
