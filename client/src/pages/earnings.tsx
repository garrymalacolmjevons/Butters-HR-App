import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";

export default function EarningsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overtime");
  const [showEarningTypeDialog, setShowEarningTypeDialog] = useState(false);

  const earningTypes = [
    {
      id: "overtime",
      title: "Overtime",
      description: "Record overtime hours worked by employees"
    },
    {
      id: "commission",
      title: "Commission",
      description: "Record sales commissions and bonuses"
    },
    {
      id: "special-allowance",
      title: "Special Allowance",
      description: "Record special payments or benefits"
    },
    {
      id: "escort-allowance",
      title: "Escort Allowance",
      description: "Record escort duty payments for security personnel"
    }
  ];

  const handleSelectEarningType = (earningType: string) => {
    // Switch to the selected tab
    setActiveTab(earningType);
    // Close the dialog
    setShowEarningTypeDialog(false);
    
    // Future enhancement: Could also open the specific form for that type
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Earnings Management"
        description="Manage employee earnings including overtime, commissions, and special allowances"
        actions={
          <Dialog open={showEarningTypeDialog} onOpenChange={setShowEarningTypeDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Earning
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Select Earning Type</DialogTitle>
                <DialogDescription>
                  Choose the type of earning you want to add
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-4">
                {earningTypes.map((type) => (
                  <Card 
                    key={type.id} 
                    className={`cursor-pointer hover:border-primary transition-colors ${activeTab === type.id ? 'border-primary ring-2 ring-primary ring-opacity-20' : ''}`}
                    onClick={() => handleSelectEarningType(type.id)}
                  >
                    <CardHeader className="py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{type.title}</CardTitle>
                          <CardDescription className="pt-1">
                            {type.description}
                          </CardDescription>
                        </div>
                        {activeTab === type.id && (
                          <div className="bg-primary text-primary-foreground p-1 rounded-full">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
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