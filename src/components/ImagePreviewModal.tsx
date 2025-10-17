import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ConvertedImage } from "@/lib/pdfConverter";

interface ImagePreviewModalProps {
  image: ConvertedImage;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onDownload: () => void;
  onPrint: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const ImagePreviewModal = ({
  image,
  isOpen,
  onClose,
  onNavigate,
  onDownload,
  onPrint,
  hasNext,
  hasPrev,
}: ImagePreviewModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-lg">{image.filename}</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="default" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 rounded-full bg-background/80 hover:bg-background"
              onClick={() => onNavigate("prev")}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={image.dataUrl}
              alt={image.filename}
              className="w-full h-full object-contain"
              style={{ maxHeight: "calc(90vh - 180px)" }}
            />
          </div>

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 rounded-full bg-background/80 hover:bg-background"
              onClick={() => onNavigate("next")}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {image.width} × {image.height} px • Page {image.pageNumber}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
