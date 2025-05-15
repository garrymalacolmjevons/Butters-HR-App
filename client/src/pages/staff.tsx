import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { EmployeeWorkflow } from "@/components/employees/employee-workflow";
import { TerminationForm } from "@/components/termination/termination-form";
import { BankAccountChangeForm } from "@/components/bank-account/bank-account-change-form";
import { LeaveForm } from "@/components/leave/leave-form";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

import { 
  UserPlusIcon, 
  UserMinusIcon, 
  BanknotesIcon, 
  CalendarDaysIcon
} from "@heroicons/react/24/outline";

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("leave");
  const [employeeWorkflowOpen, setEmployeeWorkflowOpen] = useState(false);
  
  // Form control states
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [terminationFormOpen, setTerminationFormOpen] = useState(false);
  const [bankAccountFormOpen, setBankAccountFormOpen] = useState(false);
  
  // Success dialog
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Create leave record mutation
  const createLeaveMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/payroll-records", "POST", {
        ...data,
        recordType: "Leave",
        createdBy: user?.id
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      setSuccessMessage("Leave record has been created successfully");
      setSuccessDialogOpen(true);
      setLeaveFormOpen(false);
      
      // Log activity
      if (user?.id) {
        apiRequest("/api/activity-logs", "POST", {
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
    mutationFn: (data: any) => 
      apiRequest("/api/payroll-records", "POST", {
        ...data,
        recordType: "Termination",
        createdBy: user?.id
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      setSuccessMessage("Termination record has been created successfully");
      setSuccessDialogOpen(true);
      setTerminationFormOpen(false);
      
      // Log activity
      if (user?.id) {
        apiRequest("/api/activity-logs", "POST", {
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
    mutationFn: (data: any) => {
      // If approved is true, we'll send an email to Sherry and log for Tracey
      const sendNotification = data.approved;
      
      return apiRequest("/api/payroll-records", "POST", {
        ...data,
        recordType: "Bank Account Change",
        createdBy: user?.id,
        sendNotification
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-records"] });
      
      let message = "Bank account change has been recorded successfully";
      if (variables.approved) {
        message += ". A notification has been sent to Sherry and the change has been logged for Tracey.";
      }
      
      setSuccessMessage(message);
      setSuccessDialogOpen(true);
      setBankAccountFormOpen(false);
      
      // Log activity
      if (user?.id) {
        apiRequest("/api/activity-logs", "POST", {
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage staff-related functions including leave, terminations, bank account changes, and adding new employees"
        actions={
          <Button onClick={() => setEmployeeWorkflowOpen(true)} className="flex items-center">
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Add New Employee
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="leave" className="flex items-center justify-center">
            <CalendarDaysIcon className="w-4 h-4 mr-2" />
            Leave
          </TabsTrigger>
          <TabsTrigger value="termination" className="flex items-center justify-center">
            <UserMinusIcon className="w-4 h-4 mr-2" />
            Termination
          </TabsTrigger>
          <TabsTrigger value="bank-account" className="flex items-center justify-center">
            <BanknotesIcon className="w-4 h-4 mr-2" />
            Bank Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Leave Management</h3>
              <Button onClick={() => setLeaveFormOpen(true)}>Capture Leave</Button>
            </div>
            <Alert>
              <AlertTitle>How to use</AlertTitle>
              <AlertDescription>
                Click "Capture Leave" to record employee leave. You can specify the employee, leave type, 
                start and end dates, and upload supporting documentation.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        <TabsContent value="termination" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Termination Management</h3>
              <Button onClick={() => setTerminationFormOpen(true)}>Record Termination</Button>
            </div>
            <Alert>
              <AlertTitle>How to use</AlertTitle>
              <AlertDescription>
                Click "Record Termination" to document an employee termination. You'll need to specify the
                employee, termination date, reason for termination, and can upload supporting documentation.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        <TabsContent value="bank-account" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Bank Account Changes</h3>
              <Button onClick={() => setBankAccountFormOpen(true)}>Change Bank Account</Button>
            </div>
            <Alert>
              <AlertTitle>How to use</AlertTitle>
              <AlertDescription>
                Click "Change Bank Account" to record a change in employee banking details. You must upload proof
                of the bank account. When approved, a notification will be sent to Sherry for processing.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>

      {/* Employee Workflow */}
      <EmployeeWorkflow 
        isOpen={employeeWorkflowOpen} 
        onClose={() => setEmployeeWorkflowOpen(false)} 
      />
      
      {/* Leave Form */}
      <LeaveForm
        isOpen={leaveFormOpen}
        onClose={() => setLeaveFormOpen(false)}
        onSubmit={createLeaveMutation.mutate}
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