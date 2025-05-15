import { useQuery } from "@tanstack/react-query";
import { Employee } from "@shared/schema";

interface EmployeesResponse {
  employees: Employee[];
  totalCount: number;
}

export function useFetchEmployees(filter?: { 
  department?: string; 
  status?: string;
  search?: string;
}) {
  return useQuery<EmployeesResponse>({
    queryKey: ['/api/employees', filter],
    keepPreviousData: true,
  });
}

export function useFetchEmployee(id?: number) {
  return useQuery<Employee>({
    queryKey: ['/api/employees', id],
    enabled: !!id,
  });
}