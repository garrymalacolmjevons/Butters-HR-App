// Simplified toast implementation
export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  action?: React.ReactNode;
};

let toasts: Toast[] = [];

export const toast = ({ 
  title = "", 
  description = "", 
  variant = "default"
}: { 
  title?: string; 
  description?: string;
  variant?: "default" | "destructive" | "success";
}) => {
  // In a real implementation, this would be a proper toast library
  console.log(`[Toast - ${variant}] ${title}: ${description}`);
  
  // For now, we can use browser alert for a simple notification
  if (typeof window !== 'undefined') {
    const message = `${title}\n${description}`;
    alert(message);
  }
  
  // Add to toasts array for UI display
  const id = Math.random().toString(36).slice(2);
  const newToast: Toast = { id, title, description, variant };
  toasts = [...toasts, newToast];
  
  // Remove after 5 seconds
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
  }, 5000);
  
  return id;
};

// Export useToast hook to maintain compatibility with existing components
export const useToast = () => {
  return {
    toast,
    toasts: toasts || []
  };
};