import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { EmployeeWithFullName } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function EmergencyLeaveForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalDays, setTotalDays] = useState("1");
  const [notes, setNotes] = useState("");
  
  // Fetch employees
  const { data: employees = [] } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees"],
  });
  
  const calculateDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start && end && end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
        setTotalDays(diffDays.toString());
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId || !startDate || !endDate) {
      toast({ 
        title: "Missing information",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Create payload with only essential fields
    const payload = {
      employeeId: parseInt(employeeId),
      recordType: "Leave",
      details: leaveType,
      date: new Date().toISOString().split('T')[0],
      startDate,
      endDate,
      totalDays: parseFloat(totalDays),
      notes,
      approved: false,
      createdBy: 1 // Admin user ID
    };
    
    console.log("Submitting emergency leave form with data:", payload);
    
    try {
      // Make direct API call
      const response = await fetch("/api/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        // Success
        toast({
          title: "Leave recorded successfully",
          description: "The leave record has been saved."
        });
        
        // Reset form and close dialog
        setEmployeeId("");
        setLeaveType("Annual Leave");
        setStartDate("");
        setEndDate("");
        setTotalDays("1");
        setNotes("");
        setIsOpen(false);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/leave"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      } else {
        // Error handling
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save leave record");
      }
    } catch (error) {
      console.error("Error submitting leave form:", error);
      toast({
        title: "Error saving leave record",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-yellow-500 hover:bg-yellow-600"
      >
        Emergency Leave Form
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Emergency Leave Record</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select 
                value={employeeId} 
                onValueChange={setEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem 
                      key={employee.id} 
                      value={employee.id.toString()}
                    >
                      {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                      {employee.employeeCode ? ` (${employee.employeeCode})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select 
                value={leaveType} 
                onValueChange={setLeaveType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
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
                    calculateDays();
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
                    calculateDays();
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
                onChange={(e) => setTotalDays(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter any notes about this leave"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Leave Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}