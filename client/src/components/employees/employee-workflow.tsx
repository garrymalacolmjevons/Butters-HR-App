import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEmployeeSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

// Extend the employee schema with validation
const employeeFormSchema = insertEmployeeSchema.extend({
  employeeCode: z.string().min(1, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  department: z.enum(["Security", "Administration", "Operations"], {
    required_error: "Department is required",
  }),
  position: z.string().min(1, "Position is required"),
  email: z.string().email("Invalid email format").nullable().optional(),
  requestVipCode: z.boolean().default(false), // Control whether to request VIP code
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeWorkflow({
  isOpen,
  onClose,
}: EmployeeWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 3; // Updated to include VIP code step
  const [success, setSuccess] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeCode: "",
      firstName: "",
      lastName: "",
      department: "Security",
      position: "",
      status: "Active",
      email: "",
      requestVipCode: false,
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeFormValues) => {
      // Extract the requestVipCode field before sending to the API
      const { requestVipCode, ...employeeData } = data;
      
      // If VIP code is requested, set the flags for tracking
      const finalData = {
        ...employeeData,
        vipCodeRequested: requestVipCode,
        vipCodeRequestDate: requestVipCode ? new Date().toISOString() : undefined,
        vipCodeStatus: requestVipCode ? 'Requested' : 'Not Requested'
      };
      
      return apiRequest("/api/employees", "POST", finalData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSuccess(true);
      
      // Log activity
      if (user?.id) {
        const employeeInfo = `${form.getValues().firstName} ${form.getValues().lastName} (${form.getValues().employeeCode})`;
        
        apiRequest("/api/activity-logs", "POST", {
          userId: user.id,
          action: "Created new employee",
          details: `Created employee: ${employeeInfo}`,
        });
        
        // If VIP code was requested, log that too
        if (form.getValues().requestVipCode) {
          apiRequest("/api/activity-logs", "POST", {
            userId: user.id,
            action: "VIP code requested",
            details: `Requested VIP code for employee: ${employeeInfo}`,
          });
          
          // You could implement email notification here if needed
          toast({
            title: "VIP Code Request Sent",
            description: "The request for a VIP code has been sent to Tracey.",
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create employee",
        description: error.message,
      });
    },
  });

  const handleSubmit = (values: EmployeeFormValues) => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      createEmployeeMutation.mutate(values);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    form.reset();
    setStep(1);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            {step === 1 && "Enter the basic information for the new employee."}
            {step === 2 && "Complete the employee details."}
            {step === 3 && "Request VIP code from Tracey if needed."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <InfoIcon className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Employee Created Successfully</AlertTitle>
              <AlertDescription className="text-green-700">
                The employee has been added to the system.
                {form.getValues().requestVipCode && (
                  <p className="mt-2">A VIP code has been requested from Tracey and will be tracked in the employee's record.</p>
                )}
              </AlertDescription>
            </Alert>
            <Button onClick={handleClose} className="w-full">Close</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {step === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeCode"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Employee Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter employee code" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for the employee
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Security">Security</SelectItem>
                            <SelectItem value="Administration">Administration</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Job position" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="employee@example.com" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requestVipCode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Request VIP Code from Tracey
                          </FormLabel>
                          <FormDescription>
                            Toggle this to request a VIP code for this employee.
                            The request will be logged and tracked.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("requestVipCode") && (
                    <Alert>
                      <InfoIcon className="h-4 w-4" />
                      <AlertTitle>VIP Code Request</AlertTitle>
                      <AlertDescription>
                        A notification will be sent to Tracey requesting a VIP code for this employee. 
                        You can track the status of this request in the employee's details.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <DialogFooter className="flex justify-between">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrevious}>
                    Previous
                  </Button>
                )}
                <div className="ml-auto">
                  <Button type="submit" disabled={createEmployeeMutation.isPending}>
                    {step < totalSteps 
                      ? "Next" 
                      : (createEmployeeMutation.isPending ? "Saving..." : "Save Employee")}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}