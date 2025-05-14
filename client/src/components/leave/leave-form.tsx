import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPayrollRecordSchema, PayrollRecord, Employee } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { calculateDaysBetween } from "@/lib/utils";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeWithFullName } from "@shared/schema";

// Extend the insert schema with validation
const leaveFormSchema = insertPayrollRecordSchema.extend({
  // Add any additional validation or fields if needed
});

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

interface LeaveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: LeaveFormValues) => void;
  defaultValues?: Partial<LeaveFormValues>;
  isSubmitting: boolean;
  title: string;
}

export function LeaveForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isSubmitting,
  title,
}: LeaveFormProps) {
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  // Fetch employees for the dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees", selectedCompany],
  });

  // Filter employees by company if selected
  const filteredEmployees = selectedCompany && selectedCompany !== "All Companies"
    ? employees.filter(emp => emp.company === selectedCompany)
    : employees;

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: defaultValues || {
      leaveType: "Annual Leave",
      status: "Pending",
      totalDays: 1,
    },
  });

  // Calculate days when dates change
  useEffect(() => {
    if (selectedStartDate && selectedEndDate) {
      const startDate = new Date(selectedStartDate);
      const endDate = new Date(selectedEndDate);
      
      if (startDate && endDate && startDate <= endDate) {
        const days = calculateDaysBetween(startDate, endDate);
        form.setValue("totalDays", days);
      }
    }
  }, [selectedStartDate, selectedEndDate, form]);

  // Update state when dates change in form
  useEffect(() => {
    if (defaultValues?.startDate) {
      const formattedStartDate = new Date(defaultValues.startDate).toISOString().split('T')[0];
      setSelectedStartDate(formattedStartDate);
    }
    if (defaultValues?.endDate) {
      const formattedEndDate = new Date(defaultValues.endDate).toISOString().split('T')[0];
      setSelectedEndDate(formattedEndDate);
    }
  }, [defaultValues]);

  const handleSubmit = (values: LeaveFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the details for the leave record.
          </DialogDescription>
        </DialogHeader>

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

              <FormField
                control={form.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Leave Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                        <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                        <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                        <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                        <SelectItem value="Compassionate Leave">Compassionate Leave</SelectItem>
                        <SelectItem value="Study Leave">Study Leave</SelectItem>
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
                        value={selectedStartDate || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          setSelectedStartDate(e.target.value);
                        }}
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
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={selectedEndDate || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          setSelectedEndDate(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalDays"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Total Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.5"
                        step="0.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      System will calculate this automatically based on start and end dates
                    </FormDescription>
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
                      <Textarea placeholder="Enter any additional information about this leave" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Pending" id="status-pending" />
                          <FormLabel htmlFor="status-pending" className="font-normal">
                            Pending
                          </FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Approved" id="status-approved" />
                          <FormLabel htmlFor="status-approved" className="font-normal">
                            Approved
                          </FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Rejected" id="status-rejected" />
                          <FormLabel htmlFor="status-rejected" className="font-normal">
                            Rejected
                          </FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Leave Record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
