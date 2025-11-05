import { useState } from "react";
import { Header } from "@/components/Header";
import { FileUploader } from "@/components/FileUploader";
import { ImageGrid } from "@/components/ImageGrid";
import { PrinterConnection } from "@/components/PrinterConnection";
import { ConvertedImage, convertPdfToJpg } from "@/lib/pdfConverter";
import { printImages, getConnectedDevice } from "@/lib/bluetoothPrinter";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Zap, Image as ImageIcon, Printer } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

const Index = () => {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [pendingPrintImages, setPendingPrintImages] = useState<ConvertedImage[] | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setIsConverting(true);
    setConversionProgress(0);
    const newImages: ConvertedImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileImages = await convertPdfToJpg(file, 58, (progress) => {
          const totalProgress =
            ((i + progress / 100) / files.length) * 100;
          setConversionProgress(totalProgress);
        });
        newImages.push(...fileImages);
      }

      setImages((prev) => [...prev, ...newImages]);
      toast.success(
        `Successfully converted ${files.length} PDF(s) to ${newImages.length} image(s)`
      );
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error("Failed to convert PDF. Please try again.");
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  const handlePrint = async (imagesToPrint: ConvertedImage[]) => {
    if (!isPrinterConnected || !getConnectedDevice()) {
      setPendingPrintImages(imagesToPrint);
      toast.error("Please connect a printer first");
      setShowPrinterDialog(true);
      return;
    }

    try {
      const printToast = toast.loading(`Printing ${imagesToPrint.length} receipt(s)...`);
      
      await printImages(imagesToPrint, (current, total) => {
        toast.loading(`Printing ${current}/${total} receipt(s)...`, { id: printToast });
      });

      toast.success(`Successfully printed ${imagesToPrint.length} receipt(s)!`, { id: printToast });
    } catch (error) {
      console.error("Print error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to print receipts");
    }
  };

  const handlePrinterConnected = () => {
    setIsPrinterConnected(true);
    
    // Auto-print if there was a pending print request
    if (pendingPrintImages) {
      setTimeout(() => {
        handlePrint(pendingPrintImages);
        setPendingPrintImages(null);
      }, 100);
    }
  };

  const handleDeleteSelected = (ids: string[]) => {
    setImages(prev => prev.filter(img => !ids.includes(img.id)));
  };

  const handleReset = () => {
    setImages([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onConnectPrinter={() => setShowPrinterDialog(true)}
        isConnected={isPrinterConnected}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 space-y-8 sm:space-y-12 max-w-7xl">
        {/* Hero Section */}
        {images.length === 0 && !isConverting && (
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" 
                 style={{ boxShadow: 'var(--shadow-glow)' }} />
            <div className="glass-strong relative px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-24">
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 sm:mb-8">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs sm:text-sm font-medium text-primary">Powered by AI</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-foreground mb-4 sm:mb-6 tracking-tight leading-tight">
                  Everything App for your
                  <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Receipt Printing
                  </span>
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
                  Transform PDF invoices into high-quality JPG receipts with
                  intelligent cropping and direct thermal printing
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-muted-foreground text-xs sm:text-sm">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="hidden sm:inline">Auto-convert on upload</span>
                    <span className="sm:hidden">Auto-convert</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass">
                    <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="hidden sm:inline">Smart border cropping</span>
                    <span className="sm:hidden">Smart crop</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass">
                    <Printer className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="hidden sm:inline">Bluetooth thermal printing</span>
                    <span className="sm:hidden">Bluetooth print</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Uploader */}
        <FileUploader onFilesSelected={handleFilesSelected} />

        {/* Conversion Progress */}
        {isConverting && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="glass-strong rounded-2xl p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-premium)' }}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-primary mb-4">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
                <p className="text-base sm:text-lg font-medium text-center">
                  Converting PDF to JPG... {Math.round(conversionProgress)}%
                </p>
              </div>
              <Progress value={conversionProgress} className="h-2 sm:h-3" />
            </div>
          </div>
        )}

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                Converted Images <span className="text-primary">({images.length})</span>
              </h2>
            </div>
            <ImageGrid 
              images={images} 
              onPrint={handlePrint} 
              onDeleteSelected={handleDeleteSelected}
              onReset={handleReset}
            />
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && !isConverting && (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <p className="text-base sm:text-lg">
              Upload PDF files to get started with conversion
            </p>
          </div>
        )}
      </main>

      <PrinterConnection
        isOpen={showPrinterDialog}
        onClose={() => setShowPrinterDialog(false)}
        onConnected={handlePrinterConnected}
      />
    </div>
  );
};

export default Index;
