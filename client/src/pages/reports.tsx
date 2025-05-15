import React, { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ReportsPage() {
  const { toast } = useToast();
  
  // No duplicate function needed
  
  // Date range state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Report options
  const [payrollType, setPayrollType] = useState<string>("all");
  const [includeUnapproved, setIncludeUnapproved] = useState<boolean>(false);
  const [reportFormat, setReportFormat] = useState<string>("csv");

  // Define type for export records
  type ExportRecordType = {
    id: number;
    userId: number;
    exportType: string;
    fileUrl: string;
    fileFormat: string;
    startDate: string;
    endDate: string;
    includeUnapproved: boolean;
    recordCount: number;
    createdAt: string;
    userName?: string;
  };

  // Export history
  const { data: exportHistory = [], isLoading: isLoadingHistory } = useQuery<ExportRecordType[]>({
    queryKey: ['/api/export-records'],
  });

  // Generate report mutation
  const generateReport = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        throw new Error("Please select both start and end dates");
      }

      // Format dates for API
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");
      
      const params = new URLSearchParams();
      params.append("startDate", formattedStartDate);
      params.append("endDate", formattedEndDate);
      params.append("recordType", payrollType);
      params.append("includeUnapproved", includeUnapproved.toString());
      params.append("format", reportFormat);
      
      // Make API request to generate export
      const result = await apiRequest("POST", `/api/reports/generate?${params.toString()}`);
      return result;
    },
    onSuccess: (data: any) => {
      // Refresh export history
      queryClient.invalidateQueries({ queryKey: ['/api/export-records'] });
      
      // Trigger download
      if (data && data.downloadUrl) {
        window.location.href = data.downloadUrl;
      }
      
      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    }
  });
  
  // Function to download a previous export
  const downloadExport = (exportUrl: string) => {
    window.location.href = exportUrl;
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm");
  };


  // Get export record type display name
  const getExportTypeLabel = (type: string) => {
    switch (type) {
      case "all":
        return "All Records";
      case "earnings":
        return "Earnings Only";
      case "deductions":
        return "Deductions Only";
      case "Overtime":
        return "Overtime";
      case "Special Shift":
        return "Special Shifts";
      case "Escort Allowance":
        return "Escort Allowances";
      case "Commission":
        return "Commissions";
      default:
        return type;
    }
  };

  // Pre-defined date ranges for quick selection
  const setPayrollPeriod = (period: string) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Default to this month's payroll period (20th to 19th)
    let newStartDate: Date;
    let newEndDate: Date;
    
    if (period === "current") {
      // If today is before the 20th, use previous month's 20th to this month's 19th
      if (today.getDate() < 20) {
        newStartDate = new Date(year, month - 1, 20);
        newEndDate = new Date(year, month, 19);
      } else {
        // If today is 20th or after, use this month's 20th to next month's 19th
        newStartDate = new Date(year, month, 20);
        newEndDate = new Date(year, month + 1, 19);
      }
    } else if (period === "previous") {
      // Previous payroll period
      if (today.getDate() < 20) {
        newStartDate = new Date(year, month - 2, 20);
        newEndDate = new Date(year, month - 1, 19);
      } else {
        newStartDate = new Date(year, month - 1, 20);
        newEndDate = new Date(year, month, 19);
      }
    } else if (period === "nextMonth") {
      // Next month's period
      if (today.getDate() < 20) {
        newStartDate = new Date(year, month, 20);
        newEndDate = new Date(year, month + 1, 19);
      } else {
        newStartDate = new Date(year, month + 1, 20);
        newEndDate = new Date(year, month + 2, 19);
      }
    } else {
      // Custom (don't change dates)
      return;
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and download payroll reports for processing
          </p>
        </div>
        <img 
          src="/logo.jpg" 
          alt="Hi-Tec Security Logo" 
          className="h-16 w-auto"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-amber-400/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <CardTitle>Generate New Report</CardTitle>
            <CardDescription className="text-gray-300">
              Export payroll data for a specific date range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPayrollPeriod("current")}
                >
                  Current Payroll Period
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPayrollPeriod("previous")}
                >
                  Previous Period
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Record Type</label>
              <Select value={payrollType} onValueChange={setPayrollType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select record type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Record Types</SelectItem>
                  <SelectItem value="earnings">All Earnings</SelectItem>
                  <SelectItem value="deductions">All Deductions</SelectItem>
                  <SelectItem value="Overtime">Overtime Only</SelectItem>
                  <SelectItem value="Special Shift">Special Shifts Only</SelectItem>
                  <SelectItem value="Escort Allowance">Escort Allowances Only</SelectItem>
                  <SelectItem value="Commission">Commissions Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Format</label>
              <Select value={reportFormat} onValueChange={setReportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV File</SelectItem>
                  <SelectItem value="excel">Excel File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="includeUnapproved" 
                checked={includeUnapproved}
                onCheckedChange={(checked) => setIncludeUnapproved(checked as boolean)}
              />
              <label
                htmlFor="includeUnapproved"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include unapproved records
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => generateReport.mutate()}
              disabled={!startDate || !endDate || generateReport.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            >
              {generateReport.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate & Download Report
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="border-2 border-amber-400/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <CardTitle>Recent Exports</CardTitle>
            <CardDescription className="text-gray-300">
              Download previously generated reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading export history...</span>
              </div>
            ) : (exportHistory as ExportRecordType[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No export history found.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(exportHistory as ExportRecordType[]).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {formatDate(record.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getExportTypeLabel(record.exportType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.fileFormat.toUpperCase()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadExport(record.fileUrl)}
                            title="Download file"
                            className="hover:bg-amber-100 hover:text-amber-900 transition-colors"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            <span className="sr-only md:not-sr-only md:inline-block">Download</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}