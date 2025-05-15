import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EmployeeWithFullName, InsertEmployee, insertEmployeeSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { PageHeader, PageHeaderAction } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FolderInput, Plus, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeTable } from "@/components/employees/employee-table";
import { ImportModal } from "@/components/employees/import-modal";
import { EmployeeWorkflow } from "@/components/employees/employee-workflow";

export default function Employees() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("All Companies");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All Departments");
  const [statusFilter, setStatusFilter] = useState<string>("All Status");
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState<boolean>(false);

  // Check if import modal should be opened based on URL query parameter
  useEffect(() => {
    console.log("Checking for import parameter in URL:", location);
    if (location.includes("?import=true") || location.includes("&import=true")) {
      console.log("Found import=true parameter, opening import modal");
      setIsImportModalOpen(true);
      
      // Remove the query parameter from the URL - keep other params if present
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("import");
      
      const newUrl = currentUrl.pathname;
      if (currentUrl.searchParams.toString()) {
        // If other query params exist, keep them
        setLocation(newUrl + "?" + currentUrl.searchParams.toString(), { replace: true });
      } else {
        // No other query params
        setLocation(newUrl, { replace: true });
      }
    }
  }, [location]);

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees", companyFilter, departmentFilter, statusFilter],
  });

  // Filter employees based on search term
  const filteredEmployees = employees.filter((employee) => {
    const fullName = employee.fullName.toLowerCase();
    const employeeCode = employee.employeeCode.toLowerCase();
    const search = searchTerm.toLowerCase();

    return fullName.includes(search) || employeeCode.includes(search);
  });

  const handleEditEmployee = (employee: EmployeeWithFullName) => {
    toast({
      title: "Edit Employee",
      description: `Editing ${employee.fullName} (${employee.employeeCode})`,
    });
    // Open employee edit form/modal here
  };

  const handleViewEmployee = (employee: EmployeeWithFullName) => {
    toast({
      title: "View Employee",
      description: `Viewing ${employee.fullName} (${employee.employeeCode})`,
    });
    // Open employee view modal here
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    toast({
      title: "Import Successful",
      description: "Employee data has been successfully imported.",
    });
  };
  
  // Mutation for creating new employee
  const createEmployeeMutation = useMutation({
    mutationFn: (newEmployee: InsertEmployee) => 
      apiRequest("/api/employees", "POST", newEmployee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsWorkflowModalOpen(false);
      toast({
        title: "Employee Created",
        description: "New employee has been successfully onboarded.",
      });
      
      // Log activity for audit trail - wrapped in try/catch to prevent critical errors
      try {
        apiRequest("/api/activity-logs", "POST", {
          action: "Create Employee",
          details: `Onboarded new employee using workflow process`
        });
      } catch (err) {
        console.error("Failed to log activity:", err);
      }
    },
    onError: (error) => {
      console.error("Error creating employee:", error);
      toast({
        title: "Error",
        description: "Failed to create employee. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handler for submitting the employee workflow form
  const handleEmployeeWorkflowSubmit = (values: InsertEmployee) => {
    createEmployeeMutation.mutate(values);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Employees"
        actions={
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                // Navigate to the dedicated import page
                setLocation("/import");
              }} 
              className="flex items-center space-x-2"
            >
              <FolderInput className="h-4 w-4" />
              <span>Import VIP Data</span>
            </Button>
            
            <Button 
              onClick={() => setIsWorkflowModalOpen(true)}
              variant="default"
              className="flex items-center space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>New Employee</span>
            </Button>
          </div>
        }
      />
      
      {/* Debug info */}
      <div className="p-2 text-xs text-gray-500">
        Import Modal State: {isImportModalOpen ? "Open" : "Closed"}
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

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Departments">All Departments</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="Administration">Administration</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="Search employees..."
              className="pl-10 pr-4 py-2 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-3 text-neutral-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <EmployeeTable
          data={filteredEmployees}
          isLoading={isLoading}
          onEdit={handleEditEmployee}
          onView={handleViewEmployee}
        />
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
      
      <EmployeeWorkflow
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        onSubmit={handleEmployeeWorkflowSubmit}
        isSubmitting={createEmployeeMutation.isPending}
      />
    </div>
  );
}
