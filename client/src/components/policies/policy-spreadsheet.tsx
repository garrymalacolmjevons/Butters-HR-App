import { useState, useEffect, KeyboardEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, parse, isAfter, isBefore, isEqual } from "date-fns";
import { Download, FileSpreadsheet, Search, ChevronDown } from "lucide-react";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Import any date picker components we need
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { InsurancePolicy } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

// Define policy statuses
const POLICY_STATUSES = ["Active", "Pending", "Suspended", "Cancelled"];

// Define insurance companies
const INSURANCE_COMPANIES = ["Sanlam Sky", "Avbob", "Old Mutual", "Provident Fund"];

interface PolicyData {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeCode?: string;
  company: string;
  policyNumber: string;
  amount: number;
  startDate: string;
  endDate?: string;
  status: string;
  createdAt: string;
}

interface EditableCell {
  rowIndex: number;
  columnId: string;
  initialValue: any;
}

const PolicySpreadsheet = () => {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<PolicyData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [employeeCodeFilter, setEmployeeCodeFilter] = useState<string>("");
  const [editableCell, setEditableCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Fetch policies data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/policies"],
    select: (data: PolicyData[]) => data.map(policy => ({
      ...policy,
      startDate: policy.startDate ? format(new Date(policy.startDate), 'yyyy-MM-dd') : '',
      endDate: policy.endDate ? format(new Date(policy.endDate), 'yyyy-MM-dd') : '',
      createdAt: format(new Date(policy.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }))
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<PolicyData> }) => {
      return await apiRequest(`/api/policies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({
        title: "Policy updated",
        description: "The policy has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to export active policies to CSV with combined totals per employee
  const exportToCSV = () => {
    // Filter out only active policies for export
    const activePolicies = filteredPolicies.filter(policy => policy.status === "Active");
    
    if (activePolicies.length === 0) {
      toast({
        title: "No active policies to export",
        description: "There are no active policies matching your filter criteria to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV content with the new format for payroll imports
    const headers = ["Employee Name", "Employee Code", "Total Policy Amount", "Status"];
    
    let csvContent = headers.join(",") + "\n";
    
    // Group policies by employee ID and calculate total amount
    const employeeTotals = new Map<string, { 
      name: string, 
      code: string, 
      totalAmount: number,
      status: string 
    }>();
    
    // First pass: group and calculate (only active policies)
    activePolicies.forEach(policy => {
      const employeeKey = policy.employeeCode || policy.employeeId.toString();
      
      if (!employeeTotals.has(employeeKey)) {
        employeeTotals.set(employeeKey, {
          name: policy.employeeName || "",
          code: policy.employeeCode || "",
          totalAmount: 0,
          status: "Active" // Always Active since we filtered
        });
      }
      
      const employee = employeeTotals.get(employeeKey)!;
      employee.totalAmount += policy.amount;
    });
    
    // Convert to array for sorting
    const employeeData = Array.from(employeeTotals.values());
    
    // Sort alphabetically by employee name for consistent output
    employeeData.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create CSV rows
    employeeData.forEach((data) => {
      const row = [
        data.name,
        data.code,
        data.totalAmount.toFixed(2),
        data.status
      ].join(",");
      
      csvContent += row + "\n";
    });

    // Create a Blob with the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    // Create a link to download the CSV
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `insurance_policies_active_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export complete",
      description: `Active policy totals for ${employeeData.length} employees have been exported to CSV.`,
    });
  };

  // Update data when fetched
  useEffect(() => {
    if (data) {
      setPolicies(data);
      setFilteredPolicies(data);
    }
  }, [data]);

  // Apply filters
  useEffect(() => {
    if (!policies.length) return;

    let result = [...policies];

    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(policy => 
        (policy.employeeName?.toLowerCase().includes(searchLower)) ||
        (policy.employeeCode?.toLowerCase().includes(searchLower)) ||
        policy.policyNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply company filter
    if (companyFilter !== "All") {
      result = result.filter(policy => policy.company === companyFilter);
    }

    // Apply status filter
    if (statusFilter !== "All") {
      result = result.filter(policy => policy.status === statusFilter);
    }

    // Apply employee code filter
    if (employeeCodeFilter) {
      result = result.filter(policy => 
        policy.employeeCode?.toLowerCase().includes(employeeCodeFilter.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      result = result.filter(policy => {
        const policyDate = new Date(policy.startDate);
        
        if (dateRange.from && dateRange.to) {
          return (isAfter(policyDate, dateRange.from) || isEqual(policyDate, dateRange.from)) && 
                 (isBefore(policyDate, dateRange.to) || isEqual(policyDate, dateRange.to));
        } else if (dateRange.from) {
          return isAfter(policyDate, dateRange.from) || isEqual(policyDate, dateRange.from);
        } else if (dateRange.to) {
          return isBefore(policyDate, dateRange.to) || isEqual(policyDate, dateRange.to);
        }
        return true;
      });
    }

    setFilteredPolicies(result);
  }, [
    policies, 
    searchTerm, 
    companyFilter, 
    statusFilter, 
    employeeCodeFilter, 
    dateRange
  ]);

  // Handle click on a cell to make it editable
  const handleCellClick = (rowIndex: number, columnId: string, value: any) => {
    // Only certain columns can be edited
    const editableColumns = ['policyNumber', 'amount', 'status', 'company'];
    if (!editableColumns.includes(columnId)) return;

    setEditableCell({ rowIndex, columnId, initialValue: value });
    setEditValue(value !== null ? String(value) : '');
  };

  // Handle input change when editing a cell
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Handle keydown events when editing a cell
  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCellUpdate();
    } else if (e.key === 'Escape') {
      setEditableCell(null);
    }
  };

  // Update cell value
  const handleCellUpdate = () => {
    if (!editableCell) return;

    const { rowIndex, columnId } = editableCell;
    const policy = filteredPolicies[rowIndex];
    let newValue: any = editValue.trim();

    // Validate and format the input based on the column
    if (columnId === 'amount') {
      // Parse as a number
      const numValue = parseFloat(newValue);
      if (isNaN(numValue) || numValue < 0) {
        toast({
          title: "Invalid value",
          description: "Please enter a valid positive number for amount.",
          variant: "destructive",
        });
        return;
      }
      newValue = numValue;
    }

    // Only update if the value has changed
    if (String(policy[columnId as keyof PolicyData]) !== String(newValue)) {
      updatePolicyMutation.mutate({
        id: policy.id,
        data: { [columnId]: newValue }
      });
    }

    // Reset edit state
    setEditableCell(null);
  };

  // Function to reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setCompanyFilter("All");
    setStatusFilter("All");
    setEmployeeCodeFilter("");
    setDateRange({});
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Insurance Policies Spreadsheet</CardTitle>
          <div className="flex gap-2">
            <RefreshButton
              queryKey={"/api/policies"}
            />
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={filteredPolicies.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Section */}
        <div className="mb-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center">
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input
                placeholder="Search employee or policy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[250px]"
              />
            </div>

            <Select
              value={companyFilter}
              onValueChange={setCompanyFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Companies</SelectItem>
                {INSURANCE_COMPANIES.map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {POLICY_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Employee Code"
              value={employeeCodeFilter}
              onChange={(e) => setEmployeeCodeFilter(e.target.value)}
              className="w-[150px]"
            />

            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-[240px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                        </>
                      ) : (
                        format(dateRange.from, "PPP")
                      )
                    ) : (
                      "Filter by date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ 
                      from: dateRange.from, 
                      to: dateRange.to 
                    }}
                    onSelect={(range) => setDateRange({ 
                      from: range?.from, 
                      to: range?.to 
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {(dateRange.from || dateRange.to) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setDateRange({})}
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              )}
            </div>

            <Button 
              variant="ghost" 
              onClick={resetFilters}
              className="ml-auto"
            >
              Reset Filters
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredPolicies.length} of {policies.length} policies
          </div>
        </div>

        {/* Spreadsheet Table */}
        <div className="overflow-auto border rounded-md">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Employee</th>
                <th className="p-2 text-left">Emp. Code</th>
                <th className="p-2 text-left">Company</th>
                <th className="p-2 text-left">Policy Number</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Start Date</th>
                <th className="p-2 text-left">End Date</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center p-4">Loading...</td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-4">No policies found</td>
                </tr>
              ) : (
                filteredPolicies.map((policy, rowIndex) => (
                  <tr key={policy.id} className="border-t hover:bg-muted/50">
                    <td className="p-2">{policy.id}</td>
                    <td className="p-2">{policy.employeeName} {policy.employeeCode ? `(${policy.employeeCode})` : ''}</td>
                    <td className="p-2">{policy.employeeCode}</td>
                    {/* Editable Company Cell */}
                    <td 
                      className="p-2 cursor-pointer hover:bg-muted"
                      onClick={() => handleCellClick(rowIndex, 'company', policy.company)}
                    >
                      {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'company' ? (
                        <Select
                          value={editValue}
                          onValueChange={(value) => {
                            setEditValue(value);
                            // Immediately update when a dropdown selection is made
                            updatePolicyMutation.mutate({
                              id: policy.id,
                              data: { company: value }
                            });
                            setEditableCell(null);
                          }}
                          
                        >
                          <SelectTrigger className="h-6 p-1 border-0 focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INSURANCE_COMPANIES.map(company => (
                              <SelectItem key={company} value={company}>{company}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        policy.company
                      )}
                    </td>
                    
                    {/* Editable Policy Number Cell */}
                    <td 
                      className="p-2 cursor-pointer hover:bg-muted"
                      onClick={() => handleCellClick(rowIndex, 'policyNumber', policy.policyNumber)}
                    >
                      {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'policyNumber' ? (
                        <Input
                          value={editValue}
                          onChange={handleEditChange}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleCellUpdate}
                          
                          className="p-0 border-0 h-6"
                        />
                      ) : (
                        policy.policyNumber
                      )}
                    </td>
                    
                    {/* Editable Amount Cell */}
                    <td 
                      className="p-2 cursor-pointer hover:bg-muted"
                      onClick={() => handleCellClick(rowIndex, 'amount', policy.amount)}
                    >
                      {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'amount' ? (
                        <Input
                          value={editValue}
                          onChange={handleEditChange}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleCellUpdate}
                          
                          className="p-0 border-0 h-6"
                          type="number"
                          step="0.01"
                        />
                      ) : (
                        formatCurrency(policy.amount)
                      )}
                    </td>
                    
                    <td className="p-2">{policy.startDate}</td>
                    <td className="p-2">{policy.endDate}</td>
                    
                    {/* Editable Status Cell */}
                    <td 
                      className="p-2 cursor-pointer hover:bg-muted"
                      onClick={() => handleCellClick(rowIndex, 'status', policy.status)}
                    >
                      {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'status' ? (
                        <Select
                          value={editValue}
                          onValueChange={(value) => {
                            setEditValue(value);
                            // Immediately update when a dropdown selection is made
                            updatePolicyMutation.mutate({
                              id: policy.id,
                              data: { status: value }
                            });
                            setEditableCell(null);
                          }}
                          
                        >
                          <SelectTrigger className="p-0 border-0 h-6 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POLICY_STATUSES.map(status => (
                              <SelectItem key={status} value={status || "Unknown"}>{status || "Unknown"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${policy.status === 'Active' ? 'bg-green-100 text-green-800' :
                            policy.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            policy.status === 'Suspended' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'}`}>
                          {policy.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicySpreadsheet;