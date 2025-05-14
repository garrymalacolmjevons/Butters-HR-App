import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertExportRecordSchema } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { generateExport, getDefaultReportName, getMonthYear } from "@/lib/exportUtils";

// Extend the insert schema with validation
const reportFormSchema = z.object({
  reportName: z.string().min(1, "Report name is required"),
  reportType: z.string(),
  company: z.string().optional(),
  month: z.string(),
  includeLeave: z.boolean().default(true),
  includeOvertime: z.boolean().default(true),
  includeDeductions: z.boolean().default(true),
  includeAllowances: z.boolean().default(true),
  format: z.string().default("xlsx"),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

export function ReportForm() {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState<string>("Payroll Export");
  const [selectedCompany, setSelectedCompany] = useState<string>("All Companies");

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const defaultReportName = getDefaultReportName(selectedReportType, selectedCompany, new Date());

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reportName: defaultReportName,
      reportType: "Payroll Export",
      company: "All Companies",
      month: currentMonth,
      includeLeave: true,
      includeOvertime: true,
      includeDeductions: true,
      includeAllowances: true,
      format: "xlsx",
    },
  });

  const generateExportMutation = useMutation({
    mutationFn: generateExport,
    onSuccess: () => {
      toast({
        title: "Export Generated",
        description: "Your report has been successfully generated and downloaded.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "An error occurred while generating the export",
      });
    },
  });

  const handleReportTypeChange = (value: string) => {
    setSelectedReportType(value);
    const newReportName = getDefaultReportName(value, selectedCompany, new Date(form.getValues().month));
    form.setValue("reportName", newReportName);
  };

  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value);
    const newReportName = getDefaultReportName(selectedReportType, value, new Date(form.getValues().month));
    form.setValue("reportName", newReportName);
  };

  const handleMonthChange = (value: string) => {
    const newReportName = getDefaultReportName(
      selectedReportType, 
      selectedCompany, 
      new Date(value + '-01')
    );
    form.setValue("reportName", newReportName);
  };

  const onSubmit = (values: ReportFormValues) => {
    const exportOptions = {
      reportName: values.reportName,
      company: values.company !== "All Companies" ? values.company : undefined,
      month: new Date(values.month + '-01'),
      includeLeave: values.includeLeave,
      includeOvertime: values.includeOvertime,
      includeDeductions: values.includeDeductions,
      includeAllowances: values.includeAllowances,
      format: values.format,
    };

    generateExportMutation.mutate(exportOptions);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Export Options</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reportType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Export Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleReportTypeChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Export Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Payroll Export">Payroll Export (Excel)</SelectItem>
                      <SelectItem value="Leave Summary">Leave Summary</SelectItem>
                      <SelectItem value="Overtime Report">Overtime Report</SelectItem>
                      <SelectItem value="Deductions Report">Deductions Report</SelectItem>
                      <SelectItem value="Allowances Report">Allowances Report</SelectItem>
                      <SelectItem value="Complete HR Data">Complete HR Data</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleCompanyChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="All Companies">All Companies</SelectItem>
                      <SelectItem value="Butters">Butters</SelectItem>
                      <SelectItem value="Makana">Makana</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <FormControl>
                    <Input
                      type="month"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleMonthChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reportName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be the filename of your exported file
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Include</FormLabel>
              <div className="space-y-2 mt-1">
                <FormField
                  control={form.control}
                  name="includeLeave"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="include-leave"
                        />
                      </FormControl>
                      <FormLabel htmlFor="include-leave" className="text-sm font-normal">
                        Leave Data
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="includeOvertime"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="include-overtime"
                        />
                      </FormControl>
                      <FormLabel htmlFor="include-overtime" className="text-sm font-normal">
                        Overtime
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="includeDeductions"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="include-deductions"
                        />
                      </FormControl>
                      <FormLabel htmlFor="include-deductions" className="text-sm font-normal">
                        Deductions
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="includeAllowances"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="include-allowances"
                        />
                      </FormControl>
                      <FormLabel htmlFor="include-allowances" className="text-sm font-normal">
                        Allowances
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="xlsx" id="format-excel" />
                        </FormControl>
                        <FormLabel htmlFor="format-excel" className="font-normal text-sm">
                          Excel (.xlsx)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="csv" id="format-csv" />
                        </FormControl>
                        <FormLabel htmlFor="format-csv" className="font-normal text-sm">
                          CSV
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="pdf" id="format-pdf" />
                        </FormControl>
                        <FormLabel htmlFor="format-pdf" className="font-normal text-sm">
                          PDF
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={generateExportMutation.isPending}
              >
                {generateExportMutation.isPending ? "Generating..." : "Generate Export"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
