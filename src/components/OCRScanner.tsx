import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ScanText, Loader2, Copy, Check, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface OCRResult {
  id: string;
  imageUrl: string;
  filename: string;
  extractedText: string;
  isEditing: boolean;
}

export const OCRScanner = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

      // Perform OCR
      const { data: { text } } = await worker.recognize(dataUrl);
      await worker.terminate();

      return {
        id: `${Date.now()}-${Math.random()}`,
        imageUrl: dataUrl,
        filename: file.name,
        extractedText: text.trim(),
        isEditing: false,
      };
    } catch (error) {
      console.error("OCR processing error:", error);
      return null;
    }
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProgress(0);
    const results: OCRResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        setProgressStatus(`Processing ${file.name} (${i + 1}/${files.length})...`);
        const result = await processImageWithOCR(file);
        
        if (result) {
          results.push(result);
        }
      }

      if (results.length > 0) {
        setOcrResults((prev) => [...prev, ...results]);
        toast.success(`Successfully extracted text from ${results.length} image(s)`);
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressStatus("");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFiles(acceptedFiles);
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

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Text copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const handleEdit = (id: string) => {
    setOcrResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, isEditing: true } : result
      )
    );
  };

  const handleSave = (id: string) => {
    setOcrResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, isEditing: false } : result
      )
    );
    toast.success("Changes saved");
  };

  const handleTextChange = (id: string, newText: string) => {
    setOcrResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, extractedText: newText } : result
      )
    );
  };

  const handleDelete = (id: string) => {
    setOcrResults((prev) => prev.filter((result) => result.id !== id));
    toast.success("Result removed");
  };

  const handleClearAll = () => {
    setOcrResults([]);
    toast.success("All results cleared");
  };

  return (
    <div className="space-y-8">
      {/* Upload Area */}
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
                  <ScanText className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-pulse" />
                ) : (
                  <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                )}
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                {isDragActive ? "Drop slip here" : "Upload Slip for OCR"}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                {isProcessing 
                  ? "Processing with OCR..."
                  : "Drag & drop slip images here, or click to select files"
                }
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">JPG</span>
              <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">PNG</span>
              <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">WEBP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="glass-strong rounded-2xl p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-premium)' }}>
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

      {/* OCR Results */}
      {ocrResults.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              Extracted Text <span className="text-primary">({ocrResults.length})</span>
            </h2>
            <Button 
              variant="outline" 
              onClick={handleClearAll}
              className="self-start sm:self-auto"
            >
              Clear All
            </Button>
          </div>

          <div className="grid gap-6">
            {ocrResults.map((result) => (
              <div
                key={result.id}
                className="glass-strong rounded-2xl overflow-hidden"
                style={{ boxShadow: 'var(--shadow-elegant)' }}
              >
                <div className="grid md:grid-cols-2 gap-4 p-4 sm:p-6">
                  {/* Image Preview */}
                  <div className="relative aspect-auto max-h-80 overflow-hidden rounded-xl border border-border">
                    <img
                      src={result.imageUrl}
                      alt={result.filename}
                      className="w-full h-full object-contain bg-muted/20"
                    />
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="inline-block px-2 py-1 text-xs rounded bg-background/80 backdrop-blur-sm border border-border truncate max-w-full">
                        {result.filename}
                      </span>
                    </div>
                  </div>

                  {/* Extracted Text */}
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">Extracted Text</h4>
                      <div className="flex gap-2">
                        {result.isEditing ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(result.id)}
                            className="gap-1"
                          >
                            <Save className="h-4 w-4" />
                            <span className="hidden sm:inline">Save</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(result.id)}
                            className="gap-1"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(result.id, result.extractedText)}
                          className="gap-1"
                        >
                          {copiedId === result.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Copy</span>
                        </Button>
                      </div>
                    </div>

                    {result.isEditing ? (
                      <Textarea
                        value={result.extractedText}
                        onChange={(e) => handleTextChange(result.id, e.target.value)}
                        className="flex-1 min-h-[200px] resize-none font-mono text-sm"
                        placeholder="No text detected..."
                      />
                    ) : (
                      <div className="flex-1 min-h-[200px] p-3 rounded-lg bg-muted/30 border border-border overflow-auto">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
                          {result.extractedText || "No text detected"}
                        </pre>
                      </div>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(result.id)}
                      className="self-start"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {ocrResults.length === 0 && !isProcessing && (
        <div className="text-center py-8 sm:py-12 text-muted-foreground">
          <p className="text-base sm:text-lg">
            Upload slip images to extract and edit text
          </p>
        </div>
      )}
    </div>
  );
};
