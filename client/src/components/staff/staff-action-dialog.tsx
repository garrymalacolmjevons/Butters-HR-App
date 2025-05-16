import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlusIcon,
  UserMinusIcon,
  BanknotesIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

interface StaffActionDialogProps {
  onSelectAction: (action: "add-employee" | "leave" | "termination" | "bank-account") => void;
}

export function StaffActionDialog({ onSelectAction }: StaffActionDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (action: "add-employee" | "leave" | "termination" | "bank-account") => {
    onSelectAction(action);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">Staff Action</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Staff Action</DialogTitle>
          <DialogDescription>
            Choose which type of staff record you want to create
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2"
            onClick={() => handleSelect("add-employee")}
          >
            <UserPlusIcon className="h-8 w-8 text-amber-500" />
            <span>Add New Employee</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2"
            onClick={() => handleSelect("leave")}
          >
            <CalendarDaysIcon className="h-8 w-8 text-blue-500" />
            <span>Capture Leave</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2"
            onClick={() => handleSelect("termination")}
          >
            <UserMinusIcon className="h-8 w-8 text-red-500" />
            <span>Record Termination</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2"
            onClick={() => handleSelect("bank-account")}
          >
            <BanknotesIcon className="h-8 w-8 text-green-500" />
            <span>Change Bank Account</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}