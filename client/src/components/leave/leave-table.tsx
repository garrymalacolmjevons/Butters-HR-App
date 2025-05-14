import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { LeaveRecord } from "@shared/schema";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash, MoreVertical } from "lucide-react";
import { LeaveStatusBadge, CompanyBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

type LeaveRecordWithExtras = LeaveRecord & { employeeName: string; company: string };

interface LeaveTableProps {
  data: LeaveRecordWithExtras[];
  isLoading: boolean;
  onEdit: (leave: LeaveRecordWithExtras) => void;
  onView: (leave: LeaveRecordWithExtras) => void;
  onDelete: (leave: LeaveRecordWithExtras) => void;
}

export function LeaveTable({ data, isLoading, onEdit, onView, onDelete }: LeaveTableProps) {
  const columnHelper = createColumnHelper<LeaveRecordWithExtras>();
  
  const columns = [
    columnHelper.accessor((row) => row.employeeId, {
      id: "employeeId",
      header: "Emp. Code",
      cell: (info) => {
        const employee = info.row.original;
        // This would need to be updated if you have the actual employee code
        return `EMP${String(employee.employeeId).padStart(3, '0')}`;
      },
    }),
    columnHelper.accessor("employeeName", {
      header: "Employee Name",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("company", {
      header: "Company",
      cell: (info) => <CompanyBadge company={info.getValue()} />,
    }),
    columnHelper.accessor("leaveType", {
      header: "Leave Type",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("startDate", {
      header: "Start Date",
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor("endDate", {
      header: "End Date",
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor("totalDays", {
      header: "Days",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <LeaveStatusBadge status={info.getValue()} />,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex space-x-2">
          <Button size="icon" variant="ghost" onClick={() => onEdit(info.row.original)}>
            <Edit className="h-4 w-4 text-primary" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onView(info.row.original)}>
            <Eye className="h-4 w-4 text-neutral-500" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(info.row.original)}>
            <Trash className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    }),
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search leave records..."
      searchColumn="employeeName"
    />
  );
}
