import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define the validation schema for overtime rates
const overtimeRateSchema = z.object({
  overtimeType: z.string()
    .min(1, "Overtime type is required"),
  rate: z.coerce.number()
    .min(0, "Rate must be a positive number"),
  description: z.string().optional(),
});

type OvertimeRateFormValues = z.infer<typeof overtimeRateSchema>;

type OvertimeRateFormProps = {
  initialData?: {
    id: number;
    overtimeType: string;
    rate: number;
    description?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function OvertimeRateForm({ initialData, onSuccess, onCancel }: OvertimeRateFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<OvertimeRateFormValues>({
    resolver: zodResolver(overtimeRateSchema),
    defaultValues: initialData || {
      overtimeType: "",
      rate: 0,
      description: "",
    },
  });
  
  const isEditMode = !!initialData;
  
  async function onSubmit(data: OvertimeRateFormValues) {
    try {
      if (isEditMode && initialData) {
        // Update existing rate
        await apiRequest(`/api/overtime-rates/${initialData.id}`, {
          method: "PATCH",
          data,
        });
        toast({
          title: "Success",
          description: "Overtime rate updated successfully",
        });
      } else {
        // Create new rate
        await apiRequest("/api/overtime-rates", {
          method: "POST",
          data,
        });
        toast({
          title: "Success",
          description: "Overtime rate created successfully",
        });
      }
      
      // Invalidate the overtime rates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/overtime-rates"] });
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form if not in edit mode
      if (!isEditMode) {
        form.reset({
          overtimeType: "",
          rate: 0,
          description: "",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save overtime rate",
        variant: "destructive",
      });
      console.error("Error saving overtime rate:", error);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="overtimeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overtime Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekday, Sunday" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00" 
                  {...field}
                  onChange={(e) => {
                    // Ensure it's a valid number
                    const value = parseFloat(e.target.value);
                    field.onChange(isNaN(value) ? 0 : value);
                  }}
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
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Description or notes about this rate" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit">
            {isEditMode ? "Update Rate" : "Create Rate"}
          </Button>
        </div>
      </form>
    </Form>
  );
}