import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronDown, Plus, FileEdit, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PolicyPayment, InsurancePolicy } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { PolicyPaymentForm } from "./policy-payment-form";

const columns: ColumnDef<PolicyPayment & { employeeName: string, policyNumber: string }>[] = [
  {
    accessorKey: "paymentDate",
    header: "Payment Date",
    cell: ({ row }) => <div>{row.getValue("paymentDate")}</div>,
  },
  {
    accessorKey: "month",
    header: "Month",
    cell: ({ row }) => <div>{format(new Date(row.getValue("month")), "MMMM yyyy")}</div>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <div>{formatCurrency(row.getValue("amount"))}</div>,
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => <div>{row.getValue("paymentMethod") || "Not specified"}</div>,
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => <div className="max-w-xs truncate">{row.getValue("notes") || "—"}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original;
      
      return (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => document.getElementById(`edit-payment-${payment.id}`)?.click()}
          >
            <FileEdit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive"
            onClick={() => document.getElementById(`delete-payment-${payment.id}`)?.click()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];

interface PolicyPaymentListProps {
  policyId?: number;
}

export function PolicyPaymentList({ policyId }: PolicyPaymentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showForm, setShowForm] = useState(false);
  const [editPayment, setEditPayment] = useState<PolicyPayment | null>(null);

  // Fetch payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/policy-payments', policyId],
    queryFn: async () => {
      let url = '/api/policy-payments';
      if (policyId) {
        url += `?policyId=${policyId}`;
      }
      return apiRequest(url);
    },
    enabled: !!policyId,
  });

  // Fetch policies for the payment form
  const { data: policies = [] } = useQuery({
    queryKey: ['/api/policies'],
    queryFn: async () => {
      return apiRequest('/api/policies');
    },
  });

  const table = useReactTable({
    data: payments,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleDelete = async (id: number) => {
    try {
      await apiRequest(`/api/policy-payments/${id}`, {
        method: "DELETE",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/policy-payments'] });
      
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditPayment(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {policyId ? "View and manage payments for this policy" : "View and manage all policy payments"}
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </CardHeader>
        <CardContent>
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
                      {isLoadingPayments ? "Loading..." : "No payments found for this policy."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {table.getFilteredRowModel().rows.length} of {payments.length} payments
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
        </CardContent>
      </Card>

      {/* Hidden buttons for dialogs */}
      {payments.map((payment) => (
        <div key={payment.id} className="hidden">
          <button id={`edit-payment-${payment.id}`} onClick={() => {
            setEditPayment(payment);
            setShowForm(true);
          }}>
            Edit
          </button>
          <AlertDialog>
            <AlertDialogTrigger id={`delete-payment-${payment.id}`}>Delete</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this payment record from the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(payment.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}

      {/* Payment Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card rounded-lg shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editPayment ? "Edit Payment" : "Record New Payment"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowForm(false);
                setEditPayment(null);
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
            <PolicyPaymentForm
              payment={editPayment || undefined}
              policies={policies}
              policyId={policyId}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditPayment(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}