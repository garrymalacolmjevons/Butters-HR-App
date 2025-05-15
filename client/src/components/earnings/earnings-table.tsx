import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Check, X, Pencil, Trash2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EarningsTableProps {
  recordType: string;
  onEditEarning?: (earning: any) => void;
}

export function EarningsTable({ recordType, onEditEarning }: EarningsTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [earningToDelete, setEarningToDelete] = useState<any>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<string | null>(null);

  // Fetch earnings
  const { data: earnings = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/payroll-records', { recordType }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('recordType', recordType);
      
      const response = await fetch(`/api/payroll-records?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      return response.json();
    }
  });

  // Fetch employees for filter
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Delete mutation
  const deleteEarning = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/payroll-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Earning record deleted successfully",
      });
      setDeleteDialogOpen(false);
      setEarningToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete earning: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Handle edit action
  const handleEdit = (earning: any) => {
    if (onEditEarning) {
      onEditEarning(earning);
    } else {
      toast({
        title: "Edit Feature",
        description: "Edit functionality will be implemented soon",
      });
    }
  };

  // Handle delete action
  const handleDelete = (earning: any) => {
    setEarningToDelete(earning);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (earningToDelete) {
      deleteEarning.mutate(earningToDelete.id);
    }
  };

  // Apply filters
  let filteredData = [...earnings];
  
  // Apply search filter
  if (searchTerm.trim()) {
    filteredData = filteredData.filter((earning: any) => 
      earning.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (earning.description && earning.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (earning.details && earning.details.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }
  
  // Apply employee filter
  if (employeeFilter) {
    filteredData = filteredData.filter((earning: any) => 
      earning.employeeId === parseInt(employeeFilter)
    );
  }
  
  // Apply approval filter
  if (approvalFilter) {
    const isApproved = approvalFilter === 'approved';
    filteredData = filteredData.filter((earning: any) => 
      earning.approved === isApproved
    );
  }
  
  // Apply date filter - simplified for now
  if (dateFilter) {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    if (dateFilter === 'thisMonth') {
      filteredData = filteredData.filter((earning: any) => {
        const earningDate = new Date(earning.date);
        return earningDate.getMonth() === thisMonth && earningDate.getFullYear() === thisYear;
      });
    } else if (dateFilter === 'lastMonth') {
      let lastMonth = thisMonth - 1;
      let lastMonthYear = thisYear;
      if (lastMonth < 0) {
        lastMonth = 11;
        lastMonthYear--;
      }
      
      filteredData = filteredData.filter((earning: any) => {
        const earningDate = new Date(earning.date);
        return earningDate.getMonth() === lastMonth && earningDate.getFullYear() === lastMonthYear;
      });
    } else if (dateFilter === 'thisYear') {
      filteredData = filteredData.filter((earning: any) => {
        const earningDate = new Date(earning.date);
        return earningDate.getFullYear() === thisYear;
      });
    }
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    return `R ${amount.toFixed(2)}`;
  };

  const clearFilters = () => {
    setEmployeeFilter(null);
    setDateFilter(null);
    setApprovalFilter(null);
    setFilterDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading earnings data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search earnings..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFilterDialogOpen(true)}
            className={employeeFilter || dateFilter || approvalFilter ? "bg-blue-50 border-blue-200" : ""}
          >
            <Filter className={`h-4 w-4 ${employeeFilter || dateFilter || approvalFilter ? "text-blue-500" : ""}`} />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Description</TableHead>
              {recordType === 'Overtime' && <TableHead>Hours</TableHead>}
              {recordType === 'Overtime' && <TableHead>Rate</TableHead>}
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[100px]">Approved</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No earnings found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((earning: any) => (
                <TableRow key={earning.id}>
                  <TableCell className="font-medium">
                    {format(new Date(earning.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{earning.employeeName}</TableCell>
                  <TableCell>
                    {earning.description || earning.details || "—"}
                  </TableCell>
                  {recordType === 'Overtime' && (
                    <TableCell>{earning.hours || "—"}</TableCell>
                  )}
                  {recordType === 'Overtime' && (
                    <TableCell>{earning.rate ? `${earning.rate}x` : "—"}</TableCell>
                  )}
                  <TableCell className="text-right">
                    {formatCurrency(earning.amount)}
                  </TableCell>
                  <TableCell>
                    {earning.approved ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Edit"
                        onClick={() => handleEdit(earning)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Delete"
                        onClick={() => handleDelete(earning)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Earning Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this earning record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {earningToDelete && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-sm font-medium">Employee:</div>
                  <div className="text-sm">{earningToDelete.employeeName}</div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-sm font-medium">Date:</div>
                  <div className="text-sm">{format(new Date(earningToDelete.date), "dd/MM/yyyy")}</div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-sm font-medium">Amount:</div>
                  <div className="text-sm">{formatCurrency(earningToDelete.amount)}</div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-sm font-medium">Description:</div>
                  <div className="text-sm">{earningToDelete.description || earningToDelete.details || "—"}</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteEarning.isPending}
            >
              {deleteEarning.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Earnings</DialogTitle>
            <DialogDescription>
              Filter earnings by employee, date, or approval status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select
                value={employeeFilter || ""}
                onValueChange={setEmployeeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees</SelectItem>
                  {Array.isArray(employees) && employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Period</label>
              <Select
                value={dateFilter || ""}
                onValueChange={setDateFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Time</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Approval Status</label>
              <Select
                value={approvalFilter || ""}
                onValueChange={setApprovalFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="unapproved">Not Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <DialogClose asChild>
              <Button>Apply Filters</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}