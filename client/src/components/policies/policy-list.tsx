import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronDown, Search, Plus, FileEdit, Trash2, Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { InsurancePolicy } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { PolicyForm } from "./policy-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PolicyPaymentList } from "./policy-payment-list";
import { PolicyImportModal } from "./policy-import-modal";

const columns: ColumnDef<InsurancePolicy & { employeeName: string }>[] = [
  {
    accessorKey: "employeeName",
    header: "Employee",
    cell: ({ row }) => <div className="font-medium">{row.getValue("employeeName")}</div>,
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => <div>{row.getValue("company")}</div>,
  },
  {
    accessorKey: "policyNumber",
    header: "Policy Number",
    cell: ({ row }) => <div>{row.getValue("policyNumber")}</div>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <div>{formatCurrency(row.getValue("amount"))}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      
      const getBadgeVariant = (status: string) => {
        switch (status) {
          case "Active":
            return "success";
          case "Pending":
            return "warning";
          case "Suspended":
            return "secondary";
          case "Cancelled":
            return "destructive";
          default:
            return "outline";
        }
      };
      
      return (
        <Badge variant={getBadgeVariant(status) as any}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => <div>{row.getValue("startDate")}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const policy = row.original;
      
      return (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => document.getElementById(`edit-policy-${policy.id}`)?.click()}
          >
            <FileEdit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive"
            onClick={() => document.getElementById(`delete-policy-${policy.id}`)?.click()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];

interface PolicyListProps {
  employeeId?: number;
}

export function PolicyList({ employeeId }: PolicyListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState<InsurancePolicy | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  const [showPayments, setShowPayments] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Fetch policies
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['/api/policies', employeeId, companyFilter, statusFilter],
    queryFn: async () => {
      let url = '/api/policies';
      const params = new URLSearchParams();
      
      if (employeeId) {
        params.append('employeeId', employeeId.toString());
      }
      
      if (companyFilter !== 'all') {
        params.append('company', companyFilter);
      }
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching policies: ${response.status}`);
      }
      
      return response.json();
    }
  });

  const table = useReactTable({
    data: policies,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/policies/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting policy: ${response.status}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      
      toast({
        title: "Success",
        description: "Policy deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast({
        title: "Error",
        description: "Failed to delete policy. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditPolicy(null);
  };

  const handleViewPayments = (policy: InsurancePolicy) => {
    setSelectedPolicy(policy);
    setShowPayments(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Insurance Policies</CardTitle>
            <CardDescription>
              Manage employee insurance policies and payments
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowImportModal(true)}
            >
              <FileUp className="mr-2 h-4 w-4" />
              Import Policies
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee names..."
                  value={(table.getColumn("employeeName")?.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    table.getColumn("employeeName")?.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={companyFilter}
                  onValueChange={setCompanyFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    <SelectItem value="Sanlam Sky">Sanlam Sky</SelectItem>
                    <SelectItem value="Avbob">Avbob</SelectItem>
                    <SelectItem value="Old Mutual">Old Mutual</SelectItem>
                    <SelectItem value="Provident Fund">Provident Fund</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                      Columns <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                          >
                            {column.id}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        onClick={() => handleViewPayments(row.original)}
                        className="cursor-pointer"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        {isLoading ? "Loading..." : "No policies found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing {table.getFilteredRowModel().rows.length} of {policies.length} policies
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden buttons for dialogs */}
      {policies.map((policy) => (
        <div key={policy.id} className="hidden">
          <button id={`edit-policy-${policy.id}`} onClick={() => {
            setEditPolicy(policy);
            setShowForm(true);
          }}>
            Edit
          </button>
          <AlertDialog>
            <AlertDialogTrigger id={`delete-policy-${policy.id}`}>Delete</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the policy for {policy.employeeName} with {policy.company}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(policy.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}

      {/* Policy Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card rounded-lg shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editPolicy ? "Edit Policy" : "Add New Policy"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowForm(false);
                setEditPolicy(null);
              }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
            <PolicyForm
              policy={editPolicy || undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditPolicy(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Payments View Dialog */}
      {showPayments && selectedPolicy && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-auto bg-card rounded-lg shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Policy Payments</h2>
                <p className="text-muted-foreground">
                  {selectedPolicy.employeeName} - {selectedPolicy.company} ({selectedPolicy.policyNumber})
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowPayments(false);
                setSelectedPolicy(null);
              }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
            <PolicyPaymentList policyId={selectedPolicy.id} />
          </div>
        </div>
      )}
    </div>
  );
}