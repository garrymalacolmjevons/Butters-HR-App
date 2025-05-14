import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window exists (to avoid SSR issues)
    if (typeof window !== 'undefined') {
      // Initial check
      checkIfMobile();
      
      // Add resize listener
      window.addEventListener('resize', checkIfMobile);
      
      // Clean up
      return () => window.removeEventListener('resize', checkIfMobile);
    }
    
    function checkIfMobile() {
      setIsMobile(window.innerWidth < 768);
    }
  }, []);

  return isMobile;
}