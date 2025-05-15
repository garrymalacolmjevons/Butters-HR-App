import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { parseCSV, getCsvParseOptions } from "@/lib/csv-parser";
import { ImportEmployee } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, FileType, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

// Standalone import page for direct access
export default function ImportPage() {
  const [location, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [company, setCompany] = useState<string>("detect");
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [addNew, setAddNew] = useState<boolean>(true);
  const [archiveMissing, setArchiveMissing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        // First parse the CSV file to validate its contents locally
        // This will catch basic format errors before sending to server
        await parseCSV(file, getCsvParseOptions());
        
        // If local parsing is successful, send the raw CSV to the server
        const csvString = await file.text();
        
        console.log("Sending CSV data to server, first 200 chars:", csvString.substring(0, 200));
        
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
      
      // Invalidate employees query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      
      // Redirect to employees page
      setLocation("/employees");
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
    
    console.log("Selected file:", selectedFile.name, "size:", selectedFile.size);
    importMutation.mutate(selectedFile);
  };

  const handleCancel = () => {
    setLocation("/employees");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader
          title="Import Employee Data"
          description="Import employee data from VIP Payroll system"
          actions={
            <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Employees
            </Button>
          }
        />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Import from VIP</CardTitle>
            <CardDescription>
              This will update existing employee records and add new employees.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
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
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : "Import Data"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}