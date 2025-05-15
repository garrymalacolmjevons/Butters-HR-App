import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPayrollRecordSchema, PayrollRecord } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeWithFullName } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { RecurringDeductionForm } from "./recurring-deduction-form";

// Extend the insert schema with validation
const deductionFormSchema = insertPayrollRecordSchema.extend({
  // Add any additional validation or fields if needed
});

type DeductionFormValues = z.infer<typeof deductionFormSchema>;

interface DeductionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DeductionFormValues, callback?: (id: number) => void) => void;
  defaultValues?: Partial<DeductionFormValues>;
  isSubmitting: boolean;
  title: string;
}

export function DeductionForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isSubmitting,
  title,
}: DeductionFormProps) {
  // State for recurring deduction form
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  // Fetch employees for the dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionFormSchema),
    defaultValues: {
      ...defaultValues,
      recordType: "Deduction",
      approved: defaultValues?.approved || false,
      date: defaultValues?.date || new Date().toISOString().split('T')[0]
    },
  });
  
  // Function to handle the recurring checkbox
  const handleRecurringChange = (checked: boolean) => {
    if (checked) {
      // Open the recurring deduction form
      form.reset();
      setIsRecurringOpen(true);
      onClose(); // Close the regular deduction form
    }
  };

  const handleSubmit = (values: DeductionFormValues) => {
    onSubmit(values, (id: number) => {
      // After submission, set the reference number for display
      setReferenceNumber(`D${id.toString().padStart(6, '0')}`);
      
      // Display toast with reference number
      toast({
        title: "Deduction Saved",
        description: `Reference Number: D${id.toString().padStart(6, '0')}`,
      });
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Fill in the details for the deduction record.
            </DialogDescription>
          </DialogHeader>

          {referenceNumber && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-4">
              <h3 className="font-semibold text-green-800">Deduction Saved</h3>
              <p className="text-green-700">
                Please record this reference number for your records: <span className="font-mono font-bold">{referenceNumber}</span>
              </p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Hidden Record Type field - always "Deduction" */}
                <FormField
                  control={form.control}
                  name="recordType"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Employee</FormLabel>
                      <Select
                        disabled={isLoadingEmployees}
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                        }}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingEmployees ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id.toString()}>
                                {employee.fullName || `${employee.firstName} ${employee.lastName}`} ({employee.employeeCode})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Deduction Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Deduction Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Tax">Tax</SelectItem>
                          <SelectItem value="Loan Repayment">Loan Repayment</SelectItem>
                          <SelectItem value="Advance Repayment">Advance Repayment</SelectItem>
                          <SelectItem value="Insurance">Insurance</SelectItem>
                          <SelectItem value="Pension">Pension</SelectItem>
                          <SelectItem value="Union Dues">Union Dues</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={typeof field.value === 'string' ? field.value : field.value?.toISOString?.().split('T')[0] || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter a description of this deduction" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter any additional notes about this deduction" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Recurring Deduction</FormLabel>
                        <FormDescription>
                          Will this deduction repeat in future pay cycles?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={handleRecurringChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="approved"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Was this deduction approved?</FormLabel>
                        <FormDescription>
                          Toggle on if approval has been granted
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Deduction"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Recurring Deduction Form */}
      <RecurringDeductionForm
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
        onSubmit={(values, callback) => {
          // Handle recurring deduction submission
          if (callback) callback(0); // This will be set by the API response
        }}
        isSubmitting={isSubmitting}
        title="New Recurring Deduction"
      />
    </>
  );
}