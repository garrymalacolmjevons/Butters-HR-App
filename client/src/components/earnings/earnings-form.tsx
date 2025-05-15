import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPayrollRecordSchema } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { EmployeeWithFullName } from "@shared/schema";
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

// Extend the insert schema with validation
const earningsFormSchema = insertPayrollRecordSchema.extend({
  // Add any additional validation or fields if needed
});

type EarningsFormValues = z.infer<typeof earningsFormSchema>;

interface EarningsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: EarningsFormValues) => void;
  defaultValues?: Partial<EarningsFormValues>;
  isSubmitting: boolean;
  title: string;
}

export function EarningsForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isSubmitting,
  title,
}: EarningsFormProps) {
  const [earningsType, setEarningsType] = useState<string>(defaultValues?.recordType || "Overtime");
  const [rateVisible, setRateVisible] = useState<boolean>(true);
  const [hoursVisible, setHoursVisible] = useState<boolean>(true);
  const [quantityVisible, setQuantityVisible] = useState<boolean>(false);

  // Fetch employees for the dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch overtime rates for the dropdown
  const { data: overtimeRates = [], isLoading: isLoadingRates } = useQuery({
    queryKey: ["/api/settings/overtime-rates"],
    enabled: earningsType === "Overtime", // Only fetch rates when overtime is selected
  });

  const form = useForm<EarningsFormValues>({
    resolver: zodResolver(earningsFormSchema),
    defaultValues: {
      ...defaultValues,
      recordType: earningsType,
      hours: defaultValues?.hours || 0,
      rate: defaultValues?.rate || 1,
      approved: defaultValues?.approved || false, // Default to not approved
      date: defaultValues?.date || new Date().toISOString().split('T')[0]
    },
  });

  // Update form record type when earnings type changes
  useEffect(() => {
    form.setValue("recordType", earningsType);
    
    // Update visible fields based on earnings type
    switch (earningsType) {
      case "Overtime":
        setRateVisible(true);
        setHoursVisible(true);
        setQuantityVisible(false);
        break;
      case "Bonus":
        setRateVisible(false);
        setHoursVisible(false);
        setQuantityVisible(false);
        break;
      case "Standby Shift":
        setRateVisible(true);
        setHoursVisible(false);
        setQuantityVisible(true);
        break;
      case "Special Shift":
        setRateVisible(true);
        setHoursVisible(false);
        setQuantityVisible(true);
        break;
      case "Cash in Transit":
        setRateVisible(false);
        setHoursVisible(false);
        setQuantityVisible(false);
        break;
      case "Commission":
        setRateVisible(false);
        setHoursVisible(false);
        setQuantityVisible(false);
        break;
      default:
        setRateVisible(true);
        setHoursVisible(true);
        setQuantityVisible(false);
    }
  }, [earningsType, form]);

  // Calculate amount when hours or rate changes
  useEffect(() => {
    if (earningsType === "Overtime") {
      const hours = form.watch("hours") || 0;
      const rate = form.watch("rate") || 0;
      const calculatedAmount = hours * rate;
      
      if (!isNaN(calculatedAmount)) {
        form.setValue("amount", calculatedAmount);
      }
    } else if (earningsType === "Standby Shift" || earningsType === "Special Shift") {
      const quantity = parseInt(form.watch("details") || "0");
      const rate = form.watch("rate") || 0;
      
      if (!isNaN(quantity) && !isNaN(rate)) {
        form.setValue("amount", quantity * rate);
      }
    }
  }, [form.watch("hours"), form.watch("rate"), form.watch("details"), earningsType, form]);

  const handleSubmit = (values: EarningsFormValues) => {
    const formattedValues = {
      ...values,
      date: values.date ? 
        (typeof values.date === 'string' ? values.date : values.date.toISOString().split('T')[0]) 
        : undefined,
    };
    
    console.log("Submitting earnings form with values:", formattedValues);
    onSubmit(formattedValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the details for the earnings record.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recordType"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Earnings Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setEarningsType(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Earnings Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Overtime">Overtime</SelectItem>
                        <SelectItem value="Bonus">Bonus</SelectItem>
                        <SelectItem value="Standby Shift">Standby Shift</SelectItem>
                        <SelectItem value="Special Shift">Special Shift</SelectItem>
                        <SelectItem value="Cash in Transit">Cash in Transit</SelectItem>
                        <SelectItem value="Commission">Commission</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={typeof field.value === 'string' 
                          ? field.value 
                          : field.value instanceof Date 
                            ? field.value.toISOString().split('T')[0] 
                            : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hoursVisible && (
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{earningsType === "Overtime" ? "Hours" : "Hours"}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {rateVisible && earningsType === "Overtime" && (
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Multiplier</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(parseFloat(value));
                        }}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Rate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingRates ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            overtimeRates.map((rate: any) => (
                              <SelectItem key={rate.id} value={rate.rate.toString()}>
                                {rate.overtimeType} ({rate.rate}x)
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {rateVisible && earningsType !== "Overtime" && (
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (R)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {quantityVisible && (
                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Shifts</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Total Amount (R)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    {earningsType === "Overtime" && (
                      <FormDescription>
                        Calculated as Hours × Rate
                      </FormDescription>
                    )}
                    {(earningsType === "Standby Shift" || earningsType === "Special Shift") && (
                      <FormDescription>
                        Calculated as Number of Shifts × Rate
                      </FormDescription>
                    )}
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
                      <Textarea placeholder="Enter details about this earnings record" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approved"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Was this {earningsType.toLowerCase()} approved?</FormLabel>
                      <FormDescription>
                        Toggle to confirm whether this {earningsType.toLowerCase()} was approved by management
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}