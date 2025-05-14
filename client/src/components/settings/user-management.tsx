import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, PencilIcon, PlusCircle, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userSchema } from '@shared/schema';

const formSchema = userSchema.extend({
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof formSchema>;

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Query users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  // Form for adding new user
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      role: 'Viewer',
      active: true,
    },
  });

  // Form for editing user
  const editForm = useForm<UserFormValues>({
    resolver: zodResolver(z.object({
      username: formSchema.shape.username,
      fullName: formSchema.shape.fullName,
      email: formSchema.shape.email.optional(),
      role: formSchema.shape.role,
      active: formSchema.shape.active,
      password: formSchema.shape.password.optional(),
      confirmPassword: formSchema.shape.confirmPassword.optional()
    })),
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      role: 'Viewer',
      active: true,
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<UserFormValues, 'confirmPassword'>) => {
      const { confirmPassword, ...userData } = data;
      return apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({
        title: 'User created',
        description: 'The user has been successfully created',
      });
      setIsAddDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number; userData: Partial<Omit<UserFormValues, 'confirmPassword'>> }) => {
      const { id, userData } = data;
      const { confirmPassword, ...userUpdateData } = userData;
      return apiRequest(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(userUpdateData),
      });
    },
    onSuccess: () => {
      toast({
        title: 'User updated',
        description: 'The user has been successfully updated',
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/users/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'User deleted',
        description: 'The user has been successfully deleted',
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  // Handler for opening edit dialog
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      fullName: user.fullName,
      email: user.email || '',
      role: user.role,
      active: user.active,
    });
    setIsEditDialogOpen(true);
  };

  // Handler for opening delete dialog
  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Handle form submission for adding new user
  const onSubmit = (data: UserFormValues) => {
    const { confirmPassword, ...userData } = data;
    createUserMutation.mutate(userData);
  };

  // Handle form submission for editing user
  const onEditSubmit = (data: UserFormValues) => {
    const { confirmPassword, ...userData } = data;
    
    // Only include password in the update if it was provided
    const updateData: any = { ...userData };
    if (!data.password) {
      delete updateData.password;
    }
    
    updateUserMutation.mutate({ 
      id: selectedUser.id,
      userData: updateData
    });
  };

  // Get the role badge color
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'destructive';
      case 'HR Manager':
        return 'default';
      case 'Payroll Officer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">User Management</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with specific role and permissions.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="HR Manager">HR Manager</SelectItem>
                          <SelectItem value="Payroll Officer">Payroll Officer</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Determines the user's permissions in the system
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Account</FormLabel>
                        <FormDescription>
                          Disable to temporarily suspend the user's access
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'success' : 'outline'}>
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and permissions.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (leave blank to keep current)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="New Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="HR Manager">HR Manager</SelectItem>
                        <SelectItem value="Payroll Officer">Payroll Officer</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines the user's permissions in the system
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Account</FormLabel>
                      <FormDescription>
                        Disable to temporarily suspend the user's access
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedUser && (
              <div className="space-y-2">
                <p><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Full Name:</strong> {selectedUser.fullName}</p>
                <p><strong>Role:</strong> {selectedUser.role}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}