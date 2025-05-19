import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, CalendarIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

interface TerminationFormData {
  employeeId: number | null;
  date: string | null;
  recordType: string;
  details?: string | null;
  reason?: string | null;
  notes?: string | null;
  documentImage?: string | null;
  approved: boolean;
}

export default function TerminationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [terminationIdToEdit, setTerminationIdToEdit] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<TerminationFormData>({
    employeeId: null,
    date: format(date, "yyyy-MM-dd"),
    recordType: "Termination",
    details: null,
    reason: null,
    notes: null,
    documentImage: null,
    approved: false
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Fetch termination records
  const { data: terminationRecords = [], isLoading } = useQuery({
    queryKey: ['/api/payroll-records', { recordType: 'Termination' }],
  });

  // Create termination mutation
  const createTermination = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/payroll-records", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Termination record created successfully",
        variant: "default",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating termination:", error);
      toast({
        title: "Error",
        description: `Failed to create termination: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Update termination mutation
  const updateTermination = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest("PATCH", `/api/payroll-records/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Termination record updated successfully",
        variant: "default",
      });
      setIsEditMode(false);
      setTerminationIdToEdit(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating termination:", error);
      toast({
        title: "Error",
        description: `Failed to update termination: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      employeeId: null,
      date: format(new Date(), "yyyy-MM-dd"),
      recordType: "Termination",
      details: null,
      reason: null,
      notes: null,
      documentImage: null,
      approved: false
    });
    setDate(new Date());
    setIsEditMode(false);
    setTerminationIdToEdit(null);
    setImagePreview(null);
  };
  
  // Handle editing an existing termination record
  const handleEditTermination = (termination: any) => {
    // Set form data from the termination record
    setFormData({
      employeeId: termination.employeeId,
      date: termination.date,
      recordType: "Termination",
      details: termination.details || null,
      reason: termination.reason || termination.description || null,
      notes: termination.notes || null,
      documentImage: termination.documentImage || null,
      approved: termination.approved || false
    });
    
    // Set date for calendar
    if (termination.date) {
      setDate(new Date(termination.date));
    }
    
    // Set document image preview if exists
    if (termination.documentImage) {
      setImagePreview(termination.documentImage);
    }
    
    // Set edit mode
    setIsEditMode(true);
    setTerminationIdToEdit(termination.id);
    
    // Open the form
    setShowTerminationForm(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setFormData(prev => ({
        ...prev,
        date: format(selectedDate, "yyyy-MM-dd")
      }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept images
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      
      // Set preview
      setImagePreview(base64String);
      
      try {
        // Upload the image to server
        const response = await apiRequest("POST", "/api/uploads/base64", {
          image: base64String,
          filename: `termination_doc_${Date.now()}.${file.name.split('.').pop()}`
        });
        
        const result = await response.json();
        
        if (result.fileUrl) {
          // Update form data with the file URL
          handleInputChange("documentImage", result.fileUrl);
          toast({
            title: "Success",
            description: "Document uploaded successfully",
          });
        }
      } catch (error) {
        console.error("Error uploading document:", error);
        toast({
          title: "Error",
          description: "Failed to upload document",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleSaveTermination = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.employeeId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    if (!formData.date) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.reason) {
      toast({
        title: "Validation Error",
        description: "Please enter termination reason",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save the reason as details for consistency
      const dataToSubmit = {
        ...formData,
        details: formData.reason,
        description: formData.reason
      };
      
      // Submit the data - either create or update
      if (isEditMode && terminationIdToEdit) {
        await updateTermination.mutateAsync({ id: terminationIdToEdit, data: dataToSubmit });
      } else {
        await createTermination.mutateAsync(dataToSubmit);
      }
      
      // Force refetch all termination records
      await queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      
      // Close the form dialog
      setShowTerminationForm(false);
    } catch (error) {
      console.error("Error saving termination:", error);
      // Error is already handled by the mutation
    }
  };

  // Table configuration for termination records
  const columnHelper = createColumnHelper<any>();
  
  const columns = [
    columnHelper.accessor("employeeCode", {
      header: "Emp. Code",
      cell: (info) => info.getValue() || `-`,
    }),
    columnHelper.accessor("employeeName", {
      header: "Employee",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("date", {
      header: "Date",
      cell: (info) => format(new Date(info.getValue()), "dd MMM yyyy"),
    }),
    columnHelper.accessor("details", {
      header: "Reason",
      cell: (info) => info.getValue() || info.row.original.description || "Not specified",
    }),
    columnHelper.accessor("approved", {
      header: "Approved",
      cell: (info) => info.getValue() ? 
        <Badge variant="success">Yes</Badge> : 
        <Badge variant="outline">No</Badge>,
    }),
    columnHelper.accessor("hasBeenExported", {
      header: "Exported",
      cell: (info) => info.getValue() ? 
        <Badge variant="success">Yes</Badge> : 
        <Badge variant="outline">No</Badge>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEditTermination(info.row.original)}
          >
            Edit
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Employee Terminations"
        description="Manage employee termination records and documentation"
        actions={
          <Button 
            className="flex items-center gap-2"
            onClick={() => {
              resetForm();
              setShowTerminationForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Termination Record
          </Button>
        }
      />

      {/* Termination Form Dialog */}
      <Dialog open={showTerminationForm} onOpenChange={setShowTerminationForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>{isEditMode ? "Edit Termination Record" : "Add Termination Record"}</DialogTitle>
              <DialogClose>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription>
              Fill in the details for the employee termination.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select
                onValueChange={(value) => handleInputChange("employeeId", parseInt(value))}
                value={formData.employeeId?.toString() || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(employees) ? employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName} ({employee.employeeCode})
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Termination Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Termination Reason</Label>
              <Select
                onValueChange={(value) => handleInputChange("reason", value)}
                value={formData.reason || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resignation">Resignation</SelectItem>
                  <SelectItem value="End of Contract">End of Contract</SelectItem>
                  <SelectItem value="Retirement">Retirement</SelectItem>
                  <SelectItem value="Dismissal">Dismissal</SelectItem>
                  <SelectItem value="Retrenchment">Retrenchment</SelectItem>
                  <SelectItem value="Mutual Agreement">Mutual Agreement</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes"
                placeholder="Add any additional details about the termination..."
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documentImage">Termination Document</Label>
              <Input 
                id="documentImage"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
              />
              
              {imagePreview && (
                <div className="mt-2 border rounded-md p-2">
                  <img 
                    src={imagePreview} 
                    alt="Document Preview" 
                    className="max-h-40 mx-auto"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="approved"
                checked={formData.approved}
                onCheckedChange={(checked) => handleInputChange("approved", checked)}
              />
              <Label htmlFor="approved">Mark as Approved</Label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit"
              disabled={createTermination.isPending || updateTermination.isPending}
              onClick={handleSaveTermination}
            >
              {createTermination.isPending || updateTermination.isPending ? 
                "Saving..." : 
                isEditMode ? "Update Termination Record" : "Save Termination Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Termination Records</CardTitle>
          <CardDescription>View and manage all employee terminations</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={terminationRecords.filter((record: any) => record.recordType === "Termination")}
            searchPlaceholder="Search termination records..."
            searchColumn="employeeName"
          />
        </CardContent>
      </Card>
    </div>
  );
}