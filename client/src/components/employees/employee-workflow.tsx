import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEmployeeSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  InfoIcon, Upload, Calendar, UserIcon, CalendarIcon, 
  CreditCard, Phone, Mail, FileText, Plus, Banknote, 
  Briefcase, GraduationCap, Clock, X as CloseIcon
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { FileUpload } from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";

// Extend the employee schema with validation
const employeeFormSchema = insertEmployeeSchema.extend({
  // Basic information
  employeeCode: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  idNumber: z.string().min(1, "ID number is required"),
  dateJoined: z.string().min(1, "Start date is required"),
  
  // Employment details
  department: z.enum(["Security", "Administration", "Operations"], {
    required_error: "Department is required",
  }),
  position: z.string().min(1, "Position is required"),
  
  // Contact information
  email: z.string().email("Invalid email format").or(z.string().length(0)).optional(),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().optional(),
  
  // Financial information
  baseSalary: z.number().min(0, "Salary must be a positive number").or(z.string().transform(val => parseFloat(val) || 0)),
  taxNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankBranch: z.string().optional(),
  
  // Additional benefits/extras
  allowances: z.string().optional(),
  benefits: z.string().optional(),
  
  // Documents
  documentIds: z.array(z.string()).optional(),
  documentsNote: z.string().optional(),
  
  // VIP code request
  requestVipCode: z.boolean().default(false),
  codeAwaitingUpdate: z.boolean().default(false),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: any; // Optional employee data for editing
}

export function EmployeeWorkflow({
  isOpen,
  onClose,
  employeeToEdit,
}: EmployeeWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 5; // Increased for more detailed employee capturing
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [uploadedDocs, setUploadedDocs] = useState<Array<{id: string, name: string}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateJoined, setDateJoined] = useState<Date | undefined>(new Date());
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize form with default values or edit values
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: employeeToEdit ? {
      // Populate form with employee data when editing
      employeeCode: employeeToEdit.employeeCode || "",
      firstName: employeeToEdit.firstName || "",
      lastName: employeeToEdit.lastName || "",
      idNumber: employeeToEdit.idNumber || "",
      dateJoined: employeeToEdit.dateJoined || format(new Date(), "yyyy-MM-dd"),
      department: employeeToEdit.department || "Security",
      position: employeeToEdit.position || "",
      status: employeeToEdit.status || "Active",
      email: employeeToEdit.email || "",
      phone: employeeToEdit.phone || "",
      address: employeeToEdit.address || "",
      baseSalary: employeeToEdit.baseSalary || 0,
      taxNumber: employeeToEdit.taxNumber || "",
      bankName: employeeToEdit.bankName || "",
      bankAccount: employeeToEdit.bankAccount || "",
      bankBranch: employeeToEdit.bankBranch || "",
      allowances: employeeToEdit.allowances || "",
      benefits: employeeToEdit.benefits || "",
      documentIds: employeeToEdit.documentIds || [],
      documentsNote: employeeToEdit.documentsNote || "",
      requestVipCode: employeeToEdit?.vipCodeRequested || false,
      codeAwaitingUpdate: !employeeToEdit?.employeeCode,
    } : {
      employeeCode: "",
      firstName: "",
      lastName: "",
      idNumber: "",
      dateJoined: format(new Date(), "yyyy-MM-dd"),
      department: "Security",
      position: "",
      status: "Active",
      email: "",
      phone: "",
      address: "",
      baseSalary: 0,
      taxNumber: "",
      bankName: "",
      bankAccount: "",
      bankBranch: "",
      allowances: "",
      benefits: "",
      documentIds: [],
      documentsNote: "",
      requestVipCode: false,
      codeAwaitingUpdate: false,
    },
  });

  // Set up component when it loads
  useState(() => {
    if (employeeToEdit) {
      setIsEditMode(true);
      if (employeeToEdit.dateJoined) {
        setDateJoined(new Date(employeeToEdit.dateJoined));
      }
      if (employeeToEdit.documentIds && employeeToEdit.documentIds.length > 0) {
        // Simulate loaded documents if needed
        setUploadedDocs(employeeToEdit.documentIds.map((id: string, index: number) => ({
          id,
          name: `Document ${index + 1}`
        })));
      }
    }
  });

  // Handle file upload with the new FileUpload component
  const handleFileUploadComplete = (fileIds: string[]) => {
    if (!fileIds.length) return;
    
    // Add uploaded files to the documents array with generic names
    const newDocs = fileIds.map((fileId, index) => ({
      id: fileId,
      name: `Document ${uploadedDocs.length + index + 1}`,
    }));
    
    setUploadedDocs([...uploadedDocs, ...newDocs]);
    
    // Update form data with document IDs
    const currentDocIds = form.getValues('documentIds') || [];
    form.setValue('documentIds', [...currentDocIds, ...fileIds]);
    
    toast({
      title: "Documents Uploaded",
      description: `${fileIds.length} document(s) uploaded successfully.`,
    });
  };

  // Handle document removal
  const handleRemoveDocument = (docId: string) => {
    setUploadedDocs(uploadedDocs.filter(doc => doc.id !== docId));
    
    // Update form data
    const currentDocIds = form.getValues('documentIds') || [];
    form.setValue('documentIds', currentDocIds.filter(id => id !== docId));
  };

  // Date selection handler
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDateJoined(selectedDate);
    if (selectedDate) {
      form.setValue('dateJoined', format(selectedDate, "yyyy-MM-dd"));
    }
  };

  // Create/Update employee mutation
  const saveEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeFormValues) => {
      // Extract the form control fields that aren't part of the API
      const { requestVipCode, codeAwaitingUpdate, ...employeeData } = data;
      
      // Add VIP code tracking if requested
      const finalData = {
        ...employeeData,
        vipCodeRequested: requestVipCode || codeAwaitingUpdate,
        vipCodeRequestDate: (requestVipCode || codeAwaitingUpdate) ? new Date().toISOString() : undefined,
        vipCodeStatus: (requestVipCode || codeAwaitingUpdate) ? 'Requested' : 'Not Requested'
      };
      
      if (isEditMode && employeeToEdit?.id) {
        // Update existing employee
        return apiRequest(`/api/employees/${employeeToEdit.id}`, "PATCH", finalData);
      } else {
        // Create new employee
        return apiRequest("/api/employees", "POST", finalData);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff-records"] });
      setSuccess(true);
      
      // Log activity
      if (user?.id) {
        const employeeInfo = `${form.getValues().firstName} ${form.getValues().lastName}${form.getValues().employeeCode ? ` (${form.getValues().employeeCode})` : ''}`;
        
        apiRequest("/api/activity-logs", "POST", {
          userId: user.id,
          action: isEditMode ? "Updated employee" : "Created new employee",
          details: `${isEditMode ? 'Updated' : 'Created'} employee: ${employeeInfo}`,
        });
        
        // If VIP code was requested, log that too
        if (form.getValues().requestVipCode || form.getValues().codeAwaitingUpdate) {
          apiRequest("/api/activity-logs", "POST", {
            userId: user.id,
            action: "VIP code requested",
            details: `Requested VIP code for employee: ${employeeInfo}`,
          });
          
          toast({
            title: "VIP Code Request Sent",
            description: "The request for a VIP code has been sent to Tracey.",
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: isEditMode ? "Failed to update employee" : "Failed to create employee",
        description: error.message,
      });
    },
  });

  const handleSubmit = (values: EmployeeFormValues) => {
    saveEmployeeMutation.mutate(values);
  };

  const handleClose = () => {
    form.reset();
    setUploadedDocs([]);
    setDateJoined(new Date());
    setStep(1);
    setActiveTab("basic");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update employee information in the system."
              : "Enter comprehensive details for the new employee."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <InfoIcon className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                {isEditMode ? "Employee Updated Successfully" : "Employee Created Successfully"}
              </AlertTitle>
              <AlertDescription className="text-green-700">
                {isEditMode 
                  ? "The employee information has been updated." 
                  : "The employee has been added to the system."}
                {(form.getValues().requestVipCode || form.getValues().codeAwaitingUpdate) && (
                  <p className="mt-2">A VIP code has been requested from Tracey and will be tracked in the employee's record.</p>
                )}
              </AlertDescription>
            </Alert>
            <Button onClick={handleClose} className="w-full">Close</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="basic">
                    <UserIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Basic</span>
                  </TabsTrigger>
                  <TabsTrigger value="employment">
                    <Briefcase className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Employment</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Contact</span>
                  </TabsTrigger>
                  <TabsTrigger value="financial">
                    <Banknote className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Financial</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Documents</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employeeCode"
                      render={({ field }) => (
                        <FormItem className={field.value ? "col-span-2" : "col-span-1"}>
                          <FormLabel>Employee Code {form.getValues().codeAwaitingUpdate && "(Pending)"}</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input 
                                placeholder={form.getValues().codeAwaitingUpdate ? "Pending from Tracey" : "Enter employee code"} 
                                {...field} 
                                disabled={form.getValues().codeAwaitingUpdate}
                              />
                            </FormControl>
                            {isEditMode && !field.value && (
                              <FormField
                                control={form.control}
                                name="codeAwaitingUpdate"
                                render={({ field: switchField }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Switch
                                        checked={switchField.value}
                                        onCheckedChange={(checked) => {
                                          switchField.onChange(checked);
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                          <FormDescription>
                            {form.getValues().codeAwaitingUpdate 
                              ? "Code will be assigned by Tracey" 
                              : "Unique identifier for the employee"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="idNumber"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>ID Number*</FormLabel>
                          <FormControl>
                            <Input placeholder="National ID number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateJoined"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Start Date*</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={dateJoined}
                                onSelect={handleDateSelect}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                {/* Employment Details Tab */}
                <TabsContent value="employment" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Department*</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Security">Security</SelectItem>
                              <SelectItem value="Administration">Administration</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Position*</FormLabel>
                          <FormControl>
                            <Input placeholder="Job position or title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allowances"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Allowances</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Housing, travel, phone, etc." 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            List any additional allowances provided to the employee
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="benefits"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Benefits</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Medical aid, pension, etc." 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            List any additional benefits provided to the employee
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                {/* Contact Information Tab */}
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="employee@example.com" 
                              {...field} 
                              value={field.value || ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Phone Number*</FormLabel>
                          <FormControl>
                            <Input placeholder="0123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Physical address" 
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                {/* Financial Information Tab */}
                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="baseSalary"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Base Salary</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxNumber"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Tax Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Tax registration number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankBranch"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Bank Branch</FormLabel>
                          <FormControl>
                            <Input placeholder="Branch code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankAccount"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Bank Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Account number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Advanced Document upload with new component */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-medium">Supporting Documents</h3>
                      
                      {/* File Upload Component */}
                      <FileUpload 
                        onUploadComplete={handleFileUploadComplete}
                        label="Upload Employee Documents"
                        maxFiles={5}
                        acceptedFileTypes=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      
                      {/* Document list */}
                      {uploadedDocs.length > 0 ? (
                        <div className="space-y-2 mt-4">
                          <h3 className="text-sm font-medium">Uploaded Documents</h3>
                          {uploadedDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between bg-muted p-2 rounded">
                              <span className="text-sm truncate max-w-[250px]">{doc.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDocument(doc.id)}
                              >
                                <CloseIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No documents uploaded</p>
                          <p className="text-xs mt-1">
                            Upload supporting documents like ID, contracts, certificates
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Document notes */}
                    <FormField
                      control={form.control}
                      name="documentsNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add notes about the documents" 
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Add any additional information about the documents
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* VIP Code Request */}
                    {!isEditMode && (
                      <FormField
                        control={form.control}
                        name="requestVipCode"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Request VIP Code from Tracey
                              </FormLabel>
                              <FormDescription>
                                Toggle this to request a VIP code for this employee.
                                The request will be logged and tracked.
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
                    )}
                    
                    {(form.watch("requestVipCode") || form.watch("codeAwaitingUpdate")) && (
                      <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>VIP Code Request</AlertTitle>
                        <AlertDescription>
                          A notification will be sent to Tracey requesting a VIP code for this employee. 
                          You can track the status of this request in the employee's details.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveEmployeeMutation.isPending}>
                  {saveEmployeeMutation.isPending 
                    ? "Saving..." 
                    : isEditMode ? "Update Employee" : "Save Employee"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}