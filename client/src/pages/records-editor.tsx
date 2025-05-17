import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { format, parse, isAfter, isBefore, isEqual } from "date-fns";
import { Download, FileSpreadsheet } from "lucide-react";

// Define record types
const RECORD_TYPES = [
  "Leave",
  "Termination",
  "Advance",
  "Loan",
  "Deduction",
  "Overtime",
  "Standby",
  "Bank Account Change",
  "Special Shift",
  "Escort Allowance",
  "Commission",
  "Cash in Transit"
];

// Status options for records
const STATUS_OPTIONS = ["Pending", "Approved", "Rejected"];

interface RecordData {
  id: number;
  date: string;
  employeeId: number;
  employeeName?: string;
  employeeCode?: string;
  recordType: string;
  amount: number | null;
  details: string;
  status: string;
  documentImage?: string;
  createdAt: string;
  hasBeenExported?: boolean;
}

interface EditableCell {
  rowIndex: number;
  columnId: string;
  initialValue: any;
}

const RecordsEditor = () => {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [employeeCodeFilter, setEmployeeCodeFilter] = useState<string>("");
  const [editableCell, setEditableCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Fetch records data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/payroll-records"],
    select: (data: RecordData[]) => data.map(record => ({
      ...record,
      date: format(new Date(record.date), 'yyyy-MM-dd'),
      createdAt: format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }))
  });

  // Update record mutation
  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<RecordData> }) => {
      return await apiRequest(`/api/payroll-records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-records"] });
      toast({
        title: "Record updated",
        description: "The record has been successfully updated.",
        variant: "success",
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

  // Function to export filtered records to CSV
  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      toast({
        title: "No records to export",
        description: "There are no records matching your filter criteria to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV content
    const headers = ["ID", "Date", "Employee Name", "Employee Code", "Record Type", "Details", "Amount", "Status", "Created At"];
    
    let csvContent = headers.join(",") + "\n";
    
    filteredRecords.forEach(record => {
      const row = [
        record.id,
        record.date,
        record.employeeName || "",
        record.employeeCode || "",
        record.recordType,
        `"${(record.details || '').replace(/"/g, '""')}"`, // Escape quotes in details
        record.amount !== null ? record.amount : "",
        record.status,
        record.createdAt
      ].join(",");
      
      csvContent += row + "\n";
    });
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `records_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Exported ${filteredRecords.length} records to CSV file.`,
      variant: "success",
    });
  };

  // Apply all filters when data or filter criteria change
  useEffect(() => {
    if (data) {
      setRecords(data);
      let filtered = [...data];
      
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(record => 
          record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply record type filter
      if (recordTypeFilter !== "All") {
        filtered = filtered.filter(record => record.recordType === recordTypeFilter);
      }
      
      // Apply status filter
      if (statusFilter !== "All") {
        filtered = filtered.filter(record => record.status === statusFilter);
      }
      
      // Apply employee code filter
      if (employeeCodeFilter) {
        filtered = filtered.filter(record => 
          record.employeeCode?.toLowerCase().includes(employeeCodeFilter.toLowerCase())
        );
      }
      
      // Apply date range filter
      if (startDateFilter && endDateFilter) {
        const startDate = parse(startDateFilter, 'yyyy-MM-dd', new Date());
        const endDate = parse(endDateFilter, 'yyyy-MM-dd', new Date());
        
        filtered = filtered.filter(record => {
          const recordDate = parse(record.date, 'yyyy-MM-dd', new Date());
          return (isAfter(recordDate, startDate) || isEqual(recordDate, startDate)) && 
                 (isBefore(recordDate, endDate) || isEqual(recordDate, endDate));
        });
      } else if (startDateFilter) {
        const startDate = parse(startDateFilter, 'yyyy-MM-dd', new Date());
        
        filtered = filtered.filter(record => {
          const recordDate = parse(record.date, 'yyyy-MM-dd', new Date());
          return isAfter(recordDate, startDate) || isEqual(recordDate, startDate);
        });
      } else if (endDateFilter) {
        const endDate = parse(endDateFilter, 'yyyy-MM-dd', new Date());
        
        filtered = filtered.filter(record => {
          const recordDate = parse(record.date, 'yyyy-MM-dd', new Date());
          return isBefore(recordDate, endDate) || isEqual(recordDate, endDate);
        });
      }
      
      setFilteredRecords(filtered);
    }
  }, [data, searchTerm, recordTypeFilter, statusFilter, startDateFilter, endDateFilter, employeeCodeFilter]);

  // Handle starting cell edit
  const handleCellEdit = (rowIndex: number, columnId: string, value: any) => {
    setEditableCell({ rowIndex, columnId, initialValue: value });
    setEditValue(value?.toString() || "");
  };

  // Cancel cell editing
  const handleCancelEdit = () => {
    setEditableCell(null);
    setEditValue("");
  };

  // Save cell edit
  const handleSaveEdit = () => {
    if (!editableCell) return;
    
    const record = filteredRecords[editableCell.rowIndex];
    if (!record) return;
    
    let newValue: any = editValue;
    
    // Convert value based on column type
    if (editableCell.columnId === 'amount' && !isNaN(Number(editValue))) {
      newValue = Number(editValue);
    }
    
    // Update the record
    updateRecordMutation.mutate({
      id: record.id,
      data: { [editableCell.columnId]: newValue }
    });
    
    // Update local state
    const updatedRecords = [...filteredRecords];
    updatedRecords[editableCell.rowIndex] = {
      ...record,
      [editableCell.columnId]: newValue
    };
    setFilteredRecords(updatedRecords);
    
    // Clear edit state
    setEditableCell(null);
    setEditValue("");
  };

  // Handle keyboard events during cell edit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Records Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8">Loading records...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Records Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 text-red-500">
              Error loading records. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Records Editor</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium">Search</label>
              <Input
                type="text"
                placeholder="Search by name or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Emp. Code</label>
              <Input
                type="text"
                placeholder="Filter by employee code..."
                value={employeeCodeFilter}
                onChange={(e) => setEmployeeCodeFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Record Type</label>
              <select
                value={recordTypeFilter}
                onChange={(e) => setRecordTypeFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="All">All Types</option>
                {RECORD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Export Button */}
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-amber-50 border-amber-500 hover:bg-amber-100 text-amber-800"
              onClick={exportToCSV}
            >
              <FileSpreadsheet size={16} />
              Export to CSV
            </Button>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Employee</th>
                  <th className="p-2 border">Emp. Code</th>
                  <th className="p-2 border">Record Type</th>
                  <th className="p-2 border">Details</th>
                  <th className="p-2 border">Amount</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, rowIndex) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{record.id}</td>
                      <td className="p-2 border">
                        {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'date' ? (
                          <Input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="w-full p-0 h-8"
                          />
                        ) : (
                          <div 
                            onClick={() => handleCellEdit(rowIndex, 'date', record.date)}
                            className="cursor-pointer h-full w-full p-1 hover:bg-gray-100"
                          >
                            {record.date}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border">{record.employeeName}</td>
                      <td className="p-2 border">{record.employeeCode || "-"}</td>
                      <td className="p-2 border">
                        {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'recordType' ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="w-full p-0 h-8"
                          >
                            {RECORD_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        ) : (
                          <div 
                            onClick={() => handleCellEdit(rowIndex, 'recordType', record.recordType)}
                            className="cursor-pointer h-full w-full p-1 hover:bg-gray-100"
                          >
                            {record.recordType}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border">
                        {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'details' ? (
                          <Input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="w-full p-0 h-8"
                          />
                        ) : (
                          <div 
                            onClick={() => handleCellEdit(rowIndex, 'details', record.details)}
                            className="cursor-pointer h-full w-full p-1 hover:bg-gray-100"
                          >
                            {record.details}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border">
                        {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'amount' ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="w-full p-0 h-8"
                          />
                        ) : (
                          <div 
                            onClick={() => handleCellEdit(rowIndex, 'amount', record.amount)}
                            className="cursor-pointer h-full w-full p-1 hover:bg-gray-100"
                          >
                            {record.amount !== null ? record.amount.toFixed(2) : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border">
                        {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'status' ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="w-full p-0 h-8"
                          >
                            {STATUS_OPTIONS.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <div 
                            onClick={() => handleCellEdit(rowIndex, 'status', record.status)}
                            className={`cursor-pointer h-full w-full p-1 hover:bg-gray-100 ${
                              record.status === 'Approved' ? 'bg-green-100' : 
                              record.status === 'Rejected' ? 'bg-red-100' : 'bg-yellow-100'
                            }`}
                          >
                            {record.status}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border">{record.createdAt}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-4 text-center">
                      No records found. Adjust your filters to see more records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Record count summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredRecords.length} of {records.length} records
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecordsEditor;