import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { EmployeeWithFullName } from "@shared/schema";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, Eye, MoreVertical } from "lucide-react";
import { EmployeeStatusBadge, CompanyBadge } from "@/components/ui/status-badge";

interface EmployeeTableProps {
  data: EmployeeWithFullName[];
  isLoading: boolean;
  onEdit: (employee: EmployeeWithFullName) => void;
  onView: (employee: EmployeeWithFullName) => void;
}

export function EmployeeTable({ data, isLoading, onEdit, onView }: EmployeeTableProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithFullName | null>(null);

  const columnHelper = createColumnHelper<EmployeeWithFullName>();
  
  const columns = [
    columnHelper.accessor("employeeCode", {
      header: "Emp. Code",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("fullName", {
      header: "Name",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("company", {
      header: "Company",
      cell: (info) => <CompanyBadge company={info.getValue()} />,
    }),
    columnHelper.accessor("department", {
      header: "Department",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("position", {
      header: "Position",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <EmployeeStatusBadge status={info.getValue()} />,
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="h-4 w-4 text-neutral-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(info.row.original)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView(info.row.original)}>View Details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      searchPlaceholder="Search employees..."
      searchColumn="fullName"
      onRowClick={(row) => setSelectedEmployee(row)}
    />
  );
}
