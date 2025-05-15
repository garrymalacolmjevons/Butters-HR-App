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
import { useEffect, useState } from "react";
import { PolicyPayment, InsurancePolicy } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Define Zod schema for validation
const paymentFormSchema = z.object({
  policyId: z.coerce.number({
    required_error: "Please select a policy",
  }),
  amount: z.coerce.number({
    required_error: "Amount is required",
  }).min(0, "Amount must be a positive number"),
  paymentDate: z.string({
    required_error: "Payment date is required",
  }),
  month: z.string({
    required_error: "Month is required",
  }),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PolicyPaymentFormProps {
  payment?: PolicyPayment;
  policies?: InsurancePolicy[];
  policyId?: number;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export function PolicyPaymentForm({ payment, policies = [], policyId, onSuccess, onCancel }: PolicyPaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(policyId || payment?.policyId || null);
  
  // Get current month in YYYY-MM format
  const currentMonth = format(new Date(), "yyyy-MM");

  // Create form with default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      policyId: payment?.policyId || policyId || 0,
      amount: payment?.amount || 0,
      paymentDate: payment?.paymentDate || format(new Date(), "yyyy-MM-dd"),
      month: payment?.month || currentMonth,
      paymentMethod: payment?.paymentMethod || "",
      notes: payment?.notes || "",
    },
  });

  // Reset form when payment or policyId props change
  useEffect(() => {
    if (payment) {
      form.reset({
        policyId: payment.policyId,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        month: payment.month,
        paymentMethod: payment.paymentMethod || "",
        notes: payment.notes || "",
      });
      setSelectedPolicyId(payment.policyId);
    } else if (policyId) {
      form.setValue("policyId", policyId);
      setSelectedPolicyId(policyId);
      
      // If a policy is selected, try to pre-fill the amount from the policy
      const selectedPolicy = policies.find(p => p.id === policyId);
      if (selectedPolicy) {
        form.setValue("amount", selectedPolicy.amount);
      }
    }
  }, [payment, policyId, form, policies]);

  // Handle policy selection changes
  const handlePolicyChange = (policyId: number) => {
    setSelectedPolicyId(policyId);
    
    // If a policy is selected, pre-fill the amount from the policy
    const selectedPolicy = policies.find(p => p.id === policyId);
    if (selectedPolicy) {
      form.setValue("amount", selectedPolicy.amount);
    }
  };

  // Handle form submission
  const onSubmit = async (data: PaymentFormValues) => {
    try {
      let response;
      
      if (payment) {
        // Update existing payment
        response = await apiRequest(`/api/policy-payments/${payment.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        
        toast({
          title: "Success",
          description: "Payment updated successfully",
        });
      } else {
        // Create new payment
        response = await apiRequest("/api/policy-payments", {
          method: "POST",
          body: JSON.stringify(data),
        });
        
        toast({
          title: "Success",
          description: "Payment recorded successfully",
        });
      }
      
      // Invalidate policy payments query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/policy-payments"] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(response);
      }
      
      // Reset form if creating new payment
      if (!payment) {
        form.reset({
          policyId: policyId || 0,
          amount: policyId ? form.getValues().amount : 0,
          paymentDate: format(new Date(), "yyyy-MM-dd"),
          month: currentMonth,
          paymentMethod: "",
          notes: "",
        });
      }
    } catch (error) {
      console.error("Error saving payment:", error);
      toast({
        title: "Error",
        description: "Failed to save payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get selected policy details for display
  const selectedPolicy = policies.find(p => p.id === selectedPolicyId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{payment ? "Edit Payment" : "Record New Payment"}</CardTitle>
        <CardDescription>
          {payment 
            ? "Update details for an existing policy payment" 
            : "Record a new payment for an insurance policy"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Policy Selection */}
              <FormField
                control={form.control}
                name="policyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        handlePolicyChange(parseInt(value));
                      }}
                      defaultValue={field.value ? field.value.toString() : undefined}
                      value={field.value ? field.value.toString() : undefined}
                      disabled={!!policyId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {policies.map((policy) => (
                          <SelectItem 
                            key={policy.id} 
                            value={policy.id.toString()}
                          >
                            {policy.employeeName} - {policy.company} ({policy.policyNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              {/* Payment Date */}
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Month */}
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                    <FormDescription>
                      The month this payment applies to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Debit Order">Debit Order</SelectItem>
                        <SelectItem value="Payroll Deduction">Payroll Deduction</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                      placeholder="Enter any additional notes about this payment"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display selected policy details */}
            {selectedPolicy && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <h4 className="font-semibold mb-1">Selected Policy Details:</h4>
                <p><span className="font-medium">Employee:</span> {selectedPolicy.employeeName}</p>
                <p><span className="font-medium">Company:</span> {selectedPolicy.company}</p>
                <p><span className="font-medium">Policy Number:</span> {selectedPolicy.policyNumber}</p>
                <p><span className="font-medium">Monthly Amount:</span> R{selectedPolicy.amount.toFixed(2)}</p>
                <p><span className="font-medium">Status:</span> {selectedPolicy.status}</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {payment ? "Update Payment" : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}