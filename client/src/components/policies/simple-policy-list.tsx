import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

// Simple interface for our policy data
interface Policy {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  company: string;
  policyNumber: string;
  amount: number;
  startDate: string;
  endDate: string | null;
  status: string;
  notes: string | null;
}

interface SimplePolicyListProps {
  employeeId?: number;
}

export function SimplePolicyList({ employeeId }: SimplePolicyListProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch policies on component mount
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        let url = '/api/policies';
        
        // Add employeeId filter if provided
        if (employeeId) {
          url += `?employeeId=${employeeId}`;
        }
        
        console.log('Fetching policies from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error fetching policies: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Policies data:', data);
        setPolicies(data);
      } catch (err) {
        console.error('Error fetching policies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch policies');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, [employeeId]);

  // Determine badge color based on status
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Pending":
        return "warning";
      case "Suspended":
        return "secondary";
      case "Cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance Policies ({policies.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            Error: {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-8">No policies found</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Policy Number</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.employeeName}</TableCell>
                    <TableCell>{policy.company}</TableCell>
                    <TableCell>{policy.policyNumber}</TableCell>
                    <TableCell>{formatCurrency(policy.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(policy.status) as any}>
                        {policy.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{policy.startDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}