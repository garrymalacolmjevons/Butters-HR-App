import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeCode: string;
  fullName?: string;
  department?: string;
  position?: string;
}

interface EmployeeSearchSelectProps {
  control: any;
  name: string;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  departmentFilter?: string;
  statusFilter?: string;
  onChange?: (value: number) => void;
}

export function EnhancedEmployeeSearch({
  control,
  name,
  label = 'Employee',
  disabled = false,
  placeholder = 'Select Employee',
  required = false,
  departmentFilter,
  statusFilter = 'Active',
  onChange,
}: EmployeeSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch employees with optional filters
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees', departmentFilter, statusFilter],
  });

  // Filter employees based on search term - search in code, first name, last name and full name
  const filteredEmployees = employees.filter((employee) => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    const fullName = (employee.fullName || `${employee.firstName} ${employee.lastName}`).toLowerCase();
    const code = (employee.employeeCode || '').toLowerCase();
    const position = (employee.position || '').toLowerCase();

    return fullName.includes(search) || 
           code.includes(search) ||
           position.includes(search) ||
           employee.firstName.toLowerCase().includes(search) ||
           employee.lastName.toLowerCase().includes(search);
  });

  // Sort employees by name for better usability
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const nameA = (a.fullName || `${a.firstName} ${a.lastName}`).toLowerCase();
    const nameB = (b.fullName || `${b.firstName} ${b.lastName}`).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="col-span-2">
          <FormLabel>{label}{required && <span className="text-red-500 ml-1">*</span>}</FormLabel>
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Search by name, code or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
                disabled={disabled || isLoading}
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            
            <Select
              disabled={disabled || isLoading}
              onValueChange={(value) => {
                const numValue = parseInt(value);
                field.onChange(numValue);
                if (onChange) {
                  onChange(numValue);
                }
              }}
              value={field.value?.toString() || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <ScrollArea className="h-80">
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : sortedEmployees.length === 0 ? (
                    <SelectItem value="no-results" disabled>No employees found</SelectItem>
                  ) : (
                    sortedEmployees.map((employee) => (
                      <SelectItem 
                        key={employee.id} 
                        value={employee.id.toString()}
                        className="flex justify-between items-center py-2"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                          </span>
                          <span className="text-xs text-muted-foreground flex gap-1">
                            <span className="bg-secondary px-1 rounded">{employee.employeeCode}</span>
                            {employee.position && <span>• {employee.position}</span>}
                            {employee.department && <span>• {employee.department}</span>}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}