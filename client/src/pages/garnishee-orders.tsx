import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircleIcon, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StaffGarnishee, Employee } from '@shared/schema';

export default function GarnisheeOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editingGarnishee, setEditingGarnishee] = useState<Partial<StaffGarnishee>>({});
  const [popoverOpen, setPopoverOpen] = useState<{ [key: string]: boolean }>({});
  
  // Fetch garnishee orders
  const { 
    data: garnisheeOrders = [], 
    isLoading: ordersLoading, 
    error: ordersError 
  } = useQuery({
    queryKey: ['/api/staff-garnishees'],
  });

  // Fetch employees for the dropdown
  const { 
    data: employees = [], 
    isLoading: employeesLoading, 
    error: employeesError 
  } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Fetch dashboard data
  const {
    data: dashboardData = { activeOrders: 0, totalOutstanding: 0, monthlyPayments: 0 },
    isLoading: dashboardLoading,
    error: dashboardError
  } = useQuery({
    queryKey: ['/api/garnishee-dashboard'],
  });

  // Function to handle creation of a new garnishee order
  const handleCreateGarnishee = async () => {
    if (!editingGarnishee.employeeId || !editingGarnishee.creditor || 
        !editingGarnishee.monthlyAmount || !editingGarnishee.totalAmount || 
        !editingGarnishee.balance || !editingGarnishee.startDate) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields."
      });
      return;
    }

    // Prepare data with proper types for submission
    const garnisheeData = {
      ...editingGarnishee,
      employeeId: Number(editingGarnishee.employeeId),
      monthlyAmount: Number(editingGarnishee.monthlyAmount),
      totalAmount: Number(editingGarnishee.totalAmount),
      balance: Number(editingGarnishee.balance),
      startDate: editingGarnishee.startDate,
      endDate: editingGarnishee.endDate
    };

    try {
      const response = await fetch('/api/staff-garnishees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(garnisheeData),
      });

      if (!response.ok) {
        throw new Error('Failed to create garnishee order');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/staff-garnishees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/garnishee-dashboard'] });
      
      toast({
        title: "Order created",
        description: "The garnishee order has been created successfully."
      });
      setEditingGarnishee({});
      setEditMode(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create garnishee order. Please try again."
      });
    }
  };

  // Function to handle updating a garnishee order
  const handleUpdateGarnishee = async () => {
    if (!editingGarnishee.id || !editingGarnishee.employeeId || !editingGarnishee.creditor || 
        !editingGarnishee.monthlyAmount || !editingGarnishee.totalAmount || 
        !editingGarnishee.balance || !editingGarnishee.startDate) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields."
      });
      return;
    }

    // Prepare data with proper types for submission
    const garnisheeData = {
      ...editingGarnishee,
      employeeId: Number(editingGarnishee.employeeId),
      monthlyAmount: Number(editingGarnishee.monthlyAmount),
      totalAmount: Number(editingGarnishee.totalAmount),
      balance: Number(editingGarnishee.balance),
      startDate: editingGarnishee.startDate,
      endDate: editingGarnishee.endDate
    };

    try {
      const response = await fetch(`/api/staff-garnishees/${editingGarnishee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(garnisheeData),
      });

      if (!response.ok) {
        throw new Error('Failed to update garnishee order');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/staff-garnishees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/garnishee-dashboard'] });
      
      toast({
        title: "Order updated",
        description: "The garnishee order has been updated successfully."
      });
      setEditingGarnishee({});
      setEditMode(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update garnishee order. Please try again."
      });
    }
  };

  // Function to handle deleting a garnishee order
  const handleDeleteGarnishee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this garnishee order?')) {
      return;
    }

    try {
      const response = await fetch(`/api/staff-garnishees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete garnishee order');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/staff-garnishees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/garnishee-dashboard'] });
      
      toast({
        title: "Order deleted",
        description: "The garnishee order has been deleted successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete garnishee order. Please try again."
      });
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setEditingGarnishee(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Edit an existing garnishee
  const startEditing = (garnishee: StaffGarnishee) => {
    setEditingGarnishee({ ...garnishee });
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
    if (!dateString) return '-';
    return format(new Date(dateString), 'yyyy-MM-dd');
  };

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '-';
    return `R ${amount.toFixed(2)}`;
  };

  // Format status with badge
  const formatStatus = (status: string | undefined) => {
    if (!status) return '-';
    
    const variant = 
      status === 'Active' ? 'default' :
      status === 'Completed' ? 'success' :
      status === 'Suspended' ? 'warning' : 'secondary';
    
    return (
      <Badge variant={variant as any}>{status}</Badge>
    );
  };

  // If there's an error, display it
  if (ordersError || employeesError || dashboardError) {
    return (
      <div className="p-6">
        <PageHeader title="Staff Garnishee Orders" />
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader 
        title="Staff Garnishee Orders" 
        description="Manage and track garnishee orders for employees"
        queryKeys={['/api/staff-garnishees', '/api/garnishee-dashboard']} 
      >
        {!editMode && (
          <Button 
            onClick={() => {
              setEditingGarnishee({});
              setEditMode(true);
            }}
          >
            Add Garnishee Order
          </Button>
        )}
      </PageHeader>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-semibold mb-2">Active Orders</div>
            <div className="text-3xl font-bold">{dashboardData.activeOrders}</div>
            <div className="text-sm text-neutral-500">Total active garnishee orders being processed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-semibold mb-2">Total Outstanding</div>
            <div className="text-3xl font-bold">R {dashboardData.totalOutstanding.toFixed(2)}</div>
            <div className="text-sm text-neutral-500">Combined total outstanding balance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-semibold mb-2">Monthly Payments</div>
            <div className="text-3xl font-bold">R {dashboardData.monthlyPayments.toFixed(2)}</div>
            <div className="text-sm text-neutral-500">Combined monthly payment amount</div>
          </CardContent>
        </Card>
      </div>

      {editMode && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-xl font-semibold mb-4">
              {editingGarnishee.id ? "Edit Garnishee Order" : "Add New Garnishee Order"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee*</label>
                <Select
                  value={editingGarnishee.employeeId?.toString()}
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
                <label className="block text-sm font-medium mb-1">Case Number</label>
                <Input
                  value={editingGarnishee.caseNumber || ''}
                  onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Creditor*</label>
                <Input
                  value={editingGarnishee.creditor || ''}
                  onChange={(e) => handleInputChange('creditor', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Amount*</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingGarnishee.monthlyAmount || ''}
                  onChange={(e) => handleInputChange('monthlyAmount', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Total Amount*</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingGarnishee.totalAmount || ''}
                  onChange={(e) => handleInputChange('totalAmount', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Balance*</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingGarnishee.balance || ''}
                  onChange={(e) => handleInputChange('balance', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Start Date*</label>
                <Popover open={popoverOpen['startDate']} onOpenChange={() => togglePopover('startDate')}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editingGarnishee.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingGarnishee.startDate ? formatDate(editingGarnishee.startDate as unknown as string) : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingGarnishee.startDate as unknown as Date}
                      onSelect={(date) => {
                        handleInputChange('startDate', date);
                        togglePopover('startDate');
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Popover open={popoverOpen['endDate']} onOpenChange={() => togglePopover('endDate')}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editingGarnishee.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingGarnishee.endDate ? formatDate(editingGarnishee.endDate as unknown as string) : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingGarnishee.endDate as unknown as Date}
                      onSelect={(date) => {
                        handleInputChange('endDate', date);
                        togglePopover('endDate');
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select
                  value={editingGarnishee.status || 'Active'}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Comments</label>
                <Input
                  value={editingGarnishee.comments || ''}
                  onChange={(e) => handleInputChange('comments', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setEditMode(false);
                setEditingGarnishee({});
              }}>
                Cancel
              </Button>
              <Button onClick={editingGarnishee.id ? handleUpdateGarnishee : handleCreateGarnishee}>
                {editingGarnishee.id ? "Update" : "Create"} Garnishee Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="text-xl font-semibold mb-4">Garnishee Records</div>
          {ordersLoading || employeesLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : garnisheeOrders.length === 0 ? (
            <div className="text-center py-4 text-neutral-500">
              No garnishee orders found. Click "Add Garnishee Order" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emp. Code</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Creditor</TableHead>
                  <TableHead>Monthly Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garnisheeOrders.map((order: any, rowIndex: number) => (
                  <TableRow key={order.id} className={rowIndex % 2 === 0 ? 'bg-neutral-50' : ''}>
                    <TableCell className="font-medium">{order.employeeCode || '-'}</TableCell>
                    <TableCell>{order.employeeName}</TableCell>
                    <TableCell>{order.caseNumber || '-'}</TableCell>
                    <TableCell>{order.creditor}</TableCell>
                    <TableCell>{formatCurrency(order.monthlyAmount)}</TableCell>
                    <TableCell>{formatCurrency(order.balance)}</TableCell>
                    <TableCell>{formatStatus(order.status)}</TableCell>
                    <TableCell>{formatDate(order.startDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => startEditing(order)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteGarnishee(order.id)}
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