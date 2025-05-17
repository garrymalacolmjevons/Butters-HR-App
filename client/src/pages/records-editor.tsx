import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  Save, 
  Plus,
  CheckSquare,
  Edit,
  Trash,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest } from "@/lib/query-client";
import { toast } from "@/hooks/use-toast";

// Record type definitions
type RecordStatus = "Pending" | "Approved" | "Rejected";
type RecordType = 
  | "Leave" 
  | "Termination" 
  | "Advance" 
  | "Loan" 
  | "Deduction" 
  | "Overtime" 
  | "Standby"
  | "Bank Change"
  | "Special Shift"
  | "Escort Allowance"
  | "Commission"
  | "Cash in Transit";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeCode: string | null;
  fullName?: string;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  recordType: RecordType;
  date: string;
  amount: number | null;
  details: string | null;
  status: RecordStatus | null;
  documentImage: string | null;
  documentId: string | null;
  approvedBy: number | null;
  approvedAt: Date | null;
  createdAt: Date | null;
  employeeName?: string;
}

// Add a utils type for displaying edit fields based on record type
type EditingCell = {
  recordId: number;
  field: keyof PayrollRecord;
  value: any;
};

const RecordsEditor = () => {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Query to fetch all records with filtering
  const { data: records = [], isLoading, isError } = useQuery({
    queryKey: [
      '/api/payroll/records', 
      dateRange, 
      filterType, 
      filterStatus, 
      searchTerm
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString());
      }
      if (filterType) {
        params.append('recordType', filterType);
      }
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/payroll/records?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      return response.json();
    },
    enabled: !!dateRange,
  });

  // Query to fetch all employees for dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      return response.json();
    },
  });

  // Mutation to update a record
  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: number; field: string; value: any }) => {
      const response = await apiRequest(`/api/payroll/records/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update record');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/records'] });
      toast({
        title: "Record updated",
        description: "The record has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update record: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to approve or reject a record
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: RecordStatus }) => {
      const response = await apiRequest(`/api/payroll/records/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update record status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/records'] });
      toast({
        title: "Status updated",
        description: "The record status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Handle cell click for editing
  const handleCellClick = (record: PayrollRecord, field: keyof PayrollRecord) => {
    // Don't allow editing of certain fields
    const nonEditableFields: (keyof PayrollRecord)[] = ['id', 'employeeName', 'createdAt', 'approvedAt', 'approvedBy'];
    if (nonEditableFields.includes(field)) return;

    setEditingCell({
      recordId: record.id,
      field,
      value: record[field],
    });

    // Focus the input after it's rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  // Handle cell value change
  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingCell) return;
    
    setEditingCell({
      ...editingCell,
      value: e.target.value,
    });
  };

  // Handle save cell value
  const handleSaveCell = () => {
    if (!editingCell) return;
    
    updateRecordMutation.mutate({
      id: editingCell.recordId,
      field: editingCell.field,
      value: editingCell.value,
    });
    
    setEditingCell(null);
  };

  // Handle key press in editing cell
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveCell();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Handle status change
  const handleStatusChange = (recordId: number, status: RecordStatus) => {
    updateStatusMutation.mutate({
      id: recordId,
      status,
    });
  };

  // Format currency values
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  // Render the badge for record status
  const renderStatusBadge = (status: RecordStatus | null) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={14} /> Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle size={14} /> Rejected</Badge>;
      case 'Pending':
      default:
        return <Badge variant="outline" className="flex items-center gap-1"><Clock size={14} /> Pending</Badge>;
    }
  };

  // Cell renderer
  const renderCell = (record: PayrollRecord, field: keyof PayrollRecord) => {
    // Check if this cell is being edited
    if (editingCell && editingCell.recordId === record.id && editingCell.field === field) {
      // Render different input types based on the field
      switch (field) {
        case 'employeeId':
          return (
            <Select 
              value={String(editingCell.value)} 
              onValueChange={(value) => {
                setEditingCell({
                  ...editingCell,
                  value: parseInt(value),
                });
              }}
              onOpenChange={(open) => {
                if (!open) {
                  handleSaveCell();
                }
              }}
            >
              <SelectTrigger className="w-full h-8">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee: Employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.firstName} {employee.lastName} {employee.employeeCode ? `(${employee.employeeCode})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        case 'recordType':
          return (
            <Select 
              value={String(editingCell.value)} 
              onValueChange={(value) => {
                setEditingCell({
                  ...editingCell,
                  value: value,
                });
              }}
              onOpenChange={(open) => {
                if (!open) {
                  handleSaveCell();
                }
              }}
            >
              <SelectTrigger className="w-full h-8">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Leave">Leave</SelectItem>
                <SelectItem value="Termination">Termination</SelectItem>
                <SelectItem value="Advance">Advance</SelectItem>
                <SelectItem value="Loan">Loan</SelectItem>
                <SelectItem value="Deduction">Deduction</SelectItem>
                <SelectItem value="Overtime">Overtime</SelectItem>
                <SelectItem value="Standby">Standby</SelectItem>
                <SelectItem value="Bank Change">Bank Change</SelectItem>
                <SelectItem value="Special Shift">Special Shift</SelectItem>
                <SelectItem value="Escort Allowance">Escort Allowance</SelectItem>
                <SelectItem value="Commission">Commission</SelectItem>
                <SelectItem value="Cash in Transit">Cash in Transit</SelectItem>
              </SelectContent>
            </Select>
          );
        case 'date':
          return (
            <Input 
              type="date" 
              ref={inputRef}
              value={editingCell.value ? new Date(editingCell.value).toISOString().split('T')[0] : ''}
              onChange={handleCellChange} 
              onBlur={handleSaveCell}
              onKeyDown={handleKeyPress}
              className="w-full h-8"
            />
          );
        case 'amount':
          return (
            <Input 
              type="number" 
              ref={inputRef}
              value={editingCell.value || ''}
              onChange={handleCellChange} 
              onBlur={handleSaveCell}
              onKeyDown={handleKeyPress}
              step="0.01"
              className="w-full h-8"
            />
          );
        case 'status':
          return (
            <Select 
              value={String(editingCell.value)} 
              onValueChange={(value) => {
                setEditingCell({
                  ...editingCell,
                  value: value,
                });
              }}
              onOpenChange={(open) => {
                if (!open) {
                  handleSaveCell();
                }
              }}
            >
              <SelectTrigger className="w-full h-8">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          );
        default:
          return (
            <Input 
              type="text" 
              ref={inputRef}
              value={editingCell.value || ''}
              onChange={handleCellChange} 
              onBlur={handleSaveCell}
              onKeyDown={handleKeyPress}
              className="w-full h-8"
            />
          );
      }
    }

    // Render formatted value
    switch (field) {
      case 'employeeName':
        return record.employeeName || '-';
      case 'date':
        return record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '-';
      case 'amount':
        return formatCurrency(record.amount);
      case 'details':
        return record.details || '-';
      case 'status':
        return renderStatusBadge(record.status);
      case 'documentImage':
        return record.documentImage ? (
          <a 
            href={record.documentImage} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View Document
          </a>
        ) : '-';
      case 'createdAt':
        return record.createdAt ? format(new Date(record.createdAt), 'dd/MM/yyyy HH:mm') : '-';
      case 'approvedAt':
        return record.approvedAt ? format(new Date(record.approvedAt), 'dd/MM/yyyy HH:mm') : '-';
      default:
        return String(record[field]) || '-';
    }
  };

  // Calculate grid-template-columns for the table
  const columnConfig = [
    { field: 'employeeName', header: 'Employee' },
    { field: 'recordType', header: 'Type' },
    { field: 'date', header: 'Date' },
    { field: 'amount', header: 'Amount' },
    { field: 'details', header: 'Details' },
    { field: 'status', header: 'Status' },
    { field: 'documentImage', header: 'Document' },
    { field: 'createdAt', header: 'Created' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>Failed to load records</CardDescription>
          </CardHeader>
          <CardContent>
            <p>There was an error loading the records. Please try again later.</p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/payroll/records'] })}
            >
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Helmet>
        <title>Records Editor | Hi-Tec Security</title>
      </Helmet>
      
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Records Editor</h1>
            <p className="text-gray-500">Edit and manage payroll records in a spreadsheet-like interface</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filter Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <DatePickerWithRange
                  value={dateRange}
                  onChange={(range) => {
                    if (range?.from) {
                      setDateRange(range);
                    }
                  }}
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Record Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Record Types</SelectItem>
                  <SelectItem value="Leave">Leave</SelectItem>
                  <SelectItem value="Termination">Termination</SelectItem>
                  <SelectItem value="Advance">Advance</SelectItem>
                  <SelectItem value="Loan">Loan</SelectItem>
                  <SelectItem value="Deduction">Deduction</SelectItem>
                  <SelectItem value="Overtime">Overtime</SelectItem>
                  <SelectItem value="Standby">Standby</SelectItem>
                  <SelectItem value="Bank Change">Bank Change</SelectItem>
                  <SelectItem value="Special Shift">Special Shift</SelectItem>
                  <SelectItem value="Escort Allowance">Escort Allowance</SelectItem>
                  <SelectItem value="Commission">Commission</SelectItem>
                  <SelectItem value="Cash in Transit">Cash in Transit</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="md:col-span-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by employee name, details, document ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnConfig.map((column) => (
                    <TableHead key={column.field} className="whitespace-nowrap">
                      {column.header}
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnConfig.length + 1} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                        <h3 className="font-medium text-lg">No records found</h3>
                        <p className="text-gray-500 max-w-sm">
                          No payroll records match your current filters. Try adjusting your search criteria or date range.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record: PayrollRecord) => (
                    <TableRow key={record.id}>
                      {columnConfig.map((column) => (
                        <TableCell 
                          key={`${record.id}-${column.field}`}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleCellClick(record, column.field as keyof PayrollRecord)}
                        >
                          {renderCell(record, column.field as keyof PayrollRecord)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3">
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="justify-start"
                                  onClick={() => handleStatusChange(record.id, "Approved")}
                                  disabled={record.status === "Approved"}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="justify-start"
                                  onClick={() => handleStatusChange(record.id, "Rejected")}
                                  disabled={record.status === "Rejected"}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <div className="border-t pt-4 text-sm text-gray-500">
          <p>
            Click on any cell to edit its value. Press Enter to save or Escape to cancel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecordsEditor;