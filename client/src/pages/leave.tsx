import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PayrollRecord, InsertPayrollRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { PageHeader, PageHeaderAction } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LeaveTable } from "@/components/leave/leave-table";
import { LeaveForm } from "@/components/leave/leave-form";
import { LeaveSummary } from "@/components/leave/leave-summary";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Type for leave records with employee info
type LeaveRecordWithExtras = PayrollRecord & { employeeName: string; company: string };

export default function Leave() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [companyFilter, setCompanyFilter] = useState<string>("All Companies");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("All Leave Types");
  const [statusFilter, setStatusFilter] = useState<string>("All Status");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  
  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState<boolean>(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecordWithExtras | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // Check if new leave should be created based on URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1]);
    if (searchParams.get("action") === "new") {
      setFormMode("create");
      setSelectedLeave(null);
      setIsLeaveFormOpen(true);
      // Remove the query parameter from the URL
      setLocation("/leave", { replace: true });
    }
  }, [location]);
  
  // Initialize the date range to current month if not set
  useEffect(() => {
    if (!startDateFilter && !endDateFilter) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setStartDateFilter(firstDayOfMonth.toISOString().split('T')[0]);
      setEndDateFilter(lastDayOfMonth.toISOString().split('T')[0]);
    }
  }, []);
  
  // Build filter object for API
  const buildFilter = () => {
    const filter: Record<string, any> = {};
    if (companyFilter !== "All Companies") filter.company = companyFilter;
    if (leaveTypeFilter !== "All Leave Types") filter.leaveType = leaveTypeFilter;
    if (statusFilter !== "All Status") filter.status = statusFilter;
    if (startDateFilter) filter.startDate = startDateFilter;
    if (endDateFilter) filter.endDate = endDateFilter;
    return filter;
  };
  
  // Fetch leave records
  const { data: leaveRecords = [], isLoading: isLoadingLeaves } = useQuery<LeaveRecordWithExtras[]>({
    queryKey: ["/api/leave", buildFilter()],
  });
  
  // Calculate summary data
  const leaveSummary = {
    annual: {
      total: leaveRecords.filter(l => l.subType === "Annual Leave").length,
      butters: leaveRecords.filter(l => l.subType === "Annual Leave" && l.company === "Butters").length,
      makana: leaveRecords.filter(l => l.subType === "Annual Leave" && l.company === "Makana").length,
    },
    sick: {
      total: leaveRecords.filter(l => l.subType === "Sick Leave").length,
      butters: leaveRecords.filter(l => l.subType === "Sick Leave" && l.company === "Butters").length,
      makana: leaveRecords.filter(l => l.subType === "Sick Leave" && l.company === "Makana").length,
    },
    unpaid: {
      total: leaveRecords.filter(l => l.subType === "Unpaid Leave").length,
      butters: leaveRecords.filter(l => l.subType === "Unpaid Leave" && l.company === "Butters").length,
      makana: leaveRecords.filter(l => l.subType === "Unpaid Leave" && l.company === "Makana").length,
    },
    pending: {
      total: leaveRecords.filter(l => l.status === "Pending").length,
      butters: leaveRecords.filter(l => l.status === "Pending" && l.company === "Butters").length,
      makana: leaveRecords.filter(l => l.status === "Pending" && l.company === "Makana").length,
    },
  };
  
  // Create leave mutation
  const createLeaveMutation = useMutation({
    mutationFn: (data: InsertPayrollRecord) => 
      apiRequest("/api/leave", {
        method: "POST", 
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Leave record created",
        description: "The leave record has been created successfully",
      });
      setIsLeaveFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating leave record",
        description: error.message,
      });
    },
  });
  
  // Update leave mutation
  const updateLeaveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertPayrollRecord> }) => 
      apiRequest(`/api/leave/${id}`, {
        method: "PATCH", 
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Leave record updated",
        description: "The leave record has been updated successfully",
      });
      setIsLeaveFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error updating leave record",
        description: error.message,
      });
    },
  });
  
  // Delete leave mutation
  const deleteLeaveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/leave/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Leave record deleted",
        description: "The leave record has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error deleting leave record",
        description: error.message,
      });
    },
  });
  
  const handleCreateLeave = () => {
    setFormMode("create");
    setSelectedLeave(null);
    setIsLeaveFormOpen(true);
  };
  
  const handleEditLeave = (leave: LeaveRecordWithExtras) => {
    setFormMode("edit");
    setSelectedLeave(leave);
    setIsLeaveFormOpen(true);
  };
  
  const handleViewLeave = (leave: LeaveRecordWithExtras) => {
    toast({
      title: "View Leave Record",
      description: `Viewing leave record for ${leave.employeeName}`,
    });
    // View functionality could be added here
  };
  
  const handleDeleteLeave = (leave: LeaveRecordWithExtras) => {
    if (window.confirm(`Are you sure you want to delete the leave record for ${leave.employeeName}?`)) {
      deleteLeaveMutation.mutate(leave.id);
    }
  };
  
  const handleFormSubmit = (values: any) => {
    // Convert any date objects to strings for consistent API handling
    const formattedValues = {
      ...values,
      date: values.date ? (typeof values.date === 'string' ? values.date : values.date.toISOString().split('T')[0]) : undefined,
      startDate: values.startDate ? (typeof values.startDate === 'string' ? values.startDate : values.startDate.toISOString().split('T')[0]) : undefined,
      endDate: values.endDate ? (typeof values.endDate === 'string' ? values.endDate : values.endDate.toISOString().split('T')[0]) : undefined,
    };
    
    console.log("Form submission with formatted values:", formattedValues);
    
    if (formMode === "create") {
      createLeaveMutation.mutate(formattedValues);
    } else if (selectedLeave) {
      updateLeaveMutation.mutate({ id: selectedLeave.id, data: formattedValues });
    }
  };
  
  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
  };
  
  return (
    <div className="p-6">
      <PageHeader
        title="Leave Management"
        actions={
          <Button onClick={handleCreateLeave} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Leave Record</span>
          </Button>
        }
      />
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-2">
            <span className="font-medium">Filters:</span>
            <div className="flex flex-wrap gap-2">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Companies">All Companies</SelectItem>
                  <SelectItem value="Butters">Butters</SelectItem>
                  <SelectItem value="Makana">Makana</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="All Leave Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Leave Types">All Leave Types</SelectItem>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                  <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                  <SelectItem value="Compassionate Leave">Compassionate Leave</SelectItem>
                  <SelectItem value="Study Leave">Study Leave</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm">Date Range:</label>
                <Input 
                  type="date" 
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)} 
                  className="w-auto" 
                />
                <span>-</span>
                <Input 
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleApplyFilters}
            className="flex items-center space-x-2"
          >
            <span>Apply Filters</span>
          </Button>
        </div>
        
        <LeaveTable
          data={leaveRecords}
          isLoading={isLoadingLeaves}
          onEdit={handleEditLeave}
          onView={handleViewLeave}
          onDelete={handleDeleteLeave}
        />
      </div>
      
      {/* Leave Summary Cards */}
      <LeaveSummary 
        annual={leaveSummary.annual}
        sick={leaveSummary.sick}
        unpaid={leaveSummary.unpaid}
        pending={leaveSummary.pending}
        isLoading={isLoadingLeaves}
      />
      
      {/* Leave Form Dialog */}
      <LeaveForm
        isOpen={isLeaveFormOpen}
        onClose={() => setIsLeaveFormOpen(false)}
        onSubmit={handleFormSubmit}
        defaultValues={selectedLeave ? {
          ...selectedLeave,
          // Set values directly as strings since they're already in string format from the API
          date: selectedLeave.date || '',
          startDate: selectedLeave.startDate || '',
          endDate: selectedLeave.endDate || '',
        } : undefined}
        isSubmitting={createLeaveMutation.isPending || updateLeaveMutation.isPending}
        title={formMode === "create" ? "Add Leave Record" : "Edit Leave Record"}
      />
    </div>
  );
}
