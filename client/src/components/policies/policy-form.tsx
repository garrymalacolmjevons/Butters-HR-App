import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useFetchEmployees } from "@/hooks/use-employees";
import WebcamCapture from "@/components/common/webcam-capture";
import { FileUpload } from "@/components/common/file-upload";
import { InsurancePolicy } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Define Zod schema for validation
const policyFormSchema = z.object({
  employeeId: z.coerce.number({
    required_error: "Please select an employee",
  }),
  company: z.string({
    required_error: "Please select an insurance company",
  }),
  policyNumber: z.string({
    required_error: "Please enter the policy number",
  }),
  amount: z.coerce.number({
    required_error: "Amount is required",
  }).min(0, "Amount must be a positive number"),
  startDate: z.string({
    required_error: "Start date is required",
  }),
  endDate: z.string().optional(),
  status: z.string({
    required_error: "Status is required",
  }),
  documentImage: z.string().optional(),
  notes: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

interface PolicyFormProps {
  policy?: InsurancePolicy;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export function PolicyForm({ policy, onSuccess, onCancel }: PolicyFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: employees = [] } = useFetchEmployees();
  const [showWebcam, setShowWebcam] = useState(false);

  // Create form with default values
  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      employeeId: policy?.employeeId || 0,
      company: policy?.company || "",
      policyNumber: policy?.policyNumber || "",
      amount: policy?.amount || 0,
      startDate: policy?.startDate ? policy.startDate : format(new Date(), "yyyy-MM-dd"),
      endDate: policy?.endDate || "",
      status: policy?.status || "Active",
      documentImage: policy?.documentImage || "",
      notes: policy?.notes || "",
    },
  });

  // Reset form when policy prop changes
  useEffect(() => {
    if (policy) {
      form.reset({
        employeeId: policy.employeeId,
        company: policy.company,
        policyNumber: policy.policyNumber,
        amount: policy.amount,
        startDate: policy.startDate,
        endDate: policy.endDate || "",
        status: policy.status || "Active",
        documentImage: policy.documentImage || "",
        notes: policy.notes || "",
      });
    }
  }, [policy, form]);

  // Handle form submission
  const onSubmit = async (data: PolicyFormValues) => {
    try {
      let response;
      
      if (policy) {
        // Update existing policy
        response = await apiRequest(`/api/policies/${policy.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        
        toast({
          title: "Success",
          description: "Policy updated successfully",
        });
      } else {
        // Create new policy
        response = await apiRequest("/api/policies", {
          method: "POST",
          body: JSON.stringify(data),
        });
        
        toast({
          title: "Success",
          description: "Policy created successfully",
        });
      }
      
      // Invalidate policies query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(response);
      }
      
      // Reset form if creating new policy
      if (!policy) {
        form.reset({
          employeeId: 0,
          company: "",
          policyNumber: "",
          amount: 0,
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: "",
          status: "Active",
          documentImage: "",
          notes: "",
        });
      }
    } catch (error) {
      console.error("Error saving policy:", error);
      toast({
        title: "Error",
        description: "Failed to save policy. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle webcam capture
  const handleCapture = (dataUrl: string) => {
    form.setValue("documentImage", dataUrl);
    setShowWebcam(false);
  };

  // Handle file upload
  const handleFileUpload = (base64: string) => {
    form.setValue("documentImage", base64);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{policy ? "Edit Insurance Policy" : "Add New Insurance Policy"}</CardTitle>
        <CardDescription>
          {policy 
            ? "Update details for an existing insurance policy" 
            : "Fill in the details to add a new insurance policy for an employee"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Selection */}
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : undefined}
                      value={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem 
                            key={employee.id} 
                            value={employee.id.toString()}
                          >
                            {employee.firstName} {employee.lastName} ({employee.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Insurance Company */}
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Company</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sanlam Sky">Sanlam Sky</SelectItem>
                        <SelectItem value="Avbob">Avbob</SelectItem>
                        <SelectItem value="Old Mutual">Old Mutual</SelectItem>
                        <SelectItem value="Provident Fund">Provident Fund</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Policy Number */}
              <FormField
                control={form.control}
                name="policyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter policy number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (R)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="Enter amount" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date (Optional) */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any additional notes about this policy"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Image */}
            <div className="space-y-2">
              <FormLabel>Supporting Document (Optional)</FormLabel>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowWebcam(!showWebcam)}
                  >
                    {showWebcam ? "Cancel Capture" : "Use Webcam"}
                  </Button>
                  <FileUpload onUpload={handleFileUpload} />
                </div>
                
                {showWebcam && (
                  <div className="mt-2">
                    <WebcamCapture onCapture={handleCapture} onCancel={() => setShowWebcam(false)} />
                  </div>
                )}
                
                {form.getValues("documentImage") && !showWebcam && (
                  <div className="mt-2">
                    <p className="text-sm mb-1">Document Preview:</p>
                    <img 
                      src={form.getValues("documentImage")} 
                      alt="Document preview" 
                      className="max-w-full max-h-[200px] border rounded" 
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="mt-1 text-destructive" 
                      onClick={() => form.setValue("documentImage", "")}
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {policy ? "Update Policy" : "Create Policy"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}