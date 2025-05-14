import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AllowanceRecord, InsertAllowanceRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { PageHeader, PageHeaderAction } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, BadgeDollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AllowanceTable } from "@/components/allowances/allowance-table";
import { AllowanceForm } from "@/components/allowances/allowance-form";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

// Type for allowance records with employee info
type AllowanceRecordWithExtras = AllowanceRecord & { employeeName: string; company: string };

export default function Allowances() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [companyFilter, setCompanyFilter] = useState<string>("All Companies");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<AllowanceRecordWithExtras | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // Check if new allowance should be created based on URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1]);
    if (searchParams.get("action") === "new") {
      setFormMode("create");
      setSelectedRecord(null);
      setIsFormOpen(true);
      // Remove the query parameter from the URL
      setLocation("/allowances", { replace: true });
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
  
  // Fetch allowance records
  const { data: allowanceRecords = [], isLoading } = useQuery<AllowanceRecordWithExtras[]>({
    queryKey: ["/api/allowances", buildFilter()],
  });
  
  // Calculate summary data
  const totalAllowances = allowanceRecords.reduce((sum, record) => sum + record.amount, 0);
  
  const totalButtersAllowances = allowanceRecords
    .filter(record => record.company === "Butters")
    .reduce((sum, record) => sum + record.amount, 0);
  
  const totalMakanaAllowances = allowanceRecords
    .filter(record => record.company === "Makana")
    .reduce((sum, record) => sum + record.amount, 0);
  
  const recurringAllowances = allowanceRecords
    .filter(record => record.recurring)
    .reduce((sum, record) => sum + record.amount, 0);
  
  // Create allowance mutation
  const createAllowanceMutation = useMutation({
    mutationFn: async (data: InsertAllowanceRecord) => {
      const res = await apiRequest("POST", "/api/allowances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allowances"] });
      toast({
        title: "Allowance record created",
        description: "The allowance record has been created successfully",
      });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating allowance record",
        description: error.message,
      });
    },
  });
  
  // Update allowance mutation
  const updateAllowanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertAllowanceRecord> }) => {
      const res = await apiRequest("PUT", `/api/allowances/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allowances"] });
      toast({
        title: "Allowance record updated",
        description: "The allowance record has been updated successfully",
      });
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error updating allowance record",
        description: error.message,
      });
    },
  });
  
  // Delete allowance mutation
  const deleteAllowanceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/allowances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allowances"] });
      toast({
        title: "Allowance record deleted",
        description: "The allowance record has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error deleting allowance record",
        description: error.message,
      });
    },
  });
  
  const handleCreateAllowance = () => {
    setFormMode("create");
    setSelectedRecord(null);
    setIsFormOpen(true);
  };
  
  const handleEditAllowance = (record: AllowanceRecordWithExtras) => {
    setFormMode("edit");
    setSelectedRecord(record);
    setIsFormOpen(true);
  };
  
  const handleViewAllowance = (record: AllowanceRecordWithExtras) => {
    toast({
      title: "View Allowance Record",
      description: `Viewing allowance record for ${record.employeeName}`,
    });
    // View functionality could be added here
  };
  
  const handleDeleteAllowance = (record: AllowanceRecordWithExtras) => {
    if (window.confirm(`Are you sure you want to delete the allowance record for ${record.employeeName}?`)) {
      deleteAllowanceMutation.mutate(record.id);
    }
  };
  
  const handleFormSubmit = (values: InsertAllowanceRecord) => {
    if (formMode === "create") {
      createAllowanceMutation.mutate(values);
    } else if (selectedRecord) {
      updateAllowanceMutation.mutate({ id: selectedRecord.id, data: values });
    }
  };
  
  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/allowances"] });
  };
  
  return (
    <div className="p-6">
      <PageHeader
        title="Allowances Management"
        actions={
          <Button onClick={handleCreateAllowance} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Allowance Record</span>
          </Button>
        }
      />
      
      {/* Allowance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Total Allowances</h3>
              <BadgeDollarSign className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalAllowances)}</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span className="text-secondary">Butters: {formatCurrency(totalButtersAllowances)}</span> | <span className="text-primary">Makana: {formatCurrency(totalMakanaAllowances)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Recurring Allowances</h3>
              <BadgeDollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(recurringAllowances)}</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span>{allowanceRecords.filter(r => r.recurring).length} active recurring items</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-700">Records in Period</h3>
              <BadgeDollarSign className="h-5 w-5 text-neutral-500" />
            </div>
            <p className="text-3xl font-bold">{allowanceRecords.length}</p>
            <div className="text-sm text-neutral-500 mt-2">
              <span className="text-secondary">
                Butters: {allowanceRecords.filter(r => r.company === "Butters").length}
              </span> | <span className="text-primary">
                Makana: {allowanceRecords.filter(r => r.company === "Makana").length}
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
        
        <AllowanceTable
          data={allowanceRecords}
          isLoading={isLoading}
          onEdit={handleEditAllowance}
          onView={handleViewAllowance}
          onDelete={handleDeleteAllowance}
        />
      </div>
      
      {/* Allowance Form Dialog */}
      <AllowanceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        defaultValues={selectedRecord || undefined}
        isSubmitting={createAllowanceMutation.isPending || updateAllowanceMutation.isPending}
        title={formMode === "create" ? "Add Allowance Record" : "Edit Allowance Record"}
      />
    </div>
  );
}
