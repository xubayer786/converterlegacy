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
      className={`relative rounded-xl border-2 border-dashed transition-all duration-300 ${
        isDragging
          ? "border-primary bg-primary/10 scale-105"
          : "border-border/50 bg-card hover:border-primary/50 hover:bg-card/80"
      }`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center py-16 px-6 cursor-pointer">
        <input
          type="file"
          multiple
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="mb-4 rounded-full bg-primary/10 p-6">
          {isDragging ? (
            <FileText className="h-12 w-12 text-primary animate-pulse" />
          ) : (
            <Upload className="h-12 w-12 text-primary" />
          )}
        </div>

        <h3 className="mb-2 text-xl font-semibold">
          {isDragging ? "Drop files here" : "Upload PDF Invoices"}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Drag & drop PDF files here or click to browse. Conversion starts automatically.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Supports bulk upload • Multi-page PDFs supported
        </p>
      </label>
    </div>
  );
};
