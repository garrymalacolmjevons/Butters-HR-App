import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  BanknotesIcon, 
  ClipboardDocumentCheckIcon, 
  UserPlusIcon, 
  UserMinusIcon 
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/common/page-header";
import { useToast } from "@/hooks/use-toast";
import { BankAccountChangeForm } from "@/components/bank-account/bank-account-change-form";
import { LeaveForm } from "@/components/leave/leave-form";
import { EmployeeWorkflow } from "@/components/employees/employee-workflow";
import { InsertPayrollRecord } from "@shared/schema";

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for different forms
  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState(false);
  const [isNewEmployeeOpen, setIsNewEmployeeOpen] = useState(false);
  const [isTerminationOpen, setIsTerminationOpen] = useState(false);
  
  // Selected records for edit mode
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("bank-changes");

  // Create bank account change mutation
  const createBankChangeMutation = useMutation({
    mutationFn: (data: InsertPayrollRecord) => 
      apiRequest("/api/bank-account-change", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Send email notification to sherry and log for tracey
      const emailData = {
        to: "sherry@hitecsecurity.co.za",
        subject: "New Bank Account Change Request",
        message: "A new bank account change request has been submitted and requires your attention.",
        includeDocument: true
      };
      
      apiRequest("/api/send-notification", "POST", emailData);
      
      toast({
        title: "Bank account change request created",
        description: "The request has been created and notifications have been sent",
      });
      setIsBankFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating bank account change request",
        description: error.message,
      });
    },
  });

  // Create leave record mutation  
  const createLeaveMutation = useMutation({
    mutationFn: (data: InsertPayrollRecord) => 
      apiRequest("/api/leave", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Leave record created",
        description: "The leave record has been created successfully",
      });
      setIsLeaveFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating leave record",
        description: error.message,
      });
    },
  });

  // Create termination mutation
  const createTerminationMutation = useMutation({
    mutationFn: (data: InsertPayrollRecord) => 
      apiRequest("/api/termination", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Termination record created",
        description: "The termination record has been created successfully",
      });
      setIsTerminationOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating termination record",
        description: error.message,
      });
    },
  });

  const handleBankFormSubmit = (values: any) => {
    createBankChangeMutation.mutate(values);
  };

  const handleLeaveFormSubmit = (values: any) => {
    createLeaveMutation.mutate(values);
  };

  const handleTerminationFormSubmit = (values: any) => {
    createTerminationMutation.mutate(values);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Staff Management"
        description="Manage staff-related requests and information"
        actions={
          <div className="flex space-x-2">
            {activeTab === "bank-changes" && (
              <Button onClick={() => setIsBankFormOpen(true)}>
                <BanknotesIcon className="h-4 w-4 mr-2" />
                New Bank Change
              </Button>
            )}
            {activeTab === "leave" && (
              <Button onClick={() => setIsLeaveFormOpen(true)}>
                <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                New Leave Request
              </Button>
            )}
            {activeTab === "terminations" && (
              <Button onClick={() => setIsTerminationOpen(true)}>
                <UserMinusIcon className="h-4 w-4 mr-2" />
                New Termination
              </Button>
            )}
            {activeTab === "new-staff" && (
              <Button onClick={() => setIsNewEmployeeOpen(true)}>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                New Employee
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="bank-changes" className="mt-6" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="bank-changes">Bank Changes</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="terminations">Terminations</TabsTrigger>
          <TabsTrigger value="new-staff">New Staff</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bank-changes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Changes</CardTitle>
                <CardDescription>
                  Manage employee bank account change requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  When an employee needs to change their bank account details, create a new request here.
                  The request will be sent to payroll for processing.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setIsBankFormOpen(true)}>
                  <BanknotesIcon className="h-4 w-4 mr-2" />
                  New Bank Change
                </Button>
              </CardFooter>
            </Card>

            {/* TODO: Add list of recent bank change requests here */}
          </div>
        </TabsContent>
        
        <TabsContent value="leave" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>
                  Manage employee leave requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create and manage employee leave requests including annual leave, 
                  sick leave, and other leave types.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setIsLeaveFormOpen(true)}>
                  <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                  New Leave Request
                </Button>
              </CardFooter>
            </Card>

            {/* TODO: Add list of recent leave requests here */}
          </div>
        </TabsContent>
        
        <TabsContent value="terminations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Terminations</CardTitle>
                <CardDescription>
                  Process employee terminations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Record and process employee terminations. Ensure all required documentation
                  is included and notifications are sent to the appropriate departments.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setIsTerminationOpen(true)}>
                  <UserMinusIcon className="h-4 w-4 mr-2" />
                  New Termination
                </Button>
              </CardFooter>
            </Card>

            {/* TODO: Add list of recent terminations here */}
          </div>
        </TabsContent>
        
        <TabsContent value="new-staff" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>New Staff</CardTitle>
                <CardDescription>
                  Onboard new employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Start the onboarding process for new employees. Collect all necessary
                  information and documentation for payroll and HR.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setIsNewEmployeeOpen(true)}>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  New Employee
                </Button>
              </CardFooter>
            </Card>

            {/* TODO: Add list of recently added employees here */}
          </div>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <BankAccountChangeForm
        isOpen={isBankFormOpen}
        onClose={() => setIsBankFormOpen(false)}
        onSubmit={handleBankFormSubmit}
        isSubmitting={createBankChangeMutation.isPending}
        title="Bank Account Change Request"
      />
      
      <LeaveForm
        isOpen={isLeaveFormOpen}
        onClose={() => setIsLeaveFormOpen(false)}
        onSubmit={handleLeaveFormSubmit}
        isSubmitting={createLeaveMutation.isPending}
        title="Add Leave Record"
      />
      
      <EmployeeWorkflow
        isOpen={isNewEmployeeOpen}
        onClose={() => setIsNewEmployeeOpen(false)}
      />
      
      {/* TODO: Add termination form component */}

    </div>
  );
}