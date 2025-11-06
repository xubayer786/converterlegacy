import { useState } from "react";
import { Download, Printer, Check, MessageCircle, Eye, X, Trash2, RotateCcw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConvertedImage } from "@/lib/pdfConverter";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { Checkbox } from "@/components/ui/checkbox";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface ImageGridProps {
  images: ConvertedImage[];
  onPrint: (images: ConvertedImage[]) => void;
  onDeleteSelected: (ids: string[]) => void;
  onReset: () => void;
}

export const ImageGrid = ({ images, onPrint, onDeleteSelected, onReset }: ImageGridProps) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<ConvertedImage | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedImages(newSelection);
  };

  const selectAll = () => {
    setSelectedImages(new Set(images.map((img) => img.id)));
  };

  const unselectAll = () => {
    setSelectedImages(new Set());
  };

  const downloadImage = (image: ConvertedImage) => {
    const link = document.createElement("a");
    link.href = image.dataUrl;
    link.download = image.filename;
    link.click();
    toast.success(`Downloaded ${image.filename}`);
  };

  const downloadSelected = async () => {
    const selected = images.filter((img) => selectedImages.has(img.id));
    if (selected.length === 0) {
      toast.error("No images selected");
      return;
    }

    if (selected.length === 1) {
      downloadImage(selected[0]);
      return;
    }

    // Create ZIP for multiple files
    const zip = new JSZip();
    for (const img of selected) {
      const base64Data = img.dataUrl.split(",")[1];
      zip.file(img.filename, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "legacy-converter-exports.zip");
    toast.success(`Downloaded ${selected.length} images as ZIP`);
  };

  const downloadAll = async () => {
    if (images.length === 1) {
      downloadImage(images[0]);
      return;
    }

    const zip = new JSZip();
    for (const img of images) {
      const base64Data = img.dataUrl.split(",")[1];
      zip.file(img.filename, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "legacy-converter-all.zip");
    toast.success(`Downloaded all ${images.length} images as ZIP`);
  };

  const printSelected = () => {
    const selected = images.filter((img) => selectedImages.has(img.id));
    if (selected.length === 0) {
      toast.error("No images selected");
      return;
    }
    onPrint(selected);
  };

  const deleteSelected = () => {
    if (selectedImages.size === 0) {
      toast.error("No images selected");
      return;
    }
    onDeleteSelected(Array.from(selectedImages));
    setSelectedImages(new Set());
    toast.success(`Deleted ${selectedImages.size} image(s)`);
  };

  const resetAll = () => {
    onReset();
    setSelectedImages(new Set());
    toast.success("All images cleared");
  };

  const openPreview = (image: ConvertedImage) => {
    const index = images.findIndex((img) => img.id === image.id);
    setPreviewIndex(index);
    setPreviewImage(image);
  };

  const navigatePreview = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? (previewIndex - 1 + images.length) % images.length
        : (previewIndex + 1) % images.length;
    setPreviewIndex(newIndex);
    setPreviewImage(images[newIndex]);
  };

  const sendToWhatsApp = async (imagesToSend: ConvertedImage[]) => {
    try {
      const message = `Receipts from Legacy Converter (${imagesToSend.length} files)`;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // Mobile: Use Web Share API to open WhatsApp with files attached
      if (isMobile && navigator.canShare) {
        // Compress and prepare files for WhatsApp (max 1MB each)
        const files = await Promise.all(
          imagesToSend.map(async (img) => {
            const response = await fetch(img.dataUrl);
            let blob = await response.blob();
            
            // If blob is larger than 1MB, compress it
            if (blob.size > 1024 * 1024) {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d')!;
              const image = new Image();
              
              await new Promise((resolve) => {
                image.onload = resolve;
                image.src = img.dataUrl;
              });
              
              // Calculate new dimensions to reduce file size
              const maxDimension = 1500;
              let width = image.width;
              let height = image.height;
              
              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = (height / width) * maxDimension;
                  width = maxDimension;
                } else {
                  width = (width / height) * maxDimension;
                  height = maxDimension;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(image, 0, 0, width, height);
              
              blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
              });
            }
            
            return new File([blob], img.filename, { type: "image/jpeg" });
          })
        );
        
        // Check if files can be shared
        if (navigator.canShare({ files })) {
          await navigator.share({
            files,
            title: "Legacy Converter Receipts",
            text: message,
          });
          toast.success("Opening WhatsApp with receipts!");
          return;
        }
      }
      
      // Desktop: Download individual files and open WhatsApp Web
      toast.info(`Downloading ${imagesToSend.length} receipt(s)...`);
      
      // Download each image individually
      for (const img of imagesToSend) {
        const link = document.createElement("a");
        link.href = img.dataUrl;
        link.download = img.filename;
        link.click();
        // Small delay between downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast.success("Receipts downloaded! Opening WhatsApp...");
      
      // Open WhatsApp Web with message
      setTimeout(() => {
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
      }, 500);
      
    } catch (error: any) {
      // User cancelled the share
      if (error.name === 'AbortError') {
        return;
      }
      console.error("WhatsApp share error:", error);
      toast.error("Failed to share. Try downloading manually.");
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toolbar */}
      <div className="glass-strong flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          {selectedImages.size === 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-300 text-xs sm:text-sm"
            >
              <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Select All
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-2.5 sm:px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg">
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  {selectedImages.size} selected
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={unselectAll}
                className="h-7 sm:h-8 text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {selectedImages.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadSelected}
              className="hover:border-primary/50 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => sendToWhatsApp(images.filter(img => selectedImages.has(img.id)))}
              className="hover:border-green-500/50 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={printSelected}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-glow transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Printer className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={deleteSelected}
              className="hover:shadow-lg transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        )}

        {selectedImages.size === 0 && images.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadAll}
              className="hover:border-primary/50 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download All</span>
              <span className="sm:hidden">Download</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => sendToWhatsApp(images)}
              className="hover:border-green-500/50 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Send All</span>
              <span className="sm:hidden">Send</span>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => onPrint(images)}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-glow transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Printer className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print All</span>
              <span className="sm:hidden">Print</span>
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={resetAll}
              className="hover:shadow-lg transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reset All</span>
              <span className="sm:hidden">Reset</span>
            </Button>
          </div>
        )}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className={`glass group relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 ${
              selectedImages.has(image.id)
                ? "border-2 border-primary ring-2 ring-primary/30"
                : "border border-border/30 hover:border-primary/50"
            }`}
            style={{ boxShadow: selectedImages.has(image.id) ? 'var(--shadow-glow)' : 'var(--shadow-card)' }}
          >
            <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 z-10">
              <Checkbox
                checked={selectedImages.has(image.id)}
                onCheckedChange={() => toggleSelection(image.id)}
                className="glass-strong h-4 w-4 sm:h-5 sm:w-5"
              />
            </div>

            <div
              className="aspect-[3/4] w-full cursor-pointer"
              onClick={() => openPreview(image)}
            >
              <img
                src={image.dataUrl}
                alt={image.filename}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
              <p className="text-[10px] sm:text-xs font-medium truncate" title={image.filename}>
                {image.filename}
              </p>
              <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-7 sm:w-7"
                  onClick={() => openPreview(image)}
                >
                  <Eye className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-7 sm:w-7"
                  onClick={() => downloadImage(image)}
                >
                  <Download className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-7 sm:w-7"
                  onClick={() => onPrint([image])}
                >
                  <Printer className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-7 sm:w-7"
                  onClick={() => {
                    const projectUrl = import.meta.env.VITE_SUPABASE_URL.replace('/supabase', '');
                    const bprintUrl = `bprintapp://${projectUrl}/functions/v1/print-receipt?id=123`;
                    window.location.href = bprintUrl;
                    toast.info("Opening iOS Bluetooth Print app...");
                  }}
                >
                  <Smartphone className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-7 sm:w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onDeleteSelected([image.id]);
                    toast.success('Image deleted');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {previewImage && (
        <ImagePreviewModal
          image={previewImage}
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          onNavigate={navigatePreview}
          onDownload={() => downloadImage(previewImage)}
          onPrint={() => onPrint([previewImage])}
          onWhatsApp={() => sendToWhatsApp([previewImage])}
          hasNext={previewIndex < images.length - 1}
          hasPrev={previewIndex > 0}
        />
      )}
    </div>
  );
};
