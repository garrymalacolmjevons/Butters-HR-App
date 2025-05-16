import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, File, X, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onUploadComplete: (fileUrls: string[]) => void;
  label?: string;
  maxFiles?: number;
  acceptedFileTypes?: string;
  className?: string;
}

export function FileUpload({
  onUploadComplete,
  label = "Upload Documents",
  maxFiles = 5,
  acceptedFileTypes = "",
  className = "",
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    // Convert FileList to array and check max files limit
    const fileArray = Array.from(e.target.files);
    if (fileArray.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload a maximum of ${maxFiles} files at once.`,
        variant: "destructive",
      });
      return;
    }
    
    setFiles(fileArray);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!files.length) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/uploads");
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          onUploadComplete(response.fileIds);
          toast({
            title: "Upload successful",
            description: `${files.length} file(s) uploaded successfully.`,
          });
          setFiles([]);
          clearFileInput();
        } else {
          throw new Error("Upload failed");
        }
      };

      xhr.onerror = function() {
        throw new Error("Upload failed");
      };

      xhr.onloadend = function() {
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col space-y-2">
        <Label>{label}</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors duration-200">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={acceptedFileTypes}
            className="hidden"
            disabled={isUploading}
          />
          <div 
            className="flex flex-col items-center cursor-pointer" 
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={42} className="text-gray-500 mb-2" />
            <p className="text-sm font-medium mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              {acceptedFileTypes ? `Supported formats: ${acceptedFileTypes}` : "All file types supported"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Up to {maxFiles} file(s), max 10MB each
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <Label>Selected Files</Label>
          <div className="border rounded-md divide-y">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`} 
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center space-x-2">
                  <File size={18} className="text-blue-500" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <X size={16} className="text-gray-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          {isUploading ? (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Loader2 className="animate-spin mr-2" size={16} />
                Uploading... {uploadProgress}%
              </div>
            </div>
          ) : (
            <Button 
              onClick={handleUpload} 
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Upload {files.length} file{files.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}