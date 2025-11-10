import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon } from "lucide-react";
import { ConvertedImage } from "@/lib/pdfConverter";
import { toast } from "sonner";

interface DirectImageUploaderProps {
  onImagesSelected: (images: ConvertedImage[]) => void;
}

export const DirectImageUploader = ({ onImagesSelected }: DirectImageUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImageFiles = async (files: File[]) => {
    setIsProcessing(true);
    const processedImages: ConvertedImage[] = [];

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        // Read file as data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Load image to get dimensions
        const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = reject;
          img.src = dataUrl;
        });

        processedImages.push({
          id: `${Date.now()}-${Math.random()}`,
          dataUrl,
          filename: file.name,
          pageNumber: 1,
          width,
          height,
        });
      }

      if (processedImages.length > 0) {
        onImagesSelected(processedImages);
        toast.success(`Successfully loaded ${processedImages.length} image(s)`);
      }
    } catch (error) {
      console.error("Image processing error:", error);
      toast.error("Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processImageFiles(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: true,
    disabled: isProcessing,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${isDragActive 
          ? 'border-primary bg-primary/10 scale-[1.02]' 
          : 'border-border hover:border-primary/50 hover:bg-accent/30'
        }
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      style={{ boxShadow: isDragActive ? 'var(--shadow-glow)' : 'var(--shadow-elegant)' }}
    >
      <input {...getInputProps()} />
      
      <div className="glass-strong p-8 sm:p-12 lg:p-16">
        <div className="flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6">
          <div className={`relative transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`}>
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              {isDragActive ? (
                <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-pulse" />
              ) : (
                <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              )}
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              {isDragActive ? "Drop images here" : "Upload Images"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              {isProcessing 
                ? "Processing images..."
                : "Drag & drop image files here, or click to select files"
              }
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">JPG</span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">PNG</span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">GIF</span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">WEBP</span>
          </div>
        </div>
      </div>
    </div>
  );
};
