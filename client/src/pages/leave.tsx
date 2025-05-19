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
import { format, differenceInDays, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

interface LeaveFormData {
  employeeId: number | null;
  date: string | null;
  recordType: string;
  startDate?: string | null;
  endDate?: string | null;
  totalDays?: number | null;
  status: string;
  details?: string | null;
  notes?: string | null;
  documentImage?: string | null;
  approved: boolean;
}

export default function LeavePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [leaveIdToEdit, setLeaveIdToEdit] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<LeaveFormData>({
    employeeId: null,
    date: format(date, "yyyy-MM-dd"),
    recordType: "Leave",
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    totalDays: 1,
    status: "Pending",
    details: null,
    notes: null,
    documentImage: null,
    approved: false
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Fetch leave records
  const { data: leaveRecords = [], isLoading } = useQuery({
    queryKey: ['/api/payroll-records', { recordType: 'Leave' }],
  });

  // Create leave mutation
  const createLeave = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/payroll-records", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Leave record created successfully",
        variant: "default",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating leave:", error);
      toast({
        title: "Error",
        description: `Failed to create leave: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Update leave mutation
  const updateLeave = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest("PATCH", `/api/payroll-records/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Leave record updated successfully",
        variant: "default",
      });
      setIsEditMode(false);
      setLeaveIdToEdit(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating leave:", error);
      toast({
        title: "Error",
        description: `Failed to update leave: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      employeeId: null,
      date: format(new Date(), "yyyy-MM-dd"),
      recordType: "Leave",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      totalDays: 1,
      status: "Pending",
      details: null,
      notes: null,
      documentImage: null,
      approved: false
    });
    setDate(new Date());
    setStartDate(new Date());
    setEndDate(new Date());
    setIsEditMode(false);
    setLeaveIdToEdit(null);
    setImagePreview(null);
  };
  
  // Handle editing an existing leave record
  const handleEditLeave = (leave: any) => {
    // Set form data from the leave record
    setFormData({
      employeeId: leave.employeeId,
      date: leave.date,
      recordType: "Leave",
      startDate: leave.startDate || leave.date,
      endDate: leave.endDate || leave.date,
      totalDays: leave.totalDays || 1,
      status: leave.status || "Pending",
      details: leave.details || null,
      notes: leave.notes || null,
      documentImage: leave.documentImage || null,
      approved: leave.approved || false
    });
    
    // Set dates for calendar
    if (leave.date) {
      setDate(new Date(leave.date));
    }
    if (leave.startDate) {
      setStartDate(new Date(leave.startDate));
    }
    if (leave.endDate) {
      setEndDate(new Date(leave.endDate));
    }
    
    // Set document image preview if exists
    if (leave.documentImage) {
      setImagePreview(leave.documentImage);
    }
    
    // Set edit mode
    setIsEditMode(true);
    setLeaveIdToEdit(leave.id);
    
    // Open the form
    setShowLeaveForm(true);
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

  const handleStartDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setStartDate(selectedDate);
      setFormData(prev => {
        const newStartDate = format(selectedDate, "yyyy-MM-dd");
        const currentEndDate = prev.endDate ? new Date(prev.endDate) : new Date();
        
        // Calculate new total days
        const daysDiff = differenceInDays(
          currentEndDate,
          selectedDate
        ) + 1;
        
        return {
          ...prev,
          startDate: newStartDate,
          totalDays: daysDiff > 0 ? daysDiff : 1
        };
      });
    }
  };

  const handleEndDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setEndDate(selectedDate);
      setFormData(prev => {
        const currentStartDate = prev.startDate ? new Date(prev.startDate) : new Date();
        const newEndDate = format(selectedDate, "yyyy-MM-dd");
        
        // Calculate new total days
        const daysDiff = differenceInDays(
          selectedDate,
          currentStartDate
        ) + 1;
        
        return {
          ...prev,
          endDate: newEndDate,
          totalDays: daysDiff > 0 ? daysDiff : 1
        };
      });
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
          filename: `leave_doc_${Date.now()}.${file.name.split('.').pop()}`
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

  const handleSaveLeave = async (e: React.MouseEvent) => {
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

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (!formData.details) {
      toast({
        title: "Validation Error",
        description: "Please enter leave type details",
        variant: "destructive",
      });
      return;
    }

    try {
      // Submit the data - either create or update
      if (isEditMode && leaveIdToEdit) {
        await updateLeave.mutateAsync({ id: leaveIdToEdit, data: formData });
      } else {
        await createLeave.mutateAsync(formData);
      }
      
      // Force refetch all leave records
      await queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      
      // Close the form dialog
      setShowLeaveForm(false);
    } catch (error) {
      console.error("Error saving leave:", error);
      // Error is already handled by the mutation
    }
  };

  // Table configuration for leave records
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
    columnHelper.accessor("details", {
      header: "Leave Type",
      cell: (info) => info.getValue() || "Not specified",
    }),
    columnHelper.accessor("startDate", {
      header: "Start Date",
      cell: (info) => {
        const startDate = info.getValue();
        return startDate ? format(new Date(startDate), "dd MMM yyyy") : format(new Date(info.row.original.date), "dd MMM yyyy");
      },
    }),
    columnHelper.accessor("endDate", {
      header: "End Date",
      cell: (info) => {
        const endDate = info.getValue();
        return endDate ? format(new Date(endDate), "dd MMM yyyy") : format(new Date(info.row.original.date), "dd MMM yyyy");
      },
    }),
    columnHelper.accessor("totalDays", {
      header: "Days",
      cell: (info) => info.getValue() || 1,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        if (!status) return <Badge variant="outline">Not Set</Badge>;
        
        const variant = 
          status === "Approved" ? "success" : 
          status === "Rejected" ? "destructive" : 
          "outline";
        
        return <Badge variant={variant}>{status}</Badge>;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEditLeave(info.row.original)}
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
        title="Leave Management"
        description="Manage employee leave requests, approvals, and documentation"
        actions={
          <Button 
            className="flex items-center gap-2"
            onClick={() => {
              resetForm();
              setShowLeaveForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Leave Record
          </Button>
        }
      />

      {/* Leave Form Dialog */}
      <Dialog open={showLeaveForm} onOpenChange={setShowLeaveForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>{isEditMode ? "Edit Leave Record" : "Add Leave Record"}</DialogTitle>
              <DialogClose>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription>
              Fill in the details for the leave request.
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
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="details">Leave Type</Label>
                <Select
                  onValueChange={(value) => handleInputChange("details", value)}
                  value={formData.details || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Leave Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                    <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                    <SelectItem value="Compassionate Leave">Compassionate Leave</SelectItem>
                    <SelectItem value="Study Leave">Study Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalDays">Total Days</Label>
                <Input 
                  id="totalDays"
                  type="number"
                  placeholder="0"
                  min="1"
                  step="1"
                  value={formData.totalDays || ""}
                  onChange={(e) => handleInputChange("totalDays", parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(value) => handleInputChange("status", value)}
                  value={formData.status || "Pending"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes"
                placeholder="Add any additional notes or comments..."
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documentImage">Leave Document (Signed Form)</Label>
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
              disabled={createLeave.isPending || updateLeave.isPending}
              onClick={handleSaveLeave}
            >
              {createLeave.isPending || updateLeave.isPending ? 
                "Saving..." : 
                isEditMode ? "Update Leave Record" : "Save Leave Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Leave Records</CardTitle>
          <CardDescription>View and manage all leave records</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={leaveRecords.filter((record: any) => record.recordType === "Leave")}
            searchPlaceholder="Search leave records..."
            searchColumn="employeeName"
          />
        </CardContent>
      </Card>
    </div>
  );
}