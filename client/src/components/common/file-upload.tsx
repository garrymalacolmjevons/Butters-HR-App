import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  supportedFormats?: string;
  maxSize?: number; // in MB
}

export function FileUpload({
  onFileSelect,
  accept = "*",
  label = "Drag and drop file here",
  supportedFormats = "All file types supported",
  maxSize = 10
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        setError(`File size exceeds ${maxSize}MB limit`);
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        setError(`File size exceeds ${maxSize}MB limit`);
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="w-full">
      {error && (
        <div className="text-red-500 text-sm mb-2">{error}</div>
      )}
      
      <div
        className="border border-neutral-300 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-neutral-50"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
        <p className="text-neutral-600 mb-2">
          {selectedFile ? selectedFile.name : label}
        </p>
        <p className="text-neutral-500 text-sm mb-4">or</p>
        <Button type="button">Browse Files</Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
        />
        <p className="text-neutral-500 text-xs mt-4">Supported formats: {supportedFormats}</p>
      </div>
    </div>
  );
}