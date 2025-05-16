import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/page-header";
import { EmployeeWorkflow } from "@/components/employees/employee-workflow";
import { TerminationForm } from "@/components/termination/termination-form";
import { BankAccountChangeForm } from "@/components/bank-account/bank-account-change-form";
import { LeaveForm } from "@/components/leave/leave-form";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { StaffActionDialog } from "@/components/staff/staff-action-dialog";
import { StaffRecordsTable } from "@/components/staff/staff-records-table";
import { Button } from "@/components/ui/button";

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Form control states
  const [employeeWorkflowOpen, setEmployeeWorkflowOpen] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [terminationFormOpen, setTerminationFormOpen] = useState(false);
  const [bankAccountFormOpen, setBankAccountFormOpen] = useState(false);
  
  // Success dialog
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Handle staff action selection
  const handleStaffAction = (action: "add-employee" | "leave" | "termination" | "bank-account") => {
    switch (action) {
      case "add-employee":
        setEmployeeWorkflowOpen(true);
        break;
      case "leave":
        setLeaveFormOpen(true);
        break;
      case "termination":
        setTerminationFormOpen(true);
        break;
      case "bank-account":
        setBankAccountFormOpen(true);
        break;
    }
  };
  
  // Create leave record mutation
  const createLeaveMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/payroll-records", "POST", {
        ...data,
        recordType: "Leave",
        createdBy: user?.id
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-records"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/staff-records"] });
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
        actions={<StaffActionDialog onSelectAction={handleStaffAction} />}
      />

      {/* Staff Records Table */}
      <StaffRecordsTable />

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