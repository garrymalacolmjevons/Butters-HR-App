import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/lib/auth";

export default function EarningsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overtime");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Earnings Management"
        description="Manage employee earnings including overtime, commissions, and special allowances"
        actions={
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Earning
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overtime" className="flex items-center justify-center">
            Overtime
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center justify-center">
            Commission
          </TabsTrigger>
          <TabsTrigger value="special-allowance" className="flex items-center justify-center">
            Special Allowance
          </TabsTrigger>
          <TabsTrigger value="escort-allowance" className="flex items-center justify-center">
            Escort Allowance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overtime" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <p className="text-center py-8 text-gray-500">
              Overtime form will be implemented here. This will allow you to record and track overtime hours worked by employees.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="commission" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <p className="text-center py-8 text-gray-500">
              Commission form will be implemented here. This will allow you to record sales commissions and bonuses earned by employees.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="special-allowance" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <p className="text-center py-8 text-gray-500">
              Special allowance form will be implemented here. This will allow you to record special payments or benefits given to employees.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="escort-allowance" className="mt-6">
          <div className="bg-card rounded-lg border shadow p-6">
            <p className="text-center py-8 text-gray-500">
              Escort allowance form will be implemented here. This will allow you to record escort duty payments for security personnel.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}