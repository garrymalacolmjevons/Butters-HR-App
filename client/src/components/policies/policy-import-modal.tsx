import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { parseCSV, getPolicyCsvParseOptions, type PolicyCsvRow } from "@/lib/policy-csv-parser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileType, AlertCircle, List } from "lucide-react";

interface PolicyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PolicyImportModal({ isOpen, onClose, onSuccess }: PolicyImportModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [addNew, setAddNew] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        // First parse the CSV file to validate its contents locally
        // This will catch basic format errors before sending to server
        await parseCSV(file, getPolicyCsvParseOptions());
        
        // If local parsing is successful, send the raw CSV to the server
        const csvString = await file.text();
        
        // Send the raw CSV data
        const response = await fetch("/api/policies/import", {
          method: "POST",
          body: csvString,
          headers: {
            "Content-Type": "text/csv",
          },
          credentials: "include",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to import policies");
        }
        
        return await response.json();
      } catch (error: any) {
        console.error("Import error:", error);
        if (error.details && Array.isArray(error.details)) {
          setParseErrors(error.details);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Imported ${data.created} new policies and updated ${data.updated} existing policies.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      onSuccess();
      handleClose();
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to import policies");
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import policies",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
      setParseErrors([]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
      setParseErrors([]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = () => {
    if (!selectedFile) {
      setError("Please select a file to import");
      return;
    }
    
    importMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setParseErrors([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Policies</DialogTitle>
          <DialogDescription>
            Import insurance policy data from a CSV file.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parseErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p>CSV parsing errors:</p>
              <ul className="list-disc pl-5 mt-2 text-xs">
                {parseErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label>Import Options</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="update-existing" 
                  checked={updateExisting} 
                  onCheckedChange={(checked) => setUpdateExisting(!!checked)} 
                />
                <Label htmlFor="update-existing" className="text-sm">Update existing policies</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="add-new" 
                  checked={addNew} 
                  onCheckedChange={(checked) => setAddNew(!!checked)} 
                />
                <Label htmlFor="add-new" className="text-sm">Add new policies</Label>
              </div>
            </div>
          </div>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              selectedFile ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center space-y-2">
              {selectedFile ? (
                <>
                  <FileType className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <p className="text-xs text-primary/70">Click to change file</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm font-medium">Drag & drop a CSV file here</p>
                  <p className="text-xs text-gray-500">or click to browse files</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <div className="flex items-start gap-2">
              <List className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-medium mb-1">CSV Requirements:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Must contain Employee Code, Company, Value/Amount, and Status columns</li>
                  <li>Policy Number should be in the Comment/Notes column</li>
                  <li>Status should be "Active" or "Cancelled"</li>
                  <li>Value/Amount should be in number format or as currency with 'R' prefix</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}