import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import PageHeader from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaternityRecord, Employee } from '@shared/schema';

export default function MaternityTracker() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Partial<MaternityRecord>>({});
  const [popoverOpen, setPopoverOpen] = useState<{ [key: string]: boolean }>({});
  
  // Fetch maternity records
  const { 
    data: maternityRecords = [], 
    isLoading: recordsLoading, 
    error: recordsError 
  } = useQuery({
    queryKey: ['/api/maternity-records'],
  });

  // Fetch employees for the dropdown
  const { 
    data: employees = [], 
    isLoading: employeesLoading, 
    error: employeesError 
  } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Function to handle creation of a new maternity record
  const handleCreateRecord = async () => {
    if (!editingRecord.employeeId || !editingRecord.fromDate || !editingRecord.toDate) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields."
      });
      return;
    }

    // Prepare data with proper types for submission
    const recordData = {
      ...editingRecord,
      employeeId: Number(editingRecord.employeeId),
      fromDate: editingRecord.fromDate,
      toDate: editingRecord.toDate
    };

    try {
      const response = await fetch('/api/maternity-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData),
      });

      if (!response.ok) {
        throw new Error('Failed to create maternity record');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/maternity-records'] });
      toast({
        title: "Record created",
        description: "The maternity record has been created successfully."
      });
      setEditingRecord({});
      setEditMode(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create maternity record. Please try again."
      });
    }
  };

  // Function to handle updating a maternity record
  const handleUpdateRecord = async () => {
    if (!editingRecord.id || !editingRecord.employeeId || !editingRecord.fromDate || !editingRecord.toDate) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields."
      });
      return;
    }

    // Prepare data with proper types for submission
    const recordData = {
      ...editingRecord,
      employeeId: Number(editingRecord.employeeId),
      fromDate: editingRecord.fromDate,
      toDate: editingRecord.toDate
    };

    try {
      const response = await fetch(`/api/maternity-records/${editingRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData),
      });

      if (!response.ok) {
        throw new Error('Failed to update maternity record');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/maternity-records'] });
      toast({
        title: "Record updated",
        description: "The maternity record has been updated successfully."
      });
      setEditingRecord({});
      setEditMode(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update maternity record. Please try again."
      });
    }
  };

  // Function to handle deletion of a maternity record
  const handleDeleteRecord = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      const response = await fetch(`/api/maternity-records/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete maternity record');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/maternity-records'] });
      toast({
        title: "Record deleted",
        description: "The maternity record has been deleted successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete maternity record. Please try again."
      });
    }
  };

  // Function to handle input changes for editing
  const handleInputChange = (key: string, value: any) => {
    setEditingRecord(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Edit an existing record
  const startEditing = (record: MaternityRecord) => {
    setEditingRecord({ ...record });
    setEditMode(true);
  };

  // Toggle a date picker popover
  const togglePopover = (key: string) => {
    setPopoverOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'yyyy-MM-dd');
  };

  // If there's an error, display it
  if (recordsError || employeesError) {
    return (
      <div className="p-6">
        <PageHeader title="Maternity Tracker" />
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Find employee name by ID
  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  // Find employee code by ID
  const getEmployeeCode = (employeeId: number) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    return employee ? employee.employeeCode : '';
  };

  return (
    <div className="p-6">
      <PageHeader 
        title="Maternity Tracker" 
        description="Track and manage maternity leave records"
        queryKeys={['/api/maternity-records']} 
      >
        {!editMode && (
          <Button 
            onClick={() => {
              setEditingRecord({});
              setEditMode(true);
            }}
          >
            Add New Record
          </Button>
        )}
      </PageHeader>

      {editMode && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <Select
                  value={editingRecord.employeeId?.toString()}
                  onValueChange={(value) => handleInputChange('employeeId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.employeeCode ? `[${employee.employeeCode}] ` : ''}{employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <Popover
                  open={popoverOpen['fromDate']}
                  onOpenChange={() => togglePopover('fromDate')}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editingRecord.fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingRecord.fromDate ? formatDate(editingRecord.fromDate) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editingRecord.fromDate ? new Date(editingRecord.fromDate) : undefined}
                      onSelect={(date) => {
                        handleInputChange('fromDate', date ? format(date, 'yyyy-MM-dd') : undefined);
                        togglePopover('fromDate');
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <Popover
                  open={popoverOpen['toDate']}
                  onOpenChange={() => togglePopover('toDate')}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editingRecord.toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingRecord.toDate ? formatDate(editingRecord.toDate) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editingRecord.toDate ? new Date(editingRecord.toDate) : undefined}
                      onSelect={(date) => {
                        handleInputChange('toDate', date ? format(date, 'yyyy-MM-dd') : undefined);
                        togglePopover('toDate');
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium mb-1">Comments</label>
                <Input
                  value={editingRecord.comments || ''}
                  onChange={(e) => handleInputChange('comments', e.target.value)}
                  placeholder="Additional comments (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  setEditingRecord({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingRecord.id ? handleUpdateRecord : handleCreateRecord}
              >
                {editingRecord.id ? 'Update' : 'Create'} Record
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {recordsLoading || employeesLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : maternityRecords.length === 0 ? (
            <div className="text-center py-4 text-neutral-500">
              No maternity records found. Click "Add New Record" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emp. Code</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>From Date</TableHead>
                  <TableHead>To Date</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maternityRecords.map((record: any, rowIndex: number) => (
                  <TableRow key={record.id} className={rowIndex % 2 === 0 ? 'bg-neutral-50' : ''}>
                    <TableCell className="font-medium">{record.employeeCode || '-'}</TableCell>
                    <TableCell>{record.employeeName}</TableCell>
                    <TableCell>{formatDate(record.fromDate)}</TableCell>
                    <TableCell>{formatDate(record.toDate)}</TableCell>
                    <TableCell>{record.comments || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(record)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}