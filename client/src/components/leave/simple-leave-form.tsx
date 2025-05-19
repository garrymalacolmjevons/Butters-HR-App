import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { calculateDaysBetween } from "@/lib/utils";
import { EmployeeWithFullName } from "@shared/schema";

interface SimpleLeaveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  isSubmitting: boolean;
}

export function SimpleLeaveForm({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: SimpleLeaveFormProps) {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [details, setDetails] = useState<string>("Annual Leave");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [totalDays, setTotalDays] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees"],
  });

  // Calculate days when dates change
  const recalculateDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start && end && start <= end) {
        const days = calculateDaysBetween(start, end);
        setTotalDays(days);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create the submission object with only the essential fields
    const submission = {
      employeeId: parseInt(employeeId),
      recordType: "Leave",
      date: new Date(), // Current date for the record
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      totalDays,
      details,
      notes,
      approved: false // Default to not approved
    };
    
    console.log("Submitting simple leave form with values:", submission);
    
    // Call the parent component's onSubmit function
    onSubmit(submission);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Leave (Simplified)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee</Label>
              <Select
                value={employeeId}
                onValueChange={setEmployeeId}
                disabled={isLoadingEmployees}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingEmployees ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.fullName || `${employee.firstName} ${employee.lastName}`} ({employee.employeeCode})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Leave Type</Label>
              <Select 
                value={details} 
                onValueChange={setDetails}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                  <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                  <SelectItem value="Compassionate Leave">Compassionate Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    recalculateDays();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    recalculateDays();
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDays">Total Days</Label>
              <Input
                id="totalDays"
                type="number"
                min="0.5"
                step="0.5"
                value={totalDays}
                onChange={(e) => setTotalDays(parseFloat(e.target.value))}
              />
              <p className="text-sm text-gray-500">
                System will calculate this automatically based on start and end dates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional information about this leave"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !employeeId || !startDate || !endDate}>
              {isSubmitting ? "Saving..." : "Save Leave Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}