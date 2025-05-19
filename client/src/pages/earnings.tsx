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
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { EarningsTable } from "@/components/earnings/earnings-table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EnhancedEmployeeSearch } from "@/components/employees/enhanced-employee-search";
import { useForm } from "react-hook-form";

interface EarningFormData {
  employeeId: number | null;
  date: string | null;
  amount: number | null;
  recordType: string;
  hours?: number | null;
  rate?: number | null;
  description?: string | null;
  notes?: string | null;
  approved: boolean;
}

export default function EarningsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overtime");
  const [showEarningTypeDialog, setShowEarningTypeDialog] = useState(false);
  const [showEarningForm, setShowEarningForm] = useState(false);
  const [currentEarningType, setCurrentEarningType] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [earningIdToEdit, setEarningIdToEdit] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<EarningFormData>({
    employeeId: null,
    date: date ? format(date, "yyyy-MM-dd") : null,
    amount: null,
    recordType: "Overtime",
    hours: null,
    rate: null,
    description: null,
    notes: null,
    approved: false
  });
  
  // Initialize React Hook Form for the enhanced employee search
  const form = useForm({
    defaultValues: {
      employeeId: formData.employeeId || undefined,
    }
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Fetch overtime rates
  const { data: overtimeRates = [] } = useQuery({
    queryKey: ['/api/overtime-rates'],
  });

  // Create earnings mutation
  const createEarning = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/payroll-records", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Earning record created successfully",
        variant: "default",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating earning:", error);
      toast({
        title: "Error",
        description: `Failed to create earning: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Update earnings mutation
  const updateEarning = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest("PATCH", `/api/payroll-records/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      toast({
        title: "Success",
        description: "Earning record updated successfully",
        variant: "default",
      });
      setIsEditMode(false);
      setEarningIdToEdit(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating earning:", error);
      toast({
        title: "Error",
        description: `Failed to update earning: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const earningTypes = [
    {
      id: "overtime",
      title: "Overtime",
      recordType: "Overtime",
      description: "Record overtime hours worked by employees"
    },
    {
      id: "commission",
      title: "Commission",
      recordType: "Commission",
      description: "Record sales commissions and bonuses"
    },
    {
      id: "special-allowance",
      title: "Special Shift",
      recordType: "Special Shift",
      description: "Record special payments or benefits"
    },
    {
      id: "escort-allowance",
      title: "Escort Allowance",
      recordType: "Escort Allowance",
      description: "Record escort duty payments for security personnel"
    },
    {
      id: "cash-in-transit",
      title: "Cash in Transit",
      recordType: "Cash in Transit",
      description: "Record cash in transit payments for employees"
    },
    {
      id: "standby-shift",
      title: "Standby Shift",
      recordType: "Standby Shift",
      description: "Record standby shift allowances for employees"
    }
  ];

  const resetForm = () => {
    setFormData({
      employeeId: null,
      date: new Date() ? format(new Date(), "yyyy-MM-dd") : null,
      amount: null,
      recordType: currentEarningType ? 
        earningTypes.find(t => t.id === currentEarningType)?.recordType || "Overtime" 
        : "Overtime",
      hours: null,
      rate: null,
      description: null,
      notes: null,
      approved: false
    });
    
    // Reset the React Hook Form state
    form.reset({
      employeeId: undefined,
    });
    
    setDate(new Date());
    setIsEditMode(false);
    setEarningIdToEdit(null);
  };

  const handleSelectEarningType = (earningTypeId: string) => {
    const earningType = earningTypes.find(t => t.id === earningTypeId);
    if (!earningType) return;
    
    // Set the earning type
    setCurrentEarningType(earningTypeId);
    setFormData(prev => ({
      ...prev,
      recordType: earningType.recordType,
    }));
    
    // Close the type selection dialog
    setShowEarningTypeDialog(false);
    // Open the earning form dialog
    setShowEarningForm(true);
  };
  
  // Handle editing an existing earning
  const handleEditEarning = (earning: any) => {
    // Map record type to tab id
    const earnType = earningTypes.find(t => t.recordType === earning.recordType);
    if (earnType) {
      setCurrentEarningType(earnType.id);
      setActiveTab(earnType.id);
    }
    
    // Set form data from the earning record
    setFormData({
      employeeId: earning.employeeId,
      date: earning.date,
      amount: earning.amount,
      recordType: earning.recordType,
      hours: earning.hours || null,
      rate: earning.rate || null,
      description: earning.description || null,
      notes: earning.notes || null,
      approved: earning.approved || false
    });
    
    // Update React Hook Form values for the enhanced employee search
    form.reset({
      employeeId: earning.employeeId,
    });
    
    // Set date for calendar
    if (earning.date) {
      setDate(new Date(earning.date));
    }
    
    // Set edit mode
    setIsEditMode(true);
    setEarningIdToEdit(earning.id);
    
    // Open the form
    setShowEarningForm(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: format(selectedDate, "yyyy-MM-dd")
      }));
    }
  };

  const handleSaveEarning = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.employeeId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    if (!formData.date) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (formData.amount === null || formData.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // We've removed the development-only check to allow real API calls

    try {
      // Submit the data - either create or update
      if (isEditMode && earningIdToEdit) {
        await updateEarning.mutateAsync({ id: earningIdToEdit, data: formData });
      } else {
        await createEarning.mutateAsync(formData);
      }
      
      // Force refetch all earning tables
      await queryClient.invalidateQueries({ queryKey: ['/api/payroll-records'] });
      
      // Close the form dialog
      setShowEarningForm(false);
      
      // Switch to the appropriate tab
      if (currentEarningType) {
        setActiveTab(currentEarningType);
      }
    } catch (error) {
      console.error("Error saving earning:", error);
      // Error is already handled by the mutation
    }
  };

  const getFormTitle = () => {
    if (!currentEarningType) return isEditMode ? "Edit Earning" : "Add Earning";
    
    const type = earningTypes.find(t => t.id === currentEarningType);
    return type ? `${isEditMode ? 'Edit' : 'Add'} ${type.title}` : (isEditMode ? "Edit Earning" : "Add Earning");
  };

  const mapTabToRecordType = (tabId: string) => {
    const earningType = earningTypes.find(t => t.id === tabId);
    return earningType ? earningType.recordType : "Overtime";
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
            {/* Enhanced Employee Search */}
            <div className="space-y-2">
              {/* Use React Hook Form for the employee field */}
              <EnhancedEmployeeSearch
                control={form.control}
                name="employeeId"
                required
                onChange={(value) => {
                  // Update the form data state when the employee selection changes
                  handleInputChange("employeeId", value);
                }}
              />
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
                      onSelect={handleDateSelect}
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
                  value={formData.amount || ""}
                  onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
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
                    value={formData.hours || ""}
                    onChange={(e) => handleInputChange("hours", parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate Type</Label>
                  <Select
                    onValueChange={(value) => handleInputChange("rate", parseFloat(value))}
                    value={formData.rate?.toString() || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Rate Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(overtimeRates) ? overtimeRates.map((rate: any) => (
                        <SelectItem key={rate.id} value={rate.rate.toString()}>
                          {rate.overtimeType} (×{rate.rate})
                        </SelectItem>
                      )) : null}
                      {(!Array.isArray(overtimeRates) || overtimeRates.length === 0) && (
                        <>
                          <SelectItem value="1.5">Weekday (×1.5)</SelectItem>
                          <SelectItem value="2.0">Saturday/Sunday (×2.0)</SelectItem>
                          <SelectItem value="3.0">Public Holiday (×3.0)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {currentEarningType === 'commission' && (
              <div className="space-y-2">
                <Label htmlFor="commissionType">Commission Type</Label>
                <Select
                  onValueChange={(value) => handleInputChange("description", value)}
                  value={formData.description || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Commission Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales Commission">Sales Commission</SelectItem>
                    <SelectItem value="Performance Bonus">Performance Bonus</SelectItem>
                    <SelectItem value="Other Commission">Other Commission</SelectItem>
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
                value={formData.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes"
                placeholder="Enter any additional notes about this earning"
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="approved" 
                  checked={formData.approved}
                  onCheckedChange={(checked) => handleInputChange("approved", checked)}
                />
                <Label htmlFor="approved">Approved?</Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEarningForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEarning} 
              disabled={createEarning.isPending}
            >
              {createEarning.isPending ? "Saving..." : "Save Earning"}
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
          <EarningsTable recordType="Overtime" onEditEarning={handleEditEarning} />
        </TabsContent>

        <TabsContent value="commission" className="mt-6">
          <EarningsTable recordType="Commission" onEditEarning={handleEditEarning} />
        </TabsContent>

        <TabsContent value="special-allowance" className="mt-6">
          <EarningsTable recordType="Special Shift" onEditEarning={handleEditEarning} />
        </TabsContent>

        <TabsContent value="escort-allowance" className="mt-6">
          <EarningsTable recordType="Escort Allowance" onEditEarning={handleEditEarning} />
        </TabsContent>
      </Tabs>
    </div>
  );
}