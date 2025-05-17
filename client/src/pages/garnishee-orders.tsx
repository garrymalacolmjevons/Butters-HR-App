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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { RefreshButton } from '@/components/ui/refresh-button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';

type Employee = {
  id: number;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  fullName?: string;
};

type StaffGarnishee = {
  id: number;
  employeeId: number;
  creditor: string;
  reason: string;
  totalAmount: number;
  startDate: string;
  endDate: string | null;
  installmentAmount: number;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Suspended';
  createdAt: string;
  updatedAt: string;
  employeeName?: string;
  employeeCode?: string | null;
  remainingAmount?: number;
};

type GarnisheePayment = {
  id: number;
  garnisheeId: number;
  paymentDate: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type DashboardData = {
  activeGarnishees: number;
  totalOutstanding: number;
  monthlyPayments: number;
};

const GarnisheeOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedGarnishee, setSelectedGarnishee] = useState<StaffGarnishee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [newGarnishee, setNewGarnishee] = useState({
    employeeId: '',
    creditor: '',
    reason: '',
    totalAmount: '',
    installmentAmount: '',
    startDate: '',
    status: 'Active'
  });
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentDate: '',
    notes: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [currentGarnisheePayments, setCurrentGarnisheePayments] = useState<GarnisheePayment[]>([]);

  // Fetch garnishee data
  const { 
    data: garnishees = [], 
    isLoading: isLoadingGarnishees,
    refetch: refetchGarnishees 
  } = useQuery({
    queryKey: ['/api/staff-garnishees'],
    retry: false
  });

  // Fetch dashboard data
  const { 
    data: dashboardData = { activeGarnishees: 0, totalOutstanding: 0, monthlyPayments: 0 }, 
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['/api/garnishee-dashboard'],
    retry: false
  });

  // Fetch employees
  const { 
    data: employees = [], 
    isLoading: isLoadingEmployees 
  } = useQuery({
    queryKey: ['/api/employees'],
    retry: false
  });

  const handleRefresh = () => {
    refetchGarnishees();
    refetchDashboard();
  };

  const openGarnisheeForm = (garnishee?: StaffGarnishee) => {
    if (garnishee) {
      setNewGarnishee({
        employeeId: garnishee.employeeId.toString(),
        creditor: garnishee.creditor,
        reason: garnishee.reason,
        totalAmount: garnishee.totalAmount.toString(),
        installmentAmount: garnishee.installmentAmount.toString(),
        startDate: garnishee.startDate,
        status: garnishee.status
      });
      setEditMode(true);
      setSelectedGarnishee(garnishee);
    } else {
      setNewGarnishee({
        employeeId: '',
        creditor: '',
        reason: '',
        totalAmount: '',
        installmentAmount: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'Active'
      });
      setEditMode(false);
      setSelectedGarnishee(null);
    }
    setIsFormOpen(true);
  };

  const openPaymentForm = async (garnishee: StaffGarnishee) => {
    setSelectedGarnishee(garnishee);
    setNewPayment({
      amount: garnishee.installmentAmount.toString(),
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    });

    try {
      const payments = await apiRequest<GarnisheePayment[]>(`/api/garnishee-payments/${garnishee.id}`);
      setCurrentGarnisheePayments(payments);
      setIsPaymentFormOpen(true);
    } catch (error) {
      console.error("Error fetching garnishee payments:", error);
      toast({
        title: "Error",
        description: "Failed to load garnishee payment history",
        variant: "destructive"
      });
    }
  };

  const handleGarnisheeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const garnisheeData = {
        employeeId: parseInt(newGarnishee.employeeId),
        creditor: newGarnishee.creditor,
        reason: newGarnishee.reason,
        totalAmount: parseFloat(newGarnishee.totalAmount),
        installmentAmount: parseFloat(newGarnishee.installmentAmount),
        startDate: newGarnishee.startDate,
        status: newGarnishee.status
      };

      if (editMode && selectedGarnishee) {
        await apiRequest(`/api/staff-garnishees/${selectedGarnishee.id}`, 'PATCH', garnisheeData);
        toast({
          title: "Success",
          description: "Garnishee order updated successfully"
        });
      } else {
        await apiRequest('/api/staff-garnishees', 'POST', garnisheeData);
        toast({
          title: "Success",
          description: "Garnishee order added successfully"
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/staff-garnishees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/garnishee-dashboard'] });
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error submitting garnishee:", error);
      toast({
        title: "Error",
        description: "Failed to save garnishee order",
        variant: "destructive"
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGarnishee) return;
    
    try {
      const paymentData = {
        garnisheeId: selectedGarnishee.id,
        amount: parseFloat(newPayment.amount),
        paymentDate: newPayment.paymentDate,
        notes: newPayment.notes || null
      };

      await apiRequest('/api/garnishee-payments', 'POST', paymentData);
      toast({
        title: "Success",
        description: "Payment recorded successfully"
      });

      // Refresh data
      const payments = await apiRequest<GarnisheePayment[]>(`/api/garnishee-payments/${selectedGarnishee.id}`);
      setCurrentGarnisheePayments(payments);
      queryClient.invalidateQueries({ queryKey: ['/api/staff-garnishees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/garnishee-dashboard'] });
      
      // Clear form
      setNewPayment({
        amount: selectedGarnishee.installmentAmount.toString(),
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGarnishee = async (id: number) => {
    if (!confirm("Are you sure you want to delete this garnishee order? This action cannot be undone.")) return;
    
    try {
      await apiRequest(`/api/staff-garnishees/${id}`, 'DELETE');
      toast({
        title: "Success",
        description: "Garnishee order deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/staff-garnishees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/garnishee-dashboard'] });
    } catch (error) {
      console.error("Error deleting garnishee:", error);
      toast({
        title: "Error",
        description: "Failed to delete garnishee order",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Completed': return 'success';
      case 'Cancelled': return 'destructive';
      case 'Suspended': return 'outline';
      default: return 'secondary';
    }
  };

  const getEmployeeNameById = (id: number) => {
    const employee = (employees as Employee[]).find(emp => emp.id === id);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="Staff Garnishee Orders" />
        <RefreshButton onClick={handleRefresh} />
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Active Orders</h3>
            <p className="text-2xl font-bold">{dashboardData.activeGarnishees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Outstanding</h3>
            <p className="text-2xl font-bold">{formatCurrency(dashboardData.totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Monthly Payments</h3>
            <p className="text-2xl font-bold">{formatCurrency(dashboardData.monthlyPayments)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => openGarnisheeForm()}>Add New Garnishee Order</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoadingGarnishees ? (
          <div className="p-4 text-center">Loading garnishee orders...</div>
        ) : garnishees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No garnishee orders found. Click 'Add New Garnishee Order' to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Emp. Code</TableHead>
                  <TableHead>Creditor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Monthly Amount</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garnishees.map((garnishee: StaffGarnishee) => (
                  <TableRow key={garnishee.id}>
                    <TableCell>{garnishee.employeeName}</TableCell>
                    <TableCell>{garnishee.employeeCode || 'N/A'}</TableCell>
                    <TableCell>{garnishee.creditor}</TableCell>
                    <TableCell>{garnishee.reason}</TableCell>
                    <TableCell>{formatCurrency(garnishee.totalAmount)}</TableCell>
                    <TableCell>{formatCurrency(garnishee.installmentAmount)}</TableCell>
                    <TableCell>{formatDate(garnishee.startDate)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(garnishee.status)}>
                        {garnishee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(garnishee.remainingAmount || 0)}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openGarnisheeForm(garnishee)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => openPaymentForm(garnishee)}>Payments</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteGarnishee(garnishee.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Garnishee Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Garnishee Order" : "Add New Garnishee Order"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGarnisheeSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Employee</label>
              <Select 
                value={newGarnishee.employeeId} 
                onValueChange={(value) => setNewGarnishee({...newGarnishee, employeeId: value})}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employees as Employee[]).map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName} {employee.employeeCode ? `(${employee.employeeCode})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Creditor</label>
                <Input 
                  value={newGarnishee.creditor} 
                  onChange={(e) => setNewGarnishee({...newGarnishee, creditor: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Reason</label>
                <Input 
                  value={newGarnishee.reason} 
                  onChange={(e) => setNewGarnishee({...newGarnishee, reason: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Total Amount (R)</label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={newGarnishee.totalAmount} 
                  onChange={(e) => setNewGarnishee({...newGarnishee, totalAmount: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Monthly Installment (R)</label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={newGarnishee.installmentAmount} 
                  onChange={(e) => setNewGarnishee({...newGarnishee, installmentAmount: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Start Date</label>
                <Input 
                  type="date" 
                  value={newGarnishee.startDate} 
                  onChange={(e) => setNewGarnishee({...newGarnishee, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Status</label>
                <Select 
                  value={newGarnishee.status} 
                  onValueChange={(value: any) => setNewGarnishee({...newGarnishee, status: value})}
                >
                  <SelectTrigger className="w-full">
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
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editMode ? "Update" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Management Dialog */}
      <Dialog open={isPaymentFormOpen} onOpenChange={setIsPaymentFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Payments</DialogTitle>
          </DialogHeader>
          
          {selectedGarnishee && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium">Employee</p>
                  <p>{selectedGarnishee.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Creditor</p>
                  <p>{selectedGarnishee.creditor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p>{formatCurrency(selectedGarnishee.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Remaining</p>
                  <p>{formatCurrency(selectedGarnishee.remainingAmount || 0)}</p>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="history" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Payment History</TabsTrigger>
              <TabsTrigger value="add">Add Payment</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="mt-4">
              {currentGarnisheePayments.length === 0 ? (
                <div className="text-center p-4 text-gray-500">No payment records found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentGarnisheePayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="add" className="mt-4">
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Payment Amount (R)</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={newPayment.amount} 
                      onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Payment Date</label>
                    <Input 
                      type="date" 
                      value={newPayment.paymentDate} 
                      onChange={(e) => setNewPayment({...newPayment, paymentDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Notes (Optional)</label>
                  <Input 
                    value={newPayment.notes} 
                    onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="submit">Record Payment</Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GarnisheeOrders;