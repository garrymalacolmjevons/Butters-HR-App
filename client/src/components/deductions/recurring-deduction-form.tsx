import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertRecurringDeductionSchema, RecurringDeduction } from "@shared/schema";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// Extend the schema with validation
const recurringDeductionFormSchema = insertRecurringDeductionSchema.extend({
  // Add any additional validation or fields if needed
});

type RecurringDeductionFormValues = z.infer<typeof recurringDeductionFormSchema>;

interface RecurringDeductionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: RecurringDeductionFormValues, callback?: (id: number) => void) => void;
  defaultValues?: Partial<RecurringDeductionFormValues>;
  isSubmitting: boolean;
  title: string;
}

export function RecurringDeductionForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isSubmitting,
  title,
}: RecurringDeductionFormProps) {
  // Fetch employees for the dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees"],
  });

  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const form = useForm<RecurringDeductionFormValues>({
    resolver: zodResolver(recurringDeductionFormSchema),
    defaultValues: {
      ...defaultValues,
      startDate: defaultValues?.startDate || new Date().toISOString().split('T')[0],
      frequency: defaultValues?.frequency || "monthly",
      approved: defaultValues?.approved || false,
    },
  });

  const handleSubmit = (values: RecurringDeductionFormValues) => {
    onSubmit(values, (id: number) => {
      // After submission, set the reference number for display
      setReferenceNumber(`RD${id.toString().padStart(6, '0')}`);
      
      // Display toast with reference number
      toast({
        title: "Deduction Saved",
        description: `Reference Number: RD${id.toString().padStart(6, '0')}`,
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Set up a recurring deduction that will repeat according to the specified frequency.
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
                name="deductionName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Deduction Name</FormLabel>
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={typeof field.value === 'string' 
                          ? field.value 
                          : field.value instanceof Date 
                            ? field.value.toISOString().split('T')[0]
                            : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={typeof field.value === 'string' ? field.value : field.value?.toISOString().split('T')[0] || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave blank for indefinite deduction
                    </FormDescription>
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "monthly"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Textarea placeholder="Enter a description of this recurring deduction" {...field} />
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
                      <Textarea placeholder="Enter any additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
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
                        checked={field.value}
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
                {isSubmitting ? "Saving..." : "Save Recurring Deduction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}