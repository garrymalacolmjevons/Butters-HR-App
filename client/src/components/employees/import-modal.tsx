import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { parseCSV, getCsvParseOptions } from "@/lib/csv-parser";
import { ImportEmployee } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileType, AlertCircle } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [company, setCompany] = useState<string>("detect");
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [addNew, setAddNew] = useState<boolean>(true);
  const [archiveMissing, setArchiveMissing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        // First parse the CSV file to validate its contents locally
        // This will catch basic format errors before sending to server
        await parseCSV(file, getCsvParseOptions());
        
        // If local parsing is successful, send the raw CSV to the server
        const csvString = await file.text();
        
        // Send the raw CSV data
        const response = await fetch("/api/employees/import", {
          method: "POST",
          body: csvString,
          headers: {
            "Content-Type": "text/csv",
          },
          credentials: "include",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to import employees");
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
        description: `Imported ${data.created} new employees and updated ${data.updated} existing employees.`,
      });
      onSuccess();
      handleClose();
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to import employees");
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import employees",
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
    console.log("ImportModal closing");
    setSelectedFile(null);
    setError(null);
    setParseErrors([]);
    setCompany("detect");
    setUpdateExisting(true);
    setAddNew(true);
    setArchiveMissing(false);
    onClose();
  };
  
  // Debugging
  useEffect(() => {
    console.log("ImportModal mounted, isOpen:", isOpen);
  }, []);
  
  // Monitor open state changes
  useEffect(() => {
    console.log("ImportModal open state changed:", isOpen);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Employee Data from VIP</DialogTitle>
          <DialogDescription>
            Import employee data from VIP Payroll system. This will update existing employee records and add new employees.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parseErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
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

        <div
          className="border border-neutral-300 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-neutral-50"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600 mb-2">
            {selectedFile ? selectedFile.name : "Drag and drop VIP export file here"}
          </p>
          <p className="text-neutral-500 text-sm mb-4">or</p>
          <Button type="button">Browse Files</Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />
          <p className="text-neutral-500 text-xs mt-4">Supported formats: .csv</p>
        </div>

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
                <Label htmlFor="update-existing" className="text-sm">Update existing employees</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="add-new" 
                  checked={addNew} 
                  onCheckedChange={(checked) => setAddNew(!!checked)} 
                />
                <Label htmlFor="add-new" className="text-sm">Add new employees</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="archive-missing" 
                  checked={archiveMissing} 
                  onCheckedChange={(checked) => setArchiveMissing(!!checked)} 
                />
                <Label htmlFor="archive-missing" className="text-sm">Archive employees not in import file</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Detect from import file" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detect">Detect from import file</SelectItem>
                <SelectItem value="Butters">Butters</SelectItem>
                <SelectItem value="Makana">Makana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
          >
            {importMutation.isPending ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
