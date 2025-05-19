import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPayrollRecordSchema } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { EmployeeWithFullName } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, X } from "lucide-react";
import { EnhancedEmployeeSearch } from "@/components/employees/enhanced-employee-search";
import { WebcamCapture } from "@/components/common/webcam-capture";

// Extend the insert schema with validation
const terminationFormSchema = insertPayrollRecordSchema.extend({
  // Add termination specific fields
  details: z.string().min(1, "Termination reason is required"),
  documentImage: z.string().optional().nullable(),
});

type TerminationFormValues = z.infer<typeof terminationFormSchema>;

interface TerminationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TerminationFormValues) => void;
  defaultValues?: Partial<TerminationFormValues>;
  isSubmitting: boolean;
  title: string;
}

export function TerminationForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isSubmitting,
  title,
}: TerminationFormProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(defaultValues?.documentImage || null);
  const [showWebcam, setShowWebcam] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch employees for the dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeWithFullName[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<TerminationFormValues>({
    resolver: zodResolver(terminationFormSchema),
    defaultValues: {
      ...defaultValues,
      recordType: "Termination",
      approved: defaultValues?.approved || false, // Default to not approved
      date: defaultValues?.date || new Date().toISOString().split('T')[0],
      documentImage: defaultValues?.documentImage || null,
    },
  });

  // Handle webcam capture
  const handleCapture = async (imageDataUrl: string | null) => {
    if (imageDataUrl) {
      setIsUploading(true);
      try {
        // Upload the image to the server
        const response = await fetch('/api/upload-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageData: imageDataUrl })
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload document image');
        }
        
        const data = await response.json();
        setCapturedImage(data.url);
        form.setValue('documentImage', data.url);
        setShowWebcam(false);
      } catch (error) {
        console.error('Error uploading image:', error);
        // Keep the captured image locally even if upload fails
        setCapturedImage(imageDataUrl);
        form.setValue('documentImage', imageDataUrl);
      } finally {
        setIsUploading(false);
      }
    } else {
      setCapturedImage(null);
      form.setValue('documentImage', null);
    }
  };
  
  // Handle file upload from input
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      
      reader.onload = async () => {
        const base64data = reader.result as string;
        
        // Upload to server
        const response = await fetch('/api/upload-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageData: base64data }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload document image');
        }
        
        const data = await response.json();
        setCapturedImage(data.url);
        form.setValue('documentImage', data.url);
        setIsUploading(false);
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        alert('Failed to read the selected file. Please try again with a different file.');
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('There was an error uploading your file. Please try again.');
      setIsUploading(false);
    }
  };
  
  // Trigger file input click
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = (values: TerminationFormValues) => {
    // Ensure the document image URL is included
    const valuesWithImage = {
      ...values,
      documentImage: capturedImage,
      // Ensure date fields are properly formatted as strings
      date: values.date ? 
        (typeof values.date === 'string' ? values.date : values.date.toISOString().split('T')[0]) 
        : undefined,
    };
    
    console.log("Submitting termination form with values:", valuesWithImage);
    onSubmit(valuesWithImage);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the details for the employee termination.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Hidden Record Type field - always "Termination" */}
              <FormField
                control={form.control}
                name="recordType"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <EnhancedEmployeeSearch
                control={form.control}
                name="employeeId"
                label="Employee"
                required
                statusFilter="Active"
                placeholder="Search for an employee..."
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Last Working Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={typeof field.value === 'string' 
                          ? field.value 
                          : field.value instanceof Date 
                            ? field.value.toISOString().split('T')[0] 
                            : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Reason for Termination</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Resignation">Resignation</SelectItem>
                        <SelectItem value="End of Contract">End of Contract</SelectItem>
                        <SelectItem value="Dismissal">Dismissal</SelectItem>
                        <SelectItem value="Retrenchment">Retrenchment</SelectItem>
                        <SelectItem value="Retirement">Retirement</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Additional Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter additional details about the termination" 
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
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any additional notes" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Document Image Capture */}
              <FormField
                control={form.control}
                name="documentImage"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Termination Document</FormLabel>
                    <div className="space-y-4">
                      {showWebcam ? (
                        <div className="p-4 border rounded-md">
                          <WebcamCapture 
                            onCapture={handleCapture} 
                            initialImage={capturedImage} 
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-4">
                          {capturedImage && (
                            <div className="border rounded-md overflow-hidden max-w-full">
                              <img 
                                src={capturedImage} 
                                alt="Captured document" 
                                className="w-full h-auto max-h-[200px] object-contain"
                              />
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={triggerFileUpload}
                              disabled={isUploading}
                              className="flex items-center gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Upload File
                            </Button>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              accept="image/*"
                              className="hidden"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowWebcam(true)}
                              disabled={isUploading}
                              className="flex items-center gap-2"
                            >
                              <Camera className="h-4 w-4" />
                              Take Photo
                            </Button>
                            {capturedImage && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setCapturedImage(null);
                                  form.setValue('documentImage', null);
                                }}
                                className="flex items-center gap-2"
                              >
                                <X className="h-4 w-4" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      <FormDescription>
                        Upload or capture an image of the termination letter or agreement.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approved"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Was this termination approved?</FormLabel>
                      <FormDescription>
                        Toggle to confirm whether this termination was approved by management
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Termination"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}