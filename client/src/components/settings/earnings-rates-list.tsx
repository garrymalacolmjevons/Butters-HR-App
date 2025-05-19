import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { EarningsRateForm } from "./earnings-rates-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type EarningsRate = {
  id: number;
  earningType: string;
  rate: number;
  description: string | null;
  active: boolean;
  updatedAt: string;
};

export function EarningsRatesList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<EarningsRate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<EarningsRate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: earningsRates = [], isLoading, isError } = useQuery({
    queryKey: ["/api/earnings-rates"],
  });

  const handleDelete = async () => {
    if (!rateToDelete) return;

    try {
      await apiRequest(`/api/earnings-rates/${rateToDelete.id}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Earnings rate deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/earnings-rates"] });
      setIsDeleteDialogOpen(false);
      setRateToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete earnings rate",
        variant: "destructive",
      });
      console.error("Error deleting earnings rate:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Earnings Rates</CardTitle>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Rate
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center">Loading earnings rates...</div>
        ) : isError ? (
          <div className="py-8 text-center text-red-500">
            Error loading earnings rates. Please try again.
          </div>
        ) : earningsRates.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No earnings rates found. Add a rate to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Earning Type</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earningsRates.map((rate: EarningsRate) => (
                <TableRow key={rate.id}>
                  <TableCell>{rate.earningType}</TableCell>
                  <TableCell className="text-right">{rate.rate.toFixed(2)}</TableCell>
                  <TableCell>{rate.description || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={rate.active ? "default" : "secondary"}>
                      {rate.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRate(rate);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRateToDelete(rate);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Earnings Rate</DialogTitle>
            <DialogDescription>
              Create a new rate for an earning type.
            </DialogDescription>
          </DialogHeader>
          <EarningsRateForm
            onSuccess={() => setIsAddDialogOpen(false)}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Earnings Rate</DialogTitle>
            <DialogDescription>
              Modify this earnings rate details.
            </DialogDescription>
          </DialogHeader>
          {editingRate && (
            <EarningsRateForm
              initialData={editingRate}
              onSuccess={() => setIsEditDialogOpen(false)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the earnings rate for{" "}
              <strong>{rateToDelete?.earningType}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}