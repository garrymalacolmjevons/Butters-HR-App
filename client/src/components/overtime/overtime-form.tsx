import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertOvertimeRecordSchema } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeWithFullName } from "@shared/schema";

// Extend the insert schema with validation
const overtimeFormSchema = insertOvertimeRecordSchema.extend({
  // Add any additional validation if needed
});

type OvertimeFormValues = z.infer<typeof overtimeFormSchema>;

interface OvertimeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: OvertimeFormValues) => void;
  defaultValues?: Partial<OvertimeFormValues>;
  isSubmitting: boolean;
  title: string;
}

export function OvertimeForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isSubmitting,
  title,
}: OvertimeFormProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  // Fetch employees for the dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees", selectedCompany],
  });

  // Filter employees by company if selected
  const filteredEmployees = selectedCompany && selectedCompany !== "All Companies"
    ? employees.filter(emp => emp.company === selectedCompany)
    : employees;

  const form = useForm<OvertimeFormValues>({
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: defaultValues || {
      date: new Date().toISOString().split('T')[0],
      hours: 0,
      rate: 1.5,
      approved: false,
    },
  });

  const handleSubmit = (values: OvertimeFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the details for the overtime record.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select
                    disabled={isLoadingEmployees}
                    onValueChange={(value) => {
                      field.onChange(parseInt(value));
                      // Find company for selected employee
                      const employee = employees.find(emp => emp.id === parseInt(value));
                      if (employee) {
                        setSelectedCompany(employee.company);
                      }
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
                        filteredEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.fullName} ({employee.employeeCode})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0.5" 
                        step="0.5" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate Multiplier</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseFloat(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Rate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1.0x (Regular)</SelectItem>
                      <SelectItem value="1.5">1.5x (Time and a half)</SelectItem>
                      <SelectItem value="2">2.0x (Double time)</SelectItem>
                      <SelectItem value="2.5">2.5x (Double time and a half)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The multiplier for regular pay rate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter any additional information" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Approved</FormLabel>
                    <FormDescription>
                      Check this box if the overtime is approved for payment
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Overtime Record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
