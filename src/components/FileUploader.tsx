import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export const FileUploader = ({ onFilesSelected }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === "application/pdf"
      );

      if (files.length === 0) {
        toast.error("Please upload PDF files only");
        return;
      }

      onFilesSelected(files);
      toast.success(`${files.length} PDF file(s) uploaded`);
    },
    [onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesSelected(files);
        toast.success(`${files.length} PDF file(s) uploaded`);
      }
      e.target.value = "";
    },
    [onFilesSelected]
  );

  return (
    <div
      className={`glass-strong relative rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all duration-500 ${
        isDragging
          ? "border-primary bg-primary/20 scale-[1.02] sm:scale-105"
          : "border-border/30 hover:border-primary/50"
      }`}
      style={{ boxShadow: isDragging ? 'var(--shadow-glow)' : 'var(--shadow-card)' }}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 cursor-pointer">
        <input
          type="file"
          multiple
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className={`mb-4 sm:mb-6 rounded-full bg-primary/10 p-4 sm:p-6 transition-all duration-300 ${
          isDragging ? 'scale-110' : 'scale-100'
        }`}>
          {isDragging ? (
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-pulse" />
          ) : (
            <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          )}
        </div>

        <h3 className="mb-2 text-lg sm:text-xl lg:text-2xl font-semibold text-center">
          {isDragging ? "Drop files here" : "Upload PDF Invoices"}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-sm px-4">
          Drag & drop PDF files here or click to browse. Conversion starts automatically.
        </p>
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-md bg-primary/5 border border-primary/20">Bulk upload</span>
          <span className="px-2 py-1 rounded-md bg-primary/5 border border-primary/20">Multi-page PDFs</span>
        </div>
      </label>
    </div>
  );
};
