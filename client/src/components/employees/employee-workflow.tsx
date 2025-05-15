import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEmployeeSchema, Employee } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, ChevronsRight, CircleHelp, FileText, HelpCircle, UserRound } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Define the steps in the employee onboarding workflow
const workflowSteps = [
  {
    id: "employee-info",
    name: "Basic Information",
    icon: <UserRound className="h-5 w-5" />,
    description: "Enter the new employee's details",
  },
  {
    id: "position-details",
    name: "Position & Department",
    icon: <FileText className="h-5 w-5" />,
    description: "Employment position details",
  },
  {
    id: "workflow-complete",
    name: "Completion",
    icon: <Check className="h-5 w-5" />,
    description: "Finalize onboarding process",
  }
];

// Create form schema for the entire workflow
const newEmployeeSchema = insertEmployeeSchema.extend({
  confirmationNotes: z.string().optional(),
});

type NewEmployeeFormValues = z.infer<typeof newEmployeeSchema>;

interface EmployeeWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: NewEmployeeFormValues) => void;
  isSubmitting: boolean;
}

export function EmployeeWorkflow({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: EmployeeWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  const form = useForm<NewEmployeeFormValues>({
    resolver: zodResolver(newEmployeeSchema),
    defaultValues: {
      department: "Security",
      status: "Active",
    },
    mode: "onChange",
  });

  const moveToNextStep = () => {
    // Validate the current step before moving to the next
    if (currentStep === 0) {
      form.trigger(["firstName", "lastName", "employeeCode", "email"]);
      const firstNameError = form.formState.errors.firstName;
      const lastNameError = form.formState.errors.lastName;
      const employeeCodeError = form.formState.errors.employeeCode;
      
      if (firstNameError || lastNameError || employeeCodeError) {
        return; // Don't proceed if there are errors
      }
    } else if (currentStep === 1) {
      form.trigger(["position", "department"]);
      const positionError = form.formState.errors.position;
      const departmentError = form.formState.errors.department;
      
      if (positionError || departmentError) {
        return; // Don't proceed if there are errors
      }
    }
    
    if (currentStep < workflowSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const moveToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (values: NewEmployeeFormValues) => {
    onSubmit(values);
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
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
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="employeeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Employee Code
                    <HelpCircle className="w-4 h-4 text-muted-foreground inline ml-1" />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="EMP001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique identifier used across systems
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      case 1: // Position & Department
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position/Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Security Officer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      case 2: // Completion
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg mb-4 dark:bg-green-950">
              <div className="flex items-center space-x-2">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h3 className="text-green-800 font-medium dark:text-green-300">
                  Almost Done!
                </h3>
              </div>
              <p className="text-green-700 mt-2 text-sm dark:text-green-400">
                Review the information before completing the onboarding process.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Name</Label>
                <p className="font-medium">
                  {form.getValues("firstName")} {form.getValues("lastName")}
                </p>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-sm">Employee Code</Label>
                <p className="font-medium">{form.getValues("employeeCode")}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-sm">Position</Label>
                <p className="font-medium">{form.getValues("position")}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-sm">Department</Label>
                <p className="font-medium">{form.getValues("department")}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-sm">Status</Label>
                <p className="font-medium">{form.getValues("status")}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-sm">Email</Label>
                <p className="font-medium">{form.getValues("email") || "Not provided"}</p>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="confirmationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about this employee" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Employee Onboarding</DialogTitle>
          <DialogDescription>
            Complete the workflow to onboard a new employee
          </DialogDescription>
        </DialogHeader>
        
        {/* Workflow steps indicator */}
        <div className="flex justify-between mb-6">
          {workflowSteps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                ${currentStep === index 
                  ? "border-primary bg-primary text-primary-foreground" 
                  : currentStep > index 
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > index ? <Check className="h-5 w-5" /> : step.icon}
              </div>
              <span className="text-xs mt-1 text-center max-w-[80px] truncate">{step.name}</span>
              
              {/* Connector line */}
              {index < workflowSteps.length - 1 && (
                <div className="hidden sm:block absolute left-0 right-0">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{workflowSteps[currentStep].name}</CardTitle>
                <CardDescription>{workflowSteps[currentStep].description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>
            
            <DialogFooter className="flex justify-between space-x-2">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={moveToPreviousStep}
                >
                  Back
                </Button>
              )}
              
              <div className="flex-1"></div>
              
              {currentStep < workflowSteps.length - 1 ? (
                <Button
                  type="button"
                  onClick={moveToNextStep}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Complete Onboarding"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}