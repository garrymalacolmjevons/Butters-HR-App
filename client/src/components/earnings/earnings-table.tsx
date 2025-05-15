import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Check, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface EarningsTableProps {
  recordType: string;
}

export function EarningsTable({ recordType }: EarningsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: earnings = [], isLoading } = useQuery({
    queryKey: ['/api/payroll-records', { recordType }],
    queryFn: async () => {
      const response = await fetch(`/api/payroll-records?recordType=${recordType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      return response.json();
    }
  });

  // Filter data based on search term
  const filteredData = searchTerm.trim()
    ? earnings.filter((earning: any) => 
        earning.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (earning.description && earning.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (earning.details && earning.details.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : earnings;

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    return `R ${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading earnings data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search earnings..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Description</TableHead>
              {recordType === 'Overtime' && <TableHead>Hours</TableHead>}
              {recordType === 'Overtime' && <TableHead>Rate</TableHead>}
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[100px]">Approved</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No earnings found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((earning: any) => (
                <TableRow key={earning.id}>
                  <TableCell className="font-medium">
                    {format(new Date(earning.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{earning.employeeName}</TableCell>
                  <TableCell>
                    {earning.description || earning.details || "—"}
                  </TableCell>
                  {recordType === 'Overtime' && (
                    <TableCell>{earning.hours || "—"}</TableCell>
                  )}
                  {recordType === 'Overtime' && (
                    <TableCell>{earning.rate ? `${earning.rate}x` : "—"}</TableCell>
                  )}
                  <TableCell className="text-right">
                    {formatCurrency(earning.amount)}
                  </TableCell>
                  <TableCell>
                    {earning.approved ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button variant="ghost" size="icon" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}