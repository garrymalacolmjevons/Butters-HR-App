import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/page-header";
import { EmployeeWorkflow } from "@/components/employees/employee-workflow";
import { TerminationForm } from "@/components/termination/termination-form";
import { BankAccountChangeForm } from "@/components/bank-account/bank-account-change-form";
import { LeaveForm } from "@/components/leave/leave-form";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, X, RefreshCw, Filter, CheckIcon, CalendarDays, UserMinus, CreditCard, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { formatDate, formatCurrency } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/refresh-button";

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState("leave");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form control states
  const [employeeWorkflowOpen, setEmployeeWorkflowOpen] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [terminationFormOpen, setTerminationFormOpen] = useState(false);
  const [bankAccountFormOpen, setBankAccountFormOpen] = useState(false);
  
  // Success dialog
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Query to fetch staff records based on record type
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["/api/staff-records", activeTab],
    queryFn: async () => {
      const recordType = activeTab === "all" ? undefined : 
                        activeTab === "leave" ? "Leave" : 
                        activeTab === "termination" ? "Termination" : 
                        activeTab === "bank-account" ? "Bank Account Change" :
                        activeTab === "new-staff" ? "New Staff" : undefined;
      
      const response = await fetch(`/api/staff-records${recordType ? `?recordType=${recordType}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch records');
      return await response.json();
    }
  });
  
  // Filtered records based on search term
  const filteredRecords = records.filter((record: any) => {
    if (!searchTerm) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return record.employeeName.toLowerCase().includes(lowerSearchTerm) || 
           record.details?.toLowerCase().includes(lowerSearchTerm);
  });
  
  // Handle staff action selection based on current tab
  const handleAddRecord = () => {
    switch (activeTab) {
      case "leave":
        setLeaveFormOpen(true);
        break;
      case "termination":
        setTerminationFormOpen(true);
        break;
      case "bank-account":
        setBankAccountFormOpen(true);
        break;
      case "add-employee":
        setEmployeeWorkflowOpen(true);
        break;
    }
  };
  
  // Handle refresh of data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/staff-records"] });
  };
  
  // Create leave record mutation
  const createLeaveMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating leave record with data:", data);
      try {
        const response = await apiRequest("POST", "/api/payroll-records", {
          ...data,
          recordType: "Leave",
          createdBy: user?.id
        });
        console.log("Leave record created successfully:", response);
        return response;
      } catch (error) {
        console.error("Error creating leave record:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      setSuccessMessage("Leave record has been created successfully");
      setSuccessDialogOpen(true);
      setLeaveFormOpen(false);
      
      // Log activity
      if (user?.id) {
        apiRequest("POST", "/api/activity-logs", {
          userId: user.id,
          action: "Created leave record",
          details: `Created a new leave record`
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create leave record",
        description: error.message
      });
    }
  });
  
  // Create termination record mutation
  const createTerminationMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating termination record with data:", data);
      try {
        const response = await apiRequest("POST", "/api/payroll-records", {
          ...data,
          recordType: "Termination",
          createdBy: user?.id
        });
        console.log("Termination record created successfully:", response);
        return response;
      } catch (error) {
        console.error("Error creating termination record:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      setSuccessMessage("Termination record has been created successfully");
      setSuccessDialogOpen(true);
      setTerminationFormOpen(false);
      
      // Log activity
      if (user?.id) {
        apiRequest("POST", "/api/activity-logs", {
          userId: user.id,
          action: "Created termination record",
          details: `Recorded an employee termination`
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create termination record",
        description: error.message
      });
    }
  });
  
  // Create bank account change mutation
  const createBankAccountChangeMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating bank account change record with data:", data);
      // If approved is true, we'll send an email to Sherry and log for Tracey
      const sendNotification = data.approved;
      
      try {
        const response = await apiRequest("POST", "/api/payroll-records", {
          ...data,
          recordType: "Bank Account Change",
          createdBy: user?.id,
          sendNotification
        });
        console.log("Bank account change record created successfully:", response);
        return response;
      } catch (error) {
        console.error("Error creating bank account change record:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-records"] });
      
      let message = "Bank account change has been recorded successfully";
      if (variables.approved) {
        message += ". A notification has been sent to Sherry and the change has been logged for Tracey.";
      }
      
      setSuccessMessage(message);
      setSuccessDialogOpen(true);
      setBankAccountFormOpen(false);
      
      // Log activity
      if (user?.id) {
        apiRequest("POST", "/api/activity-logs", {
          userId: user.id,
          action: "Recorded bank account change",
          details: `Recorded a bank account change for an employee`
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to record bank account change",
        description: error.message
      });
    }
  });

  // Get record type icon
  const getRecordTypeIcon = (recordType: string) => {
    switch (recordType) {
      case "Leave":
        return <CalendarDays size={16} className="text-blue-500" />;
      case "Termination":
        return <UserMinus size={16} className="text-red-500" />;
      case "Bank Account Change":
        return <CreditCard size={16} className="text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Staff Management"
        description="Manage staff-related functions including leave, terminations, bank account changes, and adding new employees"
        actions={
          <div className="flex gap-2">
            <RefreshButton
              queryKeys={["/api/staff-records", "/api/employees"]}
              label="Refresh" 
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button>Staff Action</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Staff Actions</DialogTitle>
                  <DialogDescription>
                    Select the staff-related action you want to perform
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 py-4">
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal h-auto py-3"
                    onClick={() => {
                      setLeaveFormOpen(true);
                    }}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-blue-500" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Record Leave</span>
                      <span className="text-sm text-muted-foreground">Record employee leave days</span>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal h-auto py-3"
                    onClick={() => {
                      setTerminationFormOpen(true);
                    }}
                  >
                    <UserMinus className="mr-2 h-4 w-4 text-red-500" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Record Termination</span>
                      <span className="text-sm text-muted-foreground">Process employee termination</span>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal h-auto py-3"
                    onClick={() => {
                      setBankAccountFormOpen(true);
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4 text-green-500" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Change Bank Account</span>
                      <span className="text-sm text-muted-foreground">Update employee bank details</span>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal h-auto py-3"
                    onClick={() => {
                      setEmployeeWorkflowOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4 text-amber-500" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Add New Employee</span>
                      <span className="text-sm text-muted-foreground">Add a new employee to the system</span>
                    </div>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-6">
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="termination">Termination</TabsTrigger>
          <TabsTrigger value="bank-account">Bank Account</TabsTrigger>
          <TabsTrigger value="new-staff">New Staff</TabsTrigger>
        </TabsList>

        <div className="flex items-center mb-4 space-x-2">
          <div className="relative flex-1">
            <Input 
              placeholder={`Search ${activeTab} records...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredRecords.length} records
          </span>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>{activeTab === "leave" ? "Days" : "Hours"}</TableHead>
                <TableHead>{activeTab === "bank-account" ? "Bank" : "Rate"}</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Loading records...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No {activeTab} records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>{record.employeeName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <div className="flex items-center">
                        {getRecordTypeIcon(record.recordType)}
                        <span className="ml-1">{record.details || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{record.totalDays || record.hours || '—'}</TableCell>
                    <TableCell>{record.rate || '—'}</TableCell>
                    <TableCell>{record.amount ? formatCurrency(record.amount) : '—'}</TableCell>
                    <TableCell>
                      {record.approved ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          <CheckIcon className="h-3 w-3 mr-1" /> Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                          <X className="h-3 w-3 mr-1" /> No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8">
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
      </Tabs>

      {/* Employee Workflow */}
      <EmployeeWorkflow 
        isOpen={employeeWorkflowOpen || activeTab === "add-employee" && leaveFormOpen === false && terminationFormOpen === false && bankAccountFormOpen === false}
        onClose={() => setEmployeeWorkflowOpen(false)} 
      />
      
      {/* Leave Form */}
      <LeaveForm
        isOpen={leaveFormOpen}
        onClose={() => setLeaveFormOpen(false)}
        onSubmit={(data) => {
          console.log("Leave form submitted with data:", data);
          createLeaveMutation.mutate(data);
          console.log("createLeaveMutation called");
        }}
        isSubmitting={createLeaveMutation.isPending}
        title="Record Employee Leave"
      />
      
      {/* Termination Form */}
      <TerminationForm
        isOpen={terminationFormOpen}
        onClose={() => setTerminationFormOpen(false)}
        onSubmit={createTerminationMutation.mutate}
        isSubmitting={createTerminationMutation.isPending}
        title="Record Employee Termination"
      />
      
      {/* Bank Account Change Form */}
      <BankAccountChangeForm
        isOpen={bankAccountFormOpen}
        onClose={() => setBankAccountFormOpen(false)}
        onSubmit={createBankAccountChangeMutation.mutate}
        isSubmitting={createBankAccountChangeMutation.isPending}
        title="Change Employee Bank Account"
      />
      
      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
              Success
            </AlertDialogTitle>
            <AlertDialogDescription>
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>
              OK
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}