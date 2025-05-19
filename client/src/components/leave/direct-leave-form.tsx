import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { EmployeeWithFullName } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export function DirectLeaveForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees"],
  });

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get form data directly from the form elements
      const formData = new FormData(event.currentTarget);
      const employeeId = parseInt(formData.get('employeeId') as string);
      const leaveType = formData.get('leaveType') as string;
      const startDate = formData.get('startDate') as string;
      const endDate = formData.get('endDate') as string;
      const totalDays = parseFloat(formData.get('totalDays') as string);
      const notes = formData.get('notes') as string;
      
      // Create the leave record payload
      const payload = {
        employeeId,
        recordType: "Leave",
        details: leaveType,
        date: new Date().toISOString().split('T')[0],
        startDate,
        endDate,
        totalDays,
        notes,
        approved: false
      };
      
      console.log('Direct Leave Form - Submitting payload:', payload);
      
      // Make the API request directly using fetch
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Check if the request was successful
      if (response.ok) {
        const data = await response.json();
        console.log('Direct Leave Form - Success:', data);
        
        toast({
          title: "Leave record created",
          description: "The leave record has been created successfully",
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        
        // Close the dialog
        setIsOpen(false);
      } else {
        const errorData = await response.json();
        console.error('Direct Leave Form - API Error:', errorData);
        
        toast({
          variant: "destructive",
          title: "Error creating leave record",
          description: errorData.error || errorData.details || "Failed to create leave record",
        });
      }
    } catch (error) {
      console.error('Direct Leave Form - Exception:', error);
      
      toast({
        variant: "destructive",
        title: "Error creating leave record",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const calculateDays = () => {
    const startDateInput = document.getElementById('startDate') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;
    const totalDaysInput = document.getElementById('totalDays') as HTMLInputElement;
    
    if (startDateInput?.value && endDateInput?.value) {
      const start = new Date(startDateInput.value);
      const end = new Date(endDateInput.value);
      
      if (start && end && start <= end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
        totalDaysInput.value = diffDays.toString();
      }
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-red-500 hover:bg-red-600 text-white"
      >
        Direct Leave Form
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Direct Leave Form (Fallback)</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="employeeId" className="block text-sm font-medium">
                Employee *
              </label>
              <select
                id="employeeId"
                name="employeeId"
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName || `${employee.firstName} ${employee.lastName}`} 
                    {employee.employeeCode ? ` (${employee.employeeCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="leaveType" className="block text-sm font-medium">
                Leave Type *
              </label>
              <select
                id="leaveType"
                name="leaveType"
                className="w-full p-2 border rounded"
                required
              >
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
                <option value="Compassionate Leave">Compassionate Leave</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="startDate" className="block text-sm font-medium">
                  Start Date *
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className="w-full p-2 border rounded"
                  required
                  onChange={calculateDays}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="endDate" className="block text-sm font-medium">
                  End Date *
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="w-full p-2 border rounded"
                  required
                  onChange={calculateDays}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="totalDays" className="block text-sm font-medium">
                Total Days *
              </label>
              <input
                id="totalDays"
                name="totalDays"
                type="number"
                min="0.5"
                step="0.5"
                defaultValue="1"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                className="w-full p-2 border rounded h-24"
                placeholder="Enter any additional notes about this leave"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)} 
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Leave Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}