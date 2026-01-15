import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ScanText, Loader2, Download, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Canvas as FabricCanvas, FabricImage, IText } from "fabric";

interface DetectedWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface OCRResult {
  id: string;
  filename: string;
  imageUrl: string;
  words: DetectedWord[];
}

export const OCRScanner = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [currentResult, setCurrentResult] = useState<OCRResult | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Fabric canvas when result is ready
  useEffect(() => {
    if (!canvasRef.current || !currentResult) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      backgroundColor: "#ffffff",
      selection: true,
    });

    setFabricCanvas(canvas);

    // Load background image
    FabricImage.fromURL(currentResult.imageUrl).then((img) => {
      const imgWidth = img.width || 800;
      const imgHeight = img.height || 600;

      // Store canvas size
      setCanvasSize({ width: imgWidth, height: imgHeight });

      // Set canvas dimensions
      canvas.setDimensions({ width: imgWidth, height: imgHeight });

      // Set image as background
      img.set({
        originX: "left",
        originY: "top",
        selectable: false,
        evented: false,
      });
      
      canvas.backgroundImage = img;
      canvas.renderAll();

      // Add text objects for each detected word
      currentResult.words.forEach((word) => {
        if (!word.text.trim()) return;

        const { x0, y0, x1, y1 } = word.bbox;
        const height = y1 - y0;

        // Calculate font size based on bounding box height
        const fontSize = Math.max(height * 0.85, 10);

        const textObj = new IText(word.text, {
          left: x0,
          top: y0,
          fontSize: fontSize,
          fontFamily: "Arial, sans-serif",
          fill: "#000000",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: 2,
          editable: true,
          lockRotation: true,
          lockScalingY: true,
          hasControls: true,
          hasBorders: true,
          borderColor: "#3b82f6",
          cornerColor: "#3b82f6",
          cornerSize: 8,
          transparentCorners: false,
        });

        canvas.add(textObj);
      });

      canvas.renderAll();
      toast.success("Click on any text to edit it directly!");
    });

    return () => {
      canvas.dispose();
    };
  }, [currentResult]);

  // Handle zoom
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(zoom);
    fabricCanvas.setDimensions({
      width: canvasSize.width * zoom,
      height: canvasSize.height * zoom,
    });
    fabricCanvas.renderAll();
  }, [zoom, fabricCanvas, canvasSize]);

  const processImageWithOCR = async (file: File): Promise<OCRResult | null> => {
    try {
      // Read file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Create Tesseract worker
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
            setProgressStatus("Recognizing text...");
          } else {
            setProgressStatus(m.status || "Processing...");
          }
        },
      });

      // Perform OCR with word-level bounding boxes
      const result = await worker.recognize(dataUrl);
      await worker.terminate();

      // Access words from the result data
      const recognizedWords = (result.data as any).words || [];
      
      // Map words to our interface
      const words: DetectedWord[] = recognizedWords.map((w: any) => ({
        text: w.text,
        bbox: w.bbox,
      }));

      return {
        id: `${Date.now()}-${Math.random()}`,
        filename: file.name,
        imageUrl: dataUrl,
        words,
      };
    } catch (error) {
      console.error("OCR processing error:", error);
      return null;
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentResult(null);
    setZoom(1);

    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not a valid image file`);
        return;
      }

      setProgressStatus(`Processing ${file.name}...`);
      const result = await processImageWithOCR(file);

      if (result) {
        setCurrentResult(result);
        toast.success(`Detected ${result.words.length} text elements`);
      } else {
        toast.error("Failed to process image");
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressStatus("");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
    },
    multiple: false,
    disabled: isProcessing,
  });

  const handleSaveAsJpg = () => {
    if (!fabricCanvas) return;

    try {
      // Deselect any active object before export
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();

      // Export canvas as data URL at original size
      const dataUrl = fabricCanvas.toDataURL({
        format: "jpeg",
        quality: 0.95,
        multiplier: 1 / zoom,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `edited-${currentResult?.filename?.replace(/\.[^/.]+$/, "") || "receipt"}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Image saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save image");
    }
  };

  const handleReset = () => {
    setCurrentResult(null);
    setFabricCanvas(null);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div className="space-y-8">
      {/* Upload Area - show only when no result */}
      {!currentResult && !isProcessing && (
        <div
          {...getRootProps()}
          className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
            ${
              isDragActive
                ? "border-primary bg-primary/10 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-accent/30"
            }
          `}
          style={{
            boxShadow: isDragActive
              ? "var(--shadow-glow)"
              : "var(--shadow-elegant)",
          }}
        >
          <input {...getInputProps()} />

          <div className="glass-strong p-8 sm:p-12 lg:p-16">
            <div className="flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6">
              <div
                className={`relative transition-transform duration-300 ${
                  isDragActive ? "scale-110" : ""
                }`}
              >
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  {isDragActive ? (
                    <ScanText className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-pulse" />
                  ) : (
                    <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  {isDragActive ? "Drop receipt here" : "Upload Receipt to Edit"}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                  Upload a receipt image to detect and edit text directly on it
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                  JPG
                </span>
                <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                  PNG
                </span>
                <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                  WEBP
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div
            className="glass-strong rounded-2xl p-6 sm:p-8"
            style={{ boxShadow: "var(--shadow-premium)" }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-primary mb-4">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
              <p className="text-base sm:text-lg font-medium text-center">
                {progressStatus} {progress > 0 && `${progress}%`}
              </p>
            </div>
            <Progress value={progress} className="h-2 sm:h-3" />
          </div>
        </div>
      )}

      {/* Editor Canvas */}
      {currentResult && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass-strong rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Editing: {currentResult.filename}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 border border-border rounded-lg p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm font-medium min-w-[50px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <Button size="sm" variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                New Image
              </Button>

              <Button size="sm" onClick={handleSaveAsJpg}>
                <Download className="h-4 w-4 mr-2" />
                Save as JPG
              </Button>
            </div>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="overflow-auto rounded-2xl border border-border bg-muted/20 p-4"
            style={{ maxHeight: "70vh" }}
          >
            <div className="inline-block">
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Click on any text to edit it directly. Drag to reposition. Save when done.</p>
          </div>
        </div>
      )}
    </div>
  );
};
