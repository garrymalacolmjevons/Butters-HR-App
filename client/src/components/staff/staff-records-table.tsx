import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type RecordType = "Leave" | "Termination" | "Bank Account Change" | "All";

interface StaffRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  recordType: string;
  date: string;
  status: string;
  details: string;
  documentImage: string | null;
}

export function StaffRecordsTable() {
  const [selectedType, setSelectedType] = useState<RecordType>("All");
  
  const { data: records, isLoading } = useQuery({
    queryKey: ["/api/staff-records", selectedType],
  });

  const filteredRecords = selectedType === "All" 
    ? records 
    : records?.filter((record: StaffRecord) => record.recordType === selectedType);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Pending":
      default:
        return "bg-amber-100 text-amber-800";
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case "Leave":
        return "bg-blue-100 text-blue-800";
      case "Termination":
        return "bg-red-100 text-red-800";
      case "Bank Account Change":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDocument = (documentUrl: string) => {
    window.open(documentUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Staff Records</CardTitle>
            <CardDescription>View and manage staff records</CardDescription>
          </div>
          <Select
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as RecordType)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select record type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Records</SelectItem>
              <SelectItem value="Leave">Leave</SelectItem>
              <SelectItem value="Termination">Termination</SelectItem>
              <SelectItem value="Bank Account Change">Bank Account Change</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRecords && filteredRecords.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Documents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record: StaffRecord) => (
                <TableRow key={record.id}>
                  <TableCell>{record.employeeName}</TableCell>
                  <TableCell>
                    <Badge className={getRecordTypeColor(record.recordType)}>
                      {record.recordType}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status || "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.details || "-"}
                  </TableCell>
                  <TableCell>
                    {record.documentImage ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(record.documentImage!)}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">No document</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Alert className="bg-muted border-none">
            <Info className="h-4 w-4" />
            <AlertTitle>No records found</AlertTitle>
            <AlertDescription>
              No {selectedType === "All" ? "" : selectedType.toLowerCase()} records found. Use the Staff Action button to create new records.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}