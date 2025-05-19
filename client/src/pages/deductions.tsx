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

interface DeductionFormData {
  employeeId: number | null;
  date: string | null;
  recordType: string;
  details?: string | null;
  amount: number;
  description?: string | null;
  notes?: string | null;
  documentImage?: string | null;
  approved: boolean;
}

export default function DeductionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [deductionIdToEdit, setDeductionIdToEdit] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<DeductionFormData>({
    employeeId: null,
    date: format(date, "yyyy-MM-dd"),
    recordType: "Deduction",
    details: null,
    amount: 0,
    description: null,
    notes: null,
    documentImage: null,
    approved: false
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Fetch deduction records
  const { data: deductionRecords = [], isLoading } = useQuery({
    queryKey: ['/api/payroll-records', { recordType: 'Deduction' }],
  });

  // Create deduction mutation
  const createDeduction = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/payroll-records", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Deduction record created successfully",
        variant: "default",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating deduction:", error);
      toast({
        title: "Error",
        description: `Failed to create deduction: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Update deduction mutation
  const updateDeduction = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest("PATCH", `/api/payroll-records/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Deduction record updated successfully",
        variant: "default",
      });
      setIsEditMode(false);
      setDeductionIdToEdit(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating deduction:", error);
      toast({
        title: "Error",
        description: `Failed to update deduction: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      employeeId: null,
      date: format(new Date(), "yyyy-MM-dd"),
      recordType: "Deduction",
      details: null,
      amount: 0,
      description: null,
      notes: null,
      documentImage: null,
      approved: false
    });
    setDate(new Date());
    setIsEditMode(false);
    setDeductionIdToEdit(null);
    setImagePreview(null);
  };
  
  // Handle editing an existing deduction record
  const handleEditDeduction = (deduction: any) => {
    // Set form data from the deduction record
    setFormData({
      employeeId: deduction.employeeId,
      date: deduction.date,
      recordType: "Deduction",
      details: deduction.details || null,
      amount: deduction.amount || 0,
      description: deduction.description || null,
      notes: deduction.notes || null,
      documentImage: deduction.documentImage || null,
      approved: deduction.approved || false
    });
    
    // Set date for calendar
    if (deduction.date) {
      setDate(new Date(deduction.date));
    }
    
    // Set document image preview if exists
    if (deduction.documentImage) {
      setImagePreview(deduction.documentImage);
    }
    
    // Set edit mode
    setIsEditMode(true);
    setDeductionIdToEdit(deduction.id);
    
    // Open the form
    setShowDeductionForm(true);
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
          filename: `deduction_doc_${Date.now()}.${file.name.split('.').pop()}`
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

  const handleSaveDeduction = async (e: React.MouseEvent) => {
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

    if (!formData.details) {
      toast({
        title: "Validation Error",
        description: "Please select deduction type",
        variant: "destructive",
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount greater than zero",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set the description field to match details for consistency
      const dataToSubmit = {
        ...formData,
        description: formData.details
      };
      
      // Submit the data - either create or update
      if (isEditMode && deductionIdToEdit) {
        await updateDeduction.mutateAsync({ id: deductionIdToEdit, data: dataToSubmit });
      } else {
        await createDeduction.mutateAsync(dataToSubmit);
      }
      
      // Force refetch all deduction records
      await queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      
      // Close the form dialog
      setShowDeductionForm(false);
    } catch (error) {
      console.error("Error saving deduction:", error);
      // Error is already handled by the mutation
    }
  };

  // Table configuration for deduction records
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
      header: "Deduction Type",
      cell: (info) => info.getValue() || info.row.original.description || "Not specified",
    }),
    columnHelper.accessor("amount", {
      header: "Amount",
      cell: (info) => {
        const amount = info.getValue();
        return amount ? `R ${amount.toFixed(2)}` : 'R 0.00';
      },
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
            onClick={() => handleEditDeduction(info.row.original)}
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
        title="Employee Deductions"
        description="Manage employee deduction records and documentation"
        actions={
          <Button 
            className="flex items-center gap-2"
            onClick={() => {
              resetForm();
              setShowDeductionForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Deduction Record
          </Button>
        }
      />

      {/* Deduction Form Dialog */}
      <Dialog open={showDeductionForm} onOpenChange={setShowDeductionForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>{isEditMode ? "Edit Deduction Record" : "Add Deduction Record"}</DialogTitle>
              <DialogClose>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription>
              Fill in the details for the employee deduction.
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
              <Label htmlFor="date">Deduction Date</Label>
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
              <Label htmlFor="details">Deduction Type</Label>
              <Select
                onValueChange={(value) => handleInputChange("details", value)}
                value={formData.details || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Deduction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SARS">SARS</SelectItem>
                  <SelectItem value="UIF">UIF</SelectItem>
                  <SelectItem value="PAYE">PAYE</SelectItem>
                  <SelectItem value="Medical Aid">Medical Aid</SelectItem>
                  <SelectItem value="Pension">Pension</SelectItem>
                  <SelectItem value="Staff Loan">Staff Loan</SelectItem>
                  <SelectItem value="Late Arrival">Late Arrival</SelectItem>
                  <SelectItem value="Uniform">Uniform</SelectItem>
                  <SelectItem value="Equipment Damage">Equipment Damage</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (R)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ""}
                onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes"
                placeholder="Add any additional details about the deduction..."
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documentImage">Supporting Document</Label>
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
              disabled={createDeduction.isPending || updateDeduction.isPending}
              onClick={handleSaveDeduction}
            >
              {createDeduction.isPending || updateDeduction.isPending ? 
                "Saving..." : 
                isEditMode ? "Update Deduction Record" : "Save Deduction Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Deduction Records</CardTitle>
          <CardDescription>View and manage all employee deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={deductionRecords.filter((record: any) => record.recordType === "Deduction")}
            searchPlaceholder="Search deduction records..."
            searchColumn="employeeName"
          />
        </CardContent>
      </Card>
    </div>
  );
}