import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, X, CalendarIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function EarningsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overtime");
  const [showEarningTypeDialog, setShowEarningTypeDialog] = useState(false);
  const [showEarningForm, setShowEarningForm] = useState(false);
  const [currentEarningType, setCurrentEarningType] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

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
    // Set the earning type
    setCurrentEarningType(earningType);
    // Close the type selection dialog
    setShowEarningTypeDialog(false);
    // Open the earning form dialog
    setShowEarningForm(true);
  };

  const handleSaveEarning = (e: React.MouseEvent) => {
    e.preventDefault();
    // For now, we'll just show a success message without making a real API call
    // In a real implementation, you would submit the form data to the backend here
    
    // Show success toast or notification (would need to implement this)
    alert("Earning saved successfully! (This is a placeholder - no actual data was saved)");
    
    // Close the form dialog
    setShowEarningForm(false);
    
    // Switch to the appropriate tab
    if (currentEarningType) {
      setActiveTab(currentEarningType);
    }
  };

  const getFormTitle = () => {
    if (!currentEarningType) return "Add Earning";
    
    const type = earningTypes.find(t => t.id === currentEarningType);
    return type ? `Add ${type.title}` : "Add Earning";
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

      {/* Earning Form Dialog */}
      <Dialog open={showEarningForm} onOpenChange={setShowEarningForm}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>{getFormTitle()}</DialogTitle>
              <DialogClose>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription>
              Fill in the details for the earning record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName} ({employee.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input 
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            {currentEarningType === 'overtime' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input 
                    id="hours"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekday">Weekday (R400 × 1.5)</SelectItem>
                      <SelectItem value="saturday">Saturday (R400 × 2.0)</SelectItem>
                      <SelectItem value="sunday">Sunday (R400 × 2.0)</SelectItem>
                      <SelectItem value="public-holiday">Public Holiday (R400 × 3.0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {currentEarningType === 'commission' && (
              <div className="space-y-2">
                <Label htmlFor="commissionType">Commission Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Commission Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Commission</SelectItem>
                    <SelectItem value="bonus">Performance Bonus</SelectItem>
                    <SelectItem value="other">Other Commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                placeholder="Enter a description for this earning"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes"
                placeholder="Enter any additional notes about this earning"
                rows={2}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Switch id="approved" />
                <Label htmlFor="approved">Approved?</Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEarningForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEarning}>
              Save Earning
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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