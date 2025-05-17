// Simplified toast implementation
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
};

// Export useToast hook to maintain compatibility with existing components
export const useToast = () => {
  return {
    toast
  };
};