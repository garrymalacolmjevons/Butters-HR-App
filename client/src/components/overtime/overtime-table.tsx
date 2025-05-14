import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { OvertimeRecord } from "@shared/schema";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash, MoreVertical } from "lucide-react";
import { StatusBadge, CompanyBadge } from "@/components/ui/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";

type OvertimeRecordWithExtras = OvertimeRecord & { employeeName: string; company: string };

interface OvertimeTableProps {
  data: OvertimeRecordWithExtras[];
  isLoading: boolean;
  onEdit: (overtime: OvertimeRecordWithExtras) => void;
  onView: (overtime: OvertimeRecordWithExtras) => void;
  onDelete: (overtime: OvertimeRecordWithExtras) => void;
}

export function OvertimeTable({ data, isLoading, onEdit, onView, onDelete }: OvertimeTableProps) {
  const columnHelper = createColumnHelper<OvertimeRecordWithExtras>();
  
  const columns = [
    columnHelper.accessor((row) => row.employeeId, {
      id: "employeeId",
      header: "Emp. Code",
      cell: (info) => {
        const overtime = info.row.original;
        // This would need to be updated if you have the actual employee code
        return `EMP${String(overtime.employeeId).padStart(3, '0')}`;
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
    columnHelper.accessor("date", {
      header: "Date",
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor("hours", {
      header: "Hours",
      cell: (info) => `${info.getValue().toFixed(1)} hrs`,
    }),
    columnHelper.accessor("rate", {
      header: "Rate",
      cell: (info) => `${info.getValue()}x`,
    }),
    columnHelper.accessor("approved", {
      header: "Status",
      cell: (info) => (
        <StatusBadge variant={info.getValue() ? "green" : "yellow"}>
          {info.getValue() ? "Approved" : "Pending"}
        </StatusBadge>
      ),
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
      searchPlaceholder="Search overtime records..."
      searchColumn="employeeName"
    />
  );
}
