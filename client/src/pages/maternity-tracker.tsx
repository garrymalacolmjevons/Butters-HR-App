import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle, Dialog } from "@/components/ui/dialog";

// Types
interface MaternityRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  fromDate: string; // ISO date string
  toDate: string; // ISO date string
  comments: string | null;
  createdAt: string; // ISO date string
}

interface EditableCell {
  rowIndex: number;
  columnId: string;
  initialValue: any;
}

export default function MaternityTracker() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [comments, setComments] = useState("");
  const [editableCell, setEditableCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Fetch maternity records
  const { data: maternityRecords = [], isLoading } = useQuery({
    queryKey: ["/api/maternity-records"],
  });

  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Add maternity record mutation
  const addMaternityMutation = useMutation({
    mutationFn: async (newRecord: {
      employeeId: number;
      fromDate: string;
      toDate: string;
      comments?: string;
    }) => {
      return await apiRequest("/api/maternity-records", {
        method: "POST",
        body: JSON.stringify(newRecord),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maternity-records"] });
      setShowAddForm(false);
      resetForm();
      toast({
        title: "Maternity record added",
        description: "The maternity record has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add record",
        description: error.message || "An error occurred while adding the maternity record.",
        variant: "destructive",
      });
    },
  });

  // Update maternity record mutation
  const updateMaternityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MaternityRecord> }) => {
      return await apiRequest(`/api/maternity-records/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maternity-records"] });
      toast({
        title: "Record updated",
        description: "The maternity record has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "An error occurred while updating the record.",
        variant: "destructive",
      });
    },
  });

  // Reset form
  const resetForm = () => {
    setSelectedEmployee(null);
    setFromDate(undefined);
    setToDate(undefined);
    setComments("");
  };

  // Handle adding new record
  const handleAddRecord = () => {
    if (!selectedEmployee || !fromDate || !toDate) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all the required fields.",
        variant: "destructive",
      });
      return;
    }

    addMaternityMutation.mutate({
      employeeId: selectedEmployee,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      comments: comments || null,
    });
  };

  // Handle cell click for inline editing
  const handleCellClick = (rowIndex: number, columnId: string, value: any) => {
    setEditableCell({ rowIndex, columnId, initialValue: value });
    setEditValue(value ? String(value) : "");
  };

  // Handle edit change
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Handle cell update
  const handleCellUpdate = () => {
    if (!editableCell) return;

    const recordId = maternityRecords[editableCell.rowIndex].id;
    const columnId = editableCell.columnId;
    let newValue: any = editValue;

    // Reset editable cell
    setEditableCell(null);

    // Skip update if value didn't change
    if (newValue === editableCell.initialValue) return;

    // Prepare data update based on column
    const updateData: Partial<MaternityRecord> = {};
    updateData[columnId] = newValue;

    // Update the record
    updateMaternityMutation.mutate({ id: recordId, data: updateData });
  };

  // Handle edit key down
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCellUpdate();
    } else if (e.key === "Escape") {
      setEditableCell(null);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Maternity Tracker"
        description="Track and manage employee maternity leave dates"
      >
        <div className="flex gap-2">
          <RefreshButton queryKeys={["/api/maternity-records"]} />
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Record
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Maternity Records</CardTitle>
          <CardDescription>Track maternity leave periods for employees</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">Loading records...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Emp. Code</TableHead>
                    <TableHead>From Date</TableHead>
                    <TableHead>To Date</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Added On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maternityRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No maternity records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    maternityRecords.map((record, rowIndex) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.employeeName}</TableCell>
                        <TableCell>{record.employeeCode}</TableCell>
                        
                        {/* From Date Cell - Editable */}
                        <TableCell 
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleCellClick(rowIndex, 'fromDate', record.fromDate)}
                        >
                          {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'fromDate' ? (
                            <Input
                              type="date"
                              value={editValue}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleCellUpdate}
                              autoFocus
                              className="p-0 border-0 h-6"
                            />
                          ) : (
                            formatDate(record.fromDate)
                          )}
                        </TableCell>
                        
                        {/* To Date Cell - Editable */}
                        <TableCell 
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleCellClick(rowIndex, 'toDate', record.toDate)}
                        >
                          {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'toDate' ? (
                            <Input
                              type="date"
                              value={editValue}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleCellUpdate}
                              autoFocus
                              className="p-0 border-0 h-6"
                            />
                          ) : (
                            formatDate(record.toDate)
                          )}
                        </TableCell>
                        
                        {/* Comments Cell - Editable */}
                        <TableCell 
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleCellClick(rowIndex, 'comments', record.comments)}
                        >
                          {editableCell?.rowIndex === rowIndex && editableCell?.columnId === 'comments' ? (
                            <Input
                              value={editValue}
                              onChange={handleEditChange}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleCellUpdate}
                              autoFocus
                              className="p-0 border-0 h-6"
                            />
                          ) : (
                            record.comments || ""
                          )}
                        </TableCell>
                        
                        <TableCell>{formatDate(record.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Record Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maternity Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <select
                id="employee"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedEmployee || ""}
                onChange={(e) => setSelectedEmployee(Number(e.target.value))}
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} {employee.employeeCode ? `(${employee.employeeCode})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                      disabled={(date) => 
                        fromDate ? date < fromDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Additional notes or comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecord} disabled={!selectedEmployee || !fromDate || !toDate}>
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}