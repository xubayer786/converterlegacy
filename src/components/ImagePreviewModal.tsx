import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, ChevronLeft, ChevronRight, X, MessageCircle } from "lucide-react";
import { ConvertedImage } from "@/lib/pdfConverter";

interface ImagePreviewModalProps {
  image: ConvertedImage;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onDownload: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
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
  onWhatsApp,
  hasNext,
  hasPrev,
}: ImagePreviewModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full h-[95vh] sm:h-[90vh] p-0 gap-0">
        <DialogTitle className="sr-only">Image Preview: {image.filename}</DialogTitle>
        <div className="flex items-center justify-between p-2 sm:p-4 border-b border-border bg-gradient-to-r from-card to-card/80 backdrop-blur-sm">
          <h3 className="font-semibold text-sm sm:text-lg truncate max-w-[150px] sm:max-w-md">{image.filename}</h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownload}
              className="hover:border-primary/50 transition-all duration-300 h-7 sm:h-9 px-2 sm:px-3"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onWhatsApp}
              className="hover:border-green-500/50 transition-all duration-300 h-7 sm:h-9 px-2 sm:px-3"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onPrint}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-glow transition-all duration-300 h-7 sm:h-9 px-2 sm:px-3"
            >
              <Printer className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 h-7 w-7 sm:h-9 sm:w-9"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 sm:left-4 z-10 rounded-full bg-background/80 hover:bg-background h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => onNavigate("prev")}
            >
              <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
            </Button>
          )}

          <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
            <img
              src={image.dataUrl}
              alt={image.filename}
              className="w-full h-full object-contain"
              style={{ maxHeight: "calc(95vh - 140px)" }}
            />
          </div>

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 sm:right-4 z-10 rounded-full bg-background/80 hover:bg-background h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => onNavigate("next")}
            >
              <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
            </Button>
          )}
        </div>

        <div className="p-2 sm:p-4 border-t border-border flex items-center justify-between">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {image.width} × {image.height} px • Page {image.pageNumber}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
