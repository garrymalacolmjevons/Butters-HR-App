import { useState } from "react";
import { User } from "@/lib/auth";
import { UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const { logout } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string>("All Companies");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState<boolean>(false);

  const handleSelectCompany = (company: string) => {
    setSelectedCompany(company);
    setCompanyDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 h-16 shadow-lg px-4">
      <div className="flex items-center">
        <div className="text-primary text-2xl font-bold">Hi-Tec Security HR Portal</div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
            className="flex items-center space-x-2"
          >
            <span>{selectedCompany}</span>
            <svg
              className={`h-4 w-4 transition-transform ${
                companyDropdownOpen ? "rotate-180" : ""
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
          {companyDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-300 rounded-md shadow-lg z-10">
              <div className="py-1">
                <button
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 w-full text-left"
                  onClick={() => handleSelectCompany("All Companies")}
                >
                  All Companies
                </button>
                <button
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 w-full text-left"
                  onClick={() => handleSelectCompany("Butters")}
                >
                  Butters
                </button>
                <button
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 w-full text-left"
                  onClick={() => handleSelectCompany("Makana")}
                >
                  Makana
                </button>
              </div>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <span className="mr-2 text-neutral-500">{user.fullName}</span>
              <UserCircle className="h-6 w-6 text-neutral-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
