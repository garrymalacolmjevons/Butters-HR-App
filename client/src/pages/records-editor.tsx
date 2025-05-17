import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format, addMonths, subMonths, isValid } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download, FileSpreadsheet, Save, Search, Filter, X, Check, Edit, Trash } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import logoPath from "@assets/Logo.jpg";

// Record types for dropdown
const RECORD_TYPES = [
  "All Record Types",
  "Overtime",
  "Special Shift",
  "Escort Allowance",
  "Commission",
  "Leave",
  "Termination",
  "Advance",
  "Loan",
  "Deduction",
  "Bank Account Change",
  "Standby Shift",
  "Cash in Transit"
];

export default function RecordsEditorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [recordType, setRecordType] = useState<string>("All Record Types");
  const [includeUnapproved, setIncludeUnapproved] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{ rowIndex: number | null; field: string | null }>({
    rowIndex: null,
    field: null,
  });
  const [editValue, setEditValue] = useState<string>("");

  // Format dates for API calls
  const formattedStartDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const formattedEndDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  // Fetch payroll records
  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const recordTypeParam = recordType === "All Record Types" ? "all" : recordType;
      const response = await apiRequest<{ 
        success: boolean; 
        data: any[];
        totalRecords: number; 
      }>("/api/reports/preview", {
        method: "POST",
        body: JSON.stringify({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          recordType: recordTypeParam,
          includeUnapproved,
        }),
      });

      if (response.success) {
        setRecords(response.data || []);
        setFilteredRecords(response.data || []);
      } else {
        toast({
          title: "Error fetching records",
          description: "Failed to fetch payroll records. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error fetching records",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter records when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecords(records);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = records.filter(record => {
      return (
        (record.employeeName?.toLowerCase().includes(query)) ||
        (record.employeeCode?.toLowerCase().includes(query)) ||
        (record.description?.toLowerCase().includes(query)) ||
        (record.recordType?.toLowerCase().includes(query))
      );
    });

    setFilteredRecords(filtered);
  }, [searchQuery, records]);

  // Update a record
  const updateRecord = useMutation({
    mutationFn: async ({ id, field, value }: { id: number; field: string; value: any }) => {
      return apiRequest(`/api/payroll-records/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Record updated",
        description: "The record has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/preview'] });
      // Refresh the data
      fetchRecords();
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update the record. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete a record
  const deleteRecord = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/payroll-records/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Record deleted",
        description: "The record has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/preview'] });
      // Refresh the data
      fetchRecords();
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete the record. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle cell click for editing
  const handleCellClick = (rowIndex: number, field: string, value: string) => {
    setEditingCell({ rowIndex, field });
    setEditValue(value || "");
  };

  // Save cell edit
  const handleSaveEdit = () => {
    if (editingCell.rowIndex === null || editingCell.field === null) return;
    
    const record = filteredRecords[editingCell.rowIndex];
    if (!record || !record.id) return;

    updateRecord.mutate({
      id: record.id,
      field: editingCell.field,
      value: editValue,
    });

    // Reset editing state
    setEditingCell({ rowIndex: null, field: null });
  };

  // Cancel cell edit
  const handleCancelEdit = () => {
    setEditingCell({ rowIndex: null, field: null });
  };

  // Handle key press in edit mode
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Toggle record approval
  const handleToggleApproval = (id: number, currentApprovalStatus: boolean) => {
    updateRecord.mutate({
      id,
      field: "approved",
      value: !currentApprovalStatus,
    });
  };

  // Handle record deletion
  const handleDeleteRecord = (id: number) => {
    if (window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      deleteRecord.mutate(id);
    }
  };

  // Editable fields
  const editableFields = ["description", "amount", "details", "hours", "days"];

  return (
    <>
      <Helmet>
        <title>Records Editor | Hi-Tec Security HR Portal</title>
        <meta
          name="description"
          content="Edit payroll records in a spreadsheet-like interface for Hi-Tec Security HR Portal"
        />
      </Helmet>

      <div className="flex flex-col space-y-6">
        <PageHeader
          title="Records Editor"
          subtitle="Edit payroll records in a spreadsheet-like interface"
          image={logoPath}
          className="h-16 w-auto"
        />

        <Card className="border-2 border-amber-400/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <CardTitle>Search & Filter Records</CardTitle>
            <CardDescription className="text-gray-300">
              Find and filter payroll records for editing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-range">Date Range</Label>
                <DatePickerWithRange
                  id="date-range"
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="record-type">Record Type</Label>
                <Select
                  value={recordType}
                  onValueChange={setRecordType}
                >
                  <SelectTrigger id="record-type">
                    <SelectValue placeholder="Select record type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-query">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-query"
                    placeholder="Search by name, code, etc."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2.5"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-end">
                <div className="flex items-center space-x-2 h-10">
                  <Checkbox
                    id="include-unapproved"
                    checked={includeUnapproved}
                    onCheckedChange={(checked) => setIncludeUnapproved(checked as boolean)}
                  />
                  <Label htmlFor="include-unapproved">Include unapproved records</Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 px-6 py-3">
            <Button 
              onClick={fetchRecords} 
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Filter className="mr-2 h-4 w-4" />
                  Load Records
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-2 border-amber-400/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <CardTitle>Records Data Table</CardTitle>
            <CardDescription className="text-gray-300">
              Click on cells to edit values directly
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actions</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Record Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                          <p>Loading records...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                          <p>No records found. Use the filters above to load records.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchRecords}
                            className="mt-2"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            Load Records
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record, rowIndex) => (
                    <TableRow key={record.id || rowIndex}>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleApproval(record.id, record.approved)}
                            className={record.approved ? "text-green-600" : "text-yellow-600"}
                            title={record.approved ? "Unapprove record" : "Approve record"}
                          >
                            {record.approved ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-600"
                            title="Delete record"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">{record.employeeName || "-"}</div>
                        <div className="text-xs text-gray-500">{record.employeeCode || "-"}</div>
                      </TableCell>
                      
                      <TableCell>{record.recordType || "-"}</TableCell>
                      
                      <TableCell>
                        {record.date ? new Date(record.date).toLocaleDateString() : "-"}
                      </TableCell>
                      
                      {editableFields.includes("amount") && 
                       editingCell.rowIndex === rowIndex && 
                       editingCell.field === "amount" ? (
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : (
                        <TableCell
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleCellClick(rowIndex, "amount", record.amount?.toString() || "")}
                        >
                          {typeof record.amount === "number" ? `R${record.amount.toFixed(2)}` : "-"}
                        </TableCell>
                      )}
                      
                      {editableFields.includes("hours") && 
                       editingCell.rowIndex === rowIndex && 
                       editingCell.field === "hours" ? (
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : (
                        <TableCell
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleCellClick(rowIndex, "hours", record.hours?.toString() || "")}
                        >
                          {record.hours || "-"}
                        </TableCell>
                      )}
                      
                      {editableFields.includes("days") && 
                       editingCell.rowIndex === rowIndex && 
                       editingCell.field === "days" ? (
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : (
                        <TableCell
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleCellClick(rowIndex, "days", record.days?.toString() || "")}
                        >
                          {record.days || "-"}
                        </TableCell>
                      )}
                      
                      {editableFields.includes("description") && 
                       editingCell.rowIndex === rowIndex && 
                       editingCell.field === "description" ? (
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Input
                              className="w-40 h-8 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : (
                        <TableCell
                          className="cursor-pointer hover:bg-gray-50 max-w-[200px] truncate"
                          onClick={() => handleCellClick(rowIndex, "description", record.description || "")}
                        >
                          {record.description || "-"}
                        </TableCell>
                      )}
                      
                      {editableFields.includes("details") && 
                       editingCell.rowIndex === rowIndex && 
                       editingCell.field === "details" ? (
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Input
                              className="w-40 h-8 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : (
                        <TableCell
                          className="cursor-pointer hover:bg-gray-50 max-w-[200px] truncate"
                          onClick={() => handleCellClick(rowIndex, "details", record.details || "")}
                        >
                          {record.details || "-"}
                        </TableCell>
                      )}
                      
                      <TableCell>
                        {record.approved ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <CardFooter className="bg-gray-50 px-6 py-3 justify-between">
            <div className="text-sm text-gray-500">
              {filteredRecords.length > 0 ? (
                <>Showing {filteredRecords.length} records</>
              ) : (
                <>No records to display</>
              )}
            </div>
            {filteredRecords.length > 0 && (
              <Button variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Save All Changes
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}