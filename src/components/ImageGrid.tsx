import { useState } from "react";
import { Download, Printer, Check } from "lucide-react";
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

  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={unselectAll}>
            Unselect All
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedImages.size} of {images.length} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedImages.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={downloadSelected}>
                <Download className="h-4 w-4 mr-2" />
                Download Selected
              </Button>
              <Button variant="outline" size="sm" onClick={printSelected}>
                <Printer className="h-4 w-4 mr-2" />
                Print Selected
              </Button>
            </>
          )}
          <Button variant="default" size="sm" onClick={downloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative rounded-lg overflow-hidden border border-border bg-card hover:shadow-lg transition-all duration-300"
          >
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedImages.has(image.id)}
                onCheckedChange={() => toggleSelection(image.id)}
                className="bg-background border-2"
              />
            </div>

            {selectedImages.has(image.id) && (
              <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}

            <div
              className="cursor-pointer"
              onClick={() => openPreview(image)}
            >
              <img
                src={image.dataUrl}
                alt={image.filename}
                className="w-full h-auto object-contain bg-muted"
              />
            </div>

            <div className="p-3 space-y-2">
              <p className="text-sm font-medium truncate">{image.filename}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => downloadImage(image)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onPrint([image])}
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
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
          hasNext={previewIndex < images.length - 1}
          hasPrev={previewIndex > 0}
        />
      )}
    </div>
  );
};
