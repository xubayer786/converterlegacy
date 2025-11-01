import { useState } from "react";
import { Download, Printer, Check, MessageCircle, Eye, X, Trash2, RotateCcw } from "lucide-react";
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
      
      // Mobile: Use Web Share API to open WhatsApp with files
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
          toast.success("Opening WhatsApp...");
          return;
        }
      }
      
      // Desktop: Auto-download files and open WhatsApp Web
      if (imagesToSend.length === 1) {
        // Single file: download directly
        const link = document.createElement("a");
        link.href = imagesToSend[0].dataUrl;
        link.download = imagesToSend[0].filename;
        link.click();
        toast.success("Receipt downloaded! Opening WhatsApp...");
      } else {
        // Multiple files: create ZIP
        const zip = new JSZip();
        for (const img of imagesToSend) {
          const base64Data = img.dataUrl.split(",")[1];
          zip.file(img.filename, base64Data, { base64: true });
        }
        const blob = await zip.generateAsync({ type: "blob" });
        saveAs(blob, "receipts-for-whatsapp.zip");
        toast.success("Receipts downloaded as ZIP! Opening WhatsApp...");
      }
      
      // Open WhatsApp Web with message
      setTimeout(() => {
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message + "\n\n(Please attach the downloaded files)")}`;
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
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedImages.size === images.length && images.length > 0}
            onCheckedChange={(checked) =>
              checked ? selectAll() : unselectAll()
            }
          />
          <span className="text-sm font-medium">
            {selectedImages.size > 0
              ? `${selectedImages.size} selected`
              : "Select all"}
          </span>
          {selectedImages.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={unselectAll}
              className="h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Deselect All
            </Button>
          )}
        </div>

        {selectedImages.size > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadSelected}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => sendToWhatsApp(images.filter(img => selectedImages.has(img.id)))}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button variant="default" size="sm" onClick={printSelected}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}

        {selectedImages.size === 0 && images.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadAll}>
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
            <Button variant="outline" size="sm" onClick={() => sendToWhatsApp(images)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Send All to WhatsApp
            </Button>
            <Button variant="default" size="sm" onClick={() => onPrint(images)}>
              <Printer className="h-4 w-4 mr-2" />
              Print All
            </Button>
            <Button variant="destructive" size="sm" onClick={resetAll}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        )}
      </div>

      {/* Image Grid - Fixed smaller thumbnails */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            className={`group relative bg-card border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg ${
              selectedImages.has(image.id)
                ? "border-primary ring-2 ring-primary/20"
                : "border-border"
            }`}
          >
            <div className="absolute top-1.5 left-1.5 z-10">
              <Checkbox
                checked={selectedImages.has(image.id)}
                onCheckedChange={() => toggleSelection(image.id)}
                className="bg-background/80 backdrop-blur-sm h-4 w-4"
              />
            </div>

            <div
              className="aspect-[3/4] w-full h-32 cursor-pointer"
              onClick={() => openPreview(image)}
            >
              <img
                src={image.dataUrl}
                alt={image.filename}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-2 space-y-1.5">
              <p className="text-[10px] font-medium truncate" title={image.filename}>
                {image.filename}
              </p>
              <div className="flex items-center gap-0.5 justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => openPreview(image)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => downloadImage(image)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => sendToWhatsApp([image])}
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onPrint([image])}
                >
                  <Printer className="h-3 w-3" />
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
