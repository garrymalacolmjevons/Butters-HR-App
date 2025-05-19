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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

// Define Zod schema for validation
const exportFormSchema = z.object({
  month: z.string({
    required_error: "Month is required",
  }),
  company: z.string().optional(),
  exportName: z.string({
    required_error: "Export name is required",
  }),
  format: z.string().optional().default("xlsx"),
});

type ExportFormValues = z.infer<typeof exportFormSchema>;

interface PolicyExportFormProps {
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export function PolicyExportForm({ onSuccess, onCancel }: PolicyExportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<{
    data: string;
    filename: string;
  } | null>(null);

  // Get current month in YYYY-MM format
  const currentMonth = format(new Date(), "yyyy-MM");

  // Create form with default values
  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      month: currentMonth,
      company: "",
      exportName: `Policy Report - ${format(new Date(), "MMMM yyyy")}`,
      format: "xlsx"
    },
  });

  // Handle form submission
  const onSubmit = async (data: ExportFormValues) => {
    try {
      setIsExporting(true);
      
      // Create policy export
      const response = await apiRequest("/api/policy-exports", {
        method: "POST",
        body: JSON.stringify({
          month: data.month,
          company: data.company || null,
          exportName: data.exportName,
          format: data.format,
          totalAmount: 0 // This will be calculated on the server
        }),
      });
      
      // Set export data
      setExportData({
        data: response.data,
        filename: response.filename
      });
      
      // Invalidate policy exports query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/policy-exports'] });
      
      toast({
        title: "Success",
        description: "Report generated successfully",
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!exportData) return;
    
    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${exportData.data}`;
    link.download = exportData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Insurance Policy Report</CardTitle>
        <CardDescription>
          Create a report of active policies and payments for a specific month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Month Selection */}
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
                      Select the month for which to generate the report
                    </FormDescription>
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
                    <FormLabel>Insurance Company (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company or leave blank for all" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        <SelectItem value="Sanlam Sky">Sanlam Sky</SelectItem>
                        <SelectItem value="Avbob">Avbob</SelectItem>
                        <SelectItem value="Old Mutual">Old Mutual</SelectItem>
                        <SelectItem value="Provident Fund">Provident Fund</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Limit the report to a specific insurance company
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Export Name */}
              <FormField
                control={form.control}
                name="exportName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Export Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this export
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {exportData ? (
              <div className="bg-muted p-4 rounded-md flex flex-col items-center justify-center space-y-3">
                <p className="text-center font-medium">Report generated successfully!</p>
                <Button onClick={handleDownload} className="w-full sm:w-auto">
                  Download Excel File
                </Button>
              </div>
            ) : (
              <div className="flex justify-end space-x-2 pt-4">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isExporting}>
                  {isExporting ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}