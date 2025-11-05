import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Printer, Info, Smartphone } from "lucide-react";

const Index = () => {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  const printUrl = `${projectUrl}/functions/v1/print-receipt?id=123`;
  const bprintUrl = `bprint://${printUrl}`;

  const handlePrintClick = () => {
    window.location.href = bprintUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">iOS Compatible</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                iOS Thermal Receipt
              </span>
              <br />
              <span className="text-foreground">Print App</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Print receipts directly from your iPhone using the Bluetooth Print app
            </p>
          </div>

          {/* Info Alert */}
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-5 w-5 text-primary" />
            <AlertDescription className="text-sm ml-2">
              <strong className="font-semibold">Before using:</strong> Enable "Browser Print" inside the Bluetooth Print app settings.
              <br />
              <a 
                href="https://apps.apple.com/us/app/id1599863946" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline mt-1 inline-block"
              >
                Download Bluetooth Print App →
              </a>
            </AlertDescription>
          </Alert>

          {/* Print Button */}
          <div className="glass-strong rounded-2xl p-8 space-y-6 text-center">
            <Printer className="h-16 w-16 mx-auto text-primary animate-pulse" />
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Ready to Print?</h2>
              <p className="text-muted-foreground">
                Tap the button below to open Bluetooth Print and print your receipt
              </p>
            </div>

            <Button 
              onClick={handlePrintClick}
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-lg font-semibold"
            >
              <Printer className="mr-2 h-5 w-5" />
              Print Receipt
            </Button>
          </div>

          {/* Test Link (for development) */}
          <div className="text-center text-xs text-muted-foreground space-y-2">
            <p>Test URL (for development):</p>
            <code className="block px-4 py-2 bg-muted rounded-lg break-all text-left">
              {bprintUrl}
            </code>
            <a 
              href={bprintUrl}
              className="text-primary hover:underline inline-block mt-2"
            >
              Test Local Print Link →
            </a>
          </div>

          {/* How it Works */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              How it Works
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Install the Bluetooth Print app from the App Store</li>
              <li>Enable "Browser Print" in the app settings</li>
              <li>Connect your Bluetooth thermal printer</li>
              <li>Open this web app in Safari on your iPhone</li>
              <li>Tap "Print Receipt" to automatically print</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
