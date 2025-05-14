import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { OvertimeRecord, InsertOvertimeRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { PageHeader, PageHeaderAction } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { OvertimeTable } from "@/components/overtime/overtime-table";
import { OvertimeForm } from "@/components/overtime/overtime-form";
import { Card, CardContent } from "@/components/ui/card";

// Type for overtime records with employee info
type OvertimeRecordWithExtras = OvertimeRecord & { employeeName: string; company: string };

export default function Overtime() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [companyFilter, setCompanyFilter] = useState<string>("All Companies");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecordWithExtras | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // Check if new overtime should be created based on URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1]);
    if (searchParams.get("action") === "new") {
      setFormMode("create");
      setSelectedRecord(null);
      setIsFormOpen(true);
      // Remove the query parameter from the URL
      setLocation("/overtime", { replace: true });
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
    if (startDateFilter) filter.startDate = startDateFilter;
    if (endDateFilter) filter.endDate = endDateFilter;
    return filter;
  };
  
  // Fetch overtime records
  const { data: overtimeRecords = [], isLoading } = useQuery<OvertimeRecordWithExtras[]>({
    queryKey: ["/api/overtime", buildFilter()],
  });
  
  // Calculate summary data
  const totalHours = overtimeRecords.reduce((sum, record) => sum + record.hours, 0);
  const totalButtersHours = overtimeRecords
    .filter(record => record.company === "Butters")
    .reduce((sum, record) => sum + record.hours, 0);
  const totalMakanaHours = overtimeRecords
    .filter(record => record.company === "Makana")
    .reduce((sum, record) => sum + record.hours, 0);
  
  // Create overtime mutation
  const createOvertimeMutation = useMutation({
    mutationFn: async (data: InsertOvertimeRecord) => {
      const res = await apiRequest("POST", "/api/overtime", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Overtime record created",
        description: "The overtime record has been created successfully",
      });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating overtime record",
        description: error.message,
      });
    },
  });
  
  // Update overtime mutation
  const updateOvertimeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertOvertimeRecord> }) => {
      const res = await apiRequest("PUT", `/api/overtime/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Overtime record updated",
        description: "The overtime record has been updated successfully",
      });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error updating overtime record",
        description: error.message,
      });
    },
  });
  
  // Delete overtime mutation
  const deleteOvertimeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/overtime/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Overtime record deleted",
        description: "The overtime record has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error deleting overtime record",
        description: error.message,
      });
    },
  });
  
  const handleCreateOvertime = () => {
    setFormMode("create");
    setSelectedRecord(null);
    setIsFormOpen(true);
  };
  
  const handleEditOvertime = (record: OvertimeRecordWithExtras) => {
    setFormMode("edit");
    setSelectedRecord(record);
    setIsFormOpen(true);
  };
  
  const handleViewOvertime = (record: OvertimeRecordWithExtras) => {
    toast({
      title: "View Overtime Record",
      description: `Viewing overtime record for ${record.employeeName}`,
    });
    // View functionality could be added here
  };
  
  const handleDeleteOvertime = (record: OvertimeRecordWithExtras) => {
    if (window.confirm(`Are you sure you want to delete the overtime record for ${record.employeeName}?`)) {
      deleteOvertimeMutation.mutate(record.id);
    }
  };
  
  const handleFormSubmit = (values: InsertOvertimeRecord) => {
    if (formMode === "create") {
      createOvertimeMutation.mutate(values);
    } else if (selectedRecord) {
      updateOvertimeMutation.mutate({ id: selectedRecord.id, data: values });
    }
  };
  
  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
  };
  
  return (
    <div className="p-6">
      <PageHeader
        title="Overtime Management"
        actions={
          <Button onClick={handleCreateOvertime} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Overtime Record</span>
          </Button>
        }
      />
      
      {/* Overtime Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Total Overtime Hours</h3>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{totalHours.toFixed(1)} hrs</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span className="text-secondary">Butters: {totalButtersHours.toFixed(1)} hrs</span> | <span className="text-primary">Makana: {totalMakanaHours.toFixed(1)} hrs</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Average Hours per Employee</h3>
              <Clock className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-3xl font-bold">
              {overtimeRecords.length ? (totalHours / overtimeRecords.length).toFixed(1) : "0"} hrs
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Records in Period</h3>
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <p className="text-3xl font-bold">{overtimeRecords.length}</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span className="text-secondary">
                Butters: {overtimeRecords.filter(r => r.company === "Butters").length}
              </span> | <span className="text-primary">
                Makana: {overtimeRecords.filter(r => r.company === "Makana").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
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
        
        <OvertimeTable
          data={overtimeRecords}
          isLoading={isLoading}
          onEdit={handleEditOvertime}
          onView={handleViewOvertime}
          onDelete={handleDeleteOvertime}
        />
      </div>
      
      {/* Overtime Form Dialog */}
      <OvertimeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        defaultValues={selectedRecord || undefined}
        isSubmitting={createOvertimeMutation.isPending || updateOvertimeMutation.isPending}
        title={formMode === "create" ? "Add Overtime Record" : "Edit Overtime Record"}
      />
    </div>
  );
}
