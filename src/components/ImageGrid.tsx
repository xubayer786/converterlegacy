import { useState } from "react";
import { Download, Printer, Check, MessageCircle, Eye } from "lucide-react";
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
}

export const ImageGrid = ({ images, onPrint }: ImageGridProps) => {
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
      
      // For mobile: use native share
      if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const files = await Promise.all(
          imagesToSend.map(async (img) => {
            const blob = await (await fetch(img.dataUrl)).blob();
            return new File([blob], img.filename, { type: "image/jpeg" });
          })
        );
        
        await navigator.share({
          files,
          title: "Legacy Converter Receipts",
          text: message,
        });
        toast.success("Shared to WhatsApp!");
      } else {
        // For desktop: open WhatsApp Web
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
        toast.info("Please attach the receipts manually in WhatsApp Web");
      }
    } catch (error) {
      console.error("WhatsApp share error:", error);
      toast.error("Failed to share via WhatsApp");
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
