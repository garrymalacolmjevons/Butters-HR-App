import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const recordTypes = [
  { id: 'advance', label: 'Advances', value: 'Advance' },
  { id: 'loan', label: 'Loans', value: 'Loan' },
  { id: 'deduction', label: 'Deductions', value: 'Deduction' },
  { id: 'overtime', label: 'Overtime', value: 'Overtime' },
  { id: 'standby', label: 'Standby Shifts', value: 'Standby Shift' },
  { id: 'special', label: 'Special Shifts', value: 'Special Shift' },
  { id: 'escort', label: 'Escort Allowances', value: 'Escort Allowance' },
  { id: 'commission', label: 'Commissions', value: 'Commission' },
  { id: 'cit', label: 'Cash in Transit', value: 'Cash in Transit' },
  { id: 'camera', label: 'Camera Allowance', value: 'Camera Allowance' },
];

export default function ArchiveRecordsSettings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const archiveMutation = useMutation({
    mutationFn: async (recordTypes: string[]) => {
      const response = await fetch('/api/archive-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recordTypes })
      });
      
      if (!response.ok) {
        throw new Error(`Archive failed: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Archive Successful",
        description: `${data.archivedCount} records have been archived.`,
      });
      setSelectedTypes([]);
    },
    onError: (error) => {
      toast({
        title: "Archive Failed",
        description: error instanceof Error ? error.message : "An error occurred during archiving. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCheckboxChange = (value: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes(prev => [...prev, value]);
    } else {
      setSelectedTypes(prev => prev.filter(type => type !== value));
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTypes(recordTypes.map(type => type.value));
    } else {
      setSelectedTypes([]);
    }
  };

  const handleArchiveClick = () => {
    if (selectedTypes.length === 0) {
      toast({
        title: "No Records Selected",
        description: "Please select at least one record type to archive.",
        variant: "destructive",
      });
      return;
    }
    setIsDialogOpen(true);
  };

  const confirmArchive = () => {
    archiveMutation.mutate(selectedTypes);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="text-lg font-medium">Select Record Types to Archive</div>
        <p className="text-sm text-muted-foreground">
          Select the record types that you want to archive. This will move all records of those types to the archive table,
          making the system faster and more responsive. This action cannot be undone.
        </p>
        
        <div className="flex items-center space-x-2 mt-4 mb-2 border-b pb-2">
          <Checkbox 
            id="select-all" 
            checked={selectedTypes.length === recordTypes.length}
            onCheckedChange={(checked) => handleSelectAll(checked === true)}
          />
          <Label htmlFor="select-all" className="font-semibold cursor-pointer">Select All</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {recordTypes.map((type) => (
            <div key={type.id} className="flex items-center space-x-2">
              <Checkbox 
                id={type.id} 
                checked={selectedTypes.includes(type.value)}
                onCheckedChange={(checked) => handleCheckboxChange(type.value, checked === true)}
              />
              <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
            </div>
          ))}
        </div>
      </div>
      
      <Button 
        onClick={handleArchiveClick}
        className="bg-amber-500 hover:bg-amber-600"
        disabled={archiveMutation.isPending || selectedTypes.length === 0}
      >
        {archiveMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Archiving...
          </>
        ) : (
          'Archive Selected Records'
        )}
      </Button>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: This action cannot be undone</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to archive {selectedTypes.length} record type{selectedTypes.length > 1 ? 's' : ''}: 
              <strong> {selectedTypes.map(type => recordTypes.find(t => t.value === type)?.label).join(', ')}</strong>.
              <br /><br />
              This will permanently move all associated records to the archive. They will no longer appear in the Records Editor or reports.
              <br /><br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} className="bg-amber-500 hover:bg-amber-600">
              Yes, Archive Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}