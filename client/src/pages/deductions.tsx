import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DeductionRecord, InsertDeductionRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { PageHeader, PageHeaderAction } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DeductionTable } from "@/components/deductions/deduction-table";
import { DeductionForm } from "@/components/deductions/deduction-form";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

// Type for deduction records with employee info
type DeductionRecordWithExtras = DeductionRecord & { employeeName: string; company: string };

export default function Deductions() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [companyFilter, setCompanyFilter] = useState<string>("All Companies");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<DeductionRecordWithExtras | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // Check if new deduction should be created based on URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1]);
    if (searchParams.get("action") === "new") {
      setFormMode("create");
      setSelectedRecord(null);
      setIsFormOpen(true);
      // Remove the query parameter from the URL
      setLocation("/deductions", { replace: true });
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
  
  // Fetch deduction records
  const { data: deductionRecords = [], isLoading } = useQuery<DeductionRecordWithExtras[]>({
    queryKey: ["/api/deductions", buildFilter()],
  });
  
  // Calculate summary data
  const totalDeductions = deductionRecords
    .filter(record => record.amount < 0)
    .reduce((sum, record) => sum + Math.abs(record.amount), 0);
  
  const totalButtersDeductions = deductionRecords
    .filter(record => record.company === "Butters" && record.amount < 0)
    .reduce((sum, record) => sum + Math.abs(record.amount), 0);
  
  const totalMakanaDeductions = deductionRecords
    .filter(record => record.company === "Makana" && record.amount < 0)
    .reduce((sum, record) => sum + Math.abs(record.amount), 0);
  
  const recurringDeductions = deductionRecords
    .filter(record => record.recurring && record.amount < 0)
    .reduce((sum, record) => sum + Math.abs(record.amount), 0);
  
  // Create deduction mutation
  const createDeductionMutation = useMutation({
    mutationFn: async (data: InsertDeductionRecord) => {
      const res = await apiRequest("POST", "/api/deductions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deductions"] });
      toast({
        title: "Deduction record created",
        description: "The deduction record has been created successfully",
      });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating deduction record",
        description: error.message,
      });
    },
  });
  
  // Update deduction mutation
  const updateDeductionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertDeductionRecord> }) => {
      const res = await apiRequest("PUT", `/api/deductions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deductions"] });
      toast({
        title: "Deduction record updated",
        description: "The deduction record has been updated successfully",
      });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error updating deduction record",
        description: error.message,
      });
    },
  });
  
  // Delete deduction mutation
  const deleteDeductionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/deductions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deductions"] });
      toast({
        title: "Deduction record deleted",
        description: "The deduction record has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error deleting deduction record",
        description: error.message,
      });
    },
  });
  
  const handleCreateDeduction = () => {
    setFormMode("create");
    setSelectedRecord(null);
    setIsFormOpen(true);
  };
  
  const handleEditDeduction = (record: DeductionRecordWithExtras) => {
    setFormMode("edit");
    setSelectedRecord(record);
    setIsFormOpen(true);
  };
  
  const handleViewDeduction = (record: DeductionRecordWithExtras) => {
    toast({
      title: "View Deduction Record",
      description: `Viewing deduction record for ${record.employeeName}`,
    });
    // View functionality could be added here
  };
  
  const handleDeleteDeduction = (record: DeductionRecordWithExtras) => {
    if (window.confirm(`Are you sure you want to delete the deduction record for ${record.employeeName}?`)) {
      deleteDeductionMutation.mutate(record.id);
    }
  };
  
  const handleFormSubmit = (values: InsertDeductionRecord) => {
    if (formMode === "create") {
      createDeductionMutation.mutate(values);
    } else if (selectedRecord) {
      updateDeductionMutation.mutate({ id: selectedRecord.id, data: values });
    }
  };
  
  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/deductions"] });
  };
  
  return (
    <div className="p-6">
      <PageHeader
        title="Deductions Management"
        description="Manage employee deductions. Use negative values for deductions (e.g., -100.00)"
        actions={
          <Button onClick={handleCreateDeduction} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Deduction Record</span>
          </Button>
        }
      />
      
      {/* Deduction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Total Deductions</h3>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalDeductions)}</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span className="text-secondary">Butters: {formatCurrency(totalButtersDeductions)}</span> | <span className="text-primary">Makana: {formatCurrency(totalMakanaDeductions)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Recurring Deductions</h3>
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(recurringDeductions)}</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span>{deductionRecords.filter(r => r.recurring && r.amount < 0).length} active recurring items</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Records in Period</h3>
              <TrendingDown className="h-5 w-5 text-neutral-500" />
            </div>
            <p className="text-3xl font-bold">{deductionRecords.length}</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span className="text-secondary">
                Butters: {deductionRecords.filter(r => r.company === "Butters").length}
              </span> | <span className="text-primary">
                Makana: {deductionRecords.filter(r => r.company === "Makana").length}
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
        
        <DeductionTable
          data={deductionRecords}
          isLoading={isLoading}
          onEdit={handleEditDeduction}
          onView={handleViewDeduction}
          onDelete={handleDeleteDeduction}
        />
      </div>
      
      {/* Deduction Form Dialog */}
      <DeductionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        defaultValues={selectedRecord || undefined}
        isSubmitting={createDeductionMutation.isPending || updateDeductionMutation.isPending}
        title={formMode === "create" ? "Add Deduction Record" : "Edit Deduction Record"}
      />
    </div>
  );
}
