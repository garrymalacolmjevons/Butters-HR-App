import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Trash2, Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OvertimeRate {
  id: number;
  overtimeType: string;
  rate: number;
  description: string | null;
  updatedAt: Date | null;
  updatedBy: number;
}

interface EditableRateProps {
  rate: OvertimeRate;
  onSave: (rate: OvertimeRate) => void;
  onCancel: () => void;
}

function EditableRate({ rate, onSave, onCancel }: EditableRateProps) {
  const [rateValue, setRateValue] = useState<number>(rate.rate);

  return (
    <TableRow key={rate.id}>
      <TableCell>{rate.overtimeType}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input 
            type="number" 
            min={1} 
            max={5} 
            step={0.1} 
            value={rateValue} 
            onChange={(e) => setRateValue(parseFloat(e.target.value))}
            className="w-24"
          />
          <span>x</span>
        </div>
      </TableCell>
      <TableCell>{rate.description}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onSave({ ...rate, rate: rateValue })}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function OvertimeRatesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRate, setNewRate] = useState({
    overtimeType: 'Weekday',
    rate: 1.5,
    description: ''
  });

  // Fetch overtime rates
  const { data: rates, isLoading } = useQuery({
    queryKey: ['/api/overtime-rates']
  });

  // Update rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async (rate: OvertimeRate) => {
      await fetch(`/api/overtime-rates/${rate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate: rate.rate
        }),
        credentials: 'include'
      });
      return rate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-rates'] });
      setEditingRateId(null);
      toast({
        title: 'Success',
        description: 'Overtime rate updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update overtime rate: ${error.message}`,
      });
    }
  });

  // Add rate mutation
  const addRateMutation = useMutation({
    mutationFn: async (data: typeof newRate) => {
      return apiRequest('/api/overtime-rates', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-rates'] });
      setIsAddDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Overtime rate added successfully',
      });
      // Reset form
      setNewRate({
        overtimeType: 'Weekday',
        rate: 1.5,
        description: ''
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to add overtime rate: ${error.message}`,
      });
    }
  });

  // Delete rate mutation
  const deleteRateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/overtime-rates/${id}`, {
        method: 'DELETE'
      });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-rates'] });
      toast({
        title: 'Success',
        description: 'Overtime rate deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete overtime rate: ${error.message}`,
      });
    }
  });

  const handleAddRate = () => {
    addRateMutation.mutate(newRate);
  };

  const handleUpdateRate = (rate: OvertimeRate) => {
    updateRateMutation.mutate(rate);
  };

  const handleDeleteRate = (id: number) => {
    if (window.confirm('Are you sure you want to delete this overtime rate?')) {
      deleteRateMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-medium">Overtime Rate Configuration</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Overtime Rate</DialogTitle>
              <DialogDescription>
                Set up a new overtime rate multiplier.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="overtimeType" className="text-right">Type</Label>
                <Select 
                  value={newRate.overtimeType} 
                  onValueChange={(value) => setNewRate({...newRate, overtimeType: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select overtime type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekday">Weekday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                    <SelectItem value="Public Holiday">Public Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rate" className="text-right">Rate</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input 
                    id="rate" 
                    type="number" 
                    min={1} 
                    max={5} 
                    step={0.1} 
                    value={newRate.rate} 
                    onChange={(e) => setNewRate({...newRate, rate: parseFloat(e.target.value)})}
                    className="w-24"
                  />
                  <span>x</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea 
                  id="description" 
                  className="col-span-3"
                  value={newRate.description}
                  onChange={(e) => setNewRate({...newRate, description: e.target.value})}
                  placeholder="Provide a description for this overtime rate"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddRate} 
                disabled={addRateMutation.isPending}
              >
                {addRateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rates && rates.length === 0 ? (
        <Alert>
          <AlertDescription>
            No overtime rates configured yet. Click "Add Rate" to create your first overtime rate.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates?.map(rate => 
                  editingRateId === rate.id ? (
                    <EditableRate 
                      key={rate.id} 
                      rate={rate} 
                      onSave={handleUpdateRate} 
                      onCancel={() => setEditingRateId(null)} 
                    />
                  ) : (
                    <TableRow key={rate.id}>
                      <TableCell>{rate.overtimeType}</TableCell>
                      <TableCell>
                        <span className="font-medium">{rate.rate}x</span>
                      </TableCell>
                      <TableCell>{rate.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingRateId(rate.id)}
                            disabled={updateRateMutation.isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteRate(rate.id)}
                            disabled={deleteRateMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}