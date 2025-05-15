import { useState } from "react";
import { Tab } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { EmployeeWorkflow } from "@/components/employees/employee-workflow";
import { TerminationForm } from "@/components/termination/termination-form";
import { BankAccountChangeForm } from "@/components/bank-account/bank-account-change-form";
import { LeaveForm } from "@/components/leave/leave-form";
import { 
  UserPlusIcon, 
  UserMinusIcon, 
  BanknotesIcon, 
  CalendarDaysIcon
} from "@heroicons/react/24/outline";

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState("leave");
  const [employeeWorkflowOpen, setEmployeeWorkflowOpen] = useState(false);

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
        <TabsList className="grid grid-cols-4 w-full">
          <Tab value="leave" className="flex items-center justify-center">
            <CalendarDaysIcon className="w-4 h-4 mr-2" />
            Leave
          </Tab>
          <Tab value="termination" className="flex items-center justify-center">
            <UserMinusIcon className="w-4 h-4 mr-2" />
            Termination
          </Tab>
          <Tab value="bank-account" className="flex items-center justify-center">
            <BanknotesIcon className="w-4 h-4 mr-2" />
            Bank Account
          </Tab>
        </TabsList>

        <TabsContent value="leave" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <LeaveForm />
          </div>
        </TabsContent>

        <TabsContent value="termination" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <TerminationForm />
          </div>
        </TabsContent>

        <TabsContent value="bank-account" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <BankAccountChangeForm />
          </div>
        </TabsContent>
      </Tabs>

      <EmployeeWorkflow isOpen={employeeWorkflowOpen} onClose={() => setEmployeeWorkflowOpen(false)} />
    </div>
  );
}