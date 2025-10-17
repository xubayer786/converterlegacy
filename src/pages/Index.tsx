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

  return (
    <div className="min-h-screen bg-background">
      <Header
        onConnectPrinter={() => setShowPrinterDialog(true)}
        isConnected={isPrinterConnected}
      />

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        {images.length === 0 && !isConverting && (
          <div
            className="relative rounded-2xl overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-accent/90 backdrop-blur-sm" />
            <div className="relative px-6 py-16 sm:py-24 text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                Legacy Converter
              </h1>
              <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8">
                Transform PDF invoices into high-quality JPG receipts with
                intelligent cropping and direct thermal printing
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span>Auto-convert on upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>Smart border cropping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  <span>Bluetooth thermal printing</span>
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
            <div className="flex items-center justify-center gap-3 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-lg font-medium">
                Converting PDF to JPG... {Math.round(conversionProgress)}%
              </p>
            </div>
            <Progress value={conversionProgress} className="h-2" />
          </div>
        )}

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Converted Images ({images.length})
              </h2>
            </div>
            <ImageGrid images={images} onPrint={handlePrint} />
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && !isConverting && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">
              Upload PDF files to get started with conversion
            </p>
          </div>
        )}
      </main>

      <PrinterConnection
        isOpen={showPrinterDialog}
        onClose={() => setShowPrinterDialog(false)}
        onConnected={() => setIsPrinterConnected(true)}
      />
    </div>
  );
};

export default Index;
