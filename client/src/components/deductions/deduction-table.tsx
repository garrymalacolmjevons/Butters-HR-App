import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DeductionRecord } from "@shared/schema";
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

type DeductionRecordWithExtras = DeductionRecord & { employeeName: string; company: string };

interface DeductionTableProps {
  data: DeductionRecordWithExtras[];
  isLoading: boolean;
  onEdit: (deduction: DeductionRecordWithExtras) => void;
  onView: (deduction: DeductionRecordWithExtras) => void;
  onDelete: (deduction: DeductionRecordWithExtras) => void;
}

export function DeductionTable({ data, isLoading, onEdit, onView, onDelete }: DeductionTableProps) {
  const columnHelper = createColumnHelper<DeductionRecordWithExtras>();
  
  const columns = [
    columnHelper.accessor((row) => row.employeeId, {
      id: "employeeId",
      header: "Emp. Code",
      cell: (info) => {
        const deduction = info.row.original;
        // This would need to be updated if you have the actual employee code
        return `EMP${String(deduction.employeeId).padStart(3, '0')}`;
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
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("amount", {
      header: "Amount",
      cell: (info) => {
        const amount = info.getValue();
        return <span className={amount < 0 ? 'text-red-600' : ''}>{formatCurrency(amount)}</span>;
      },
    }),
    columnHelper.accessor("date", {
      header: "Date",
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor("recurring", {
      header: "Recurring",
      cell: (info) => info.getValue() ? "Yes" : "No",
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
      searchPlaceholder="Search deduction records..."
      searchColumn="employeeName"
    />
  );
}
