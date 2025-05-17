import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, differenceInDays } from "date-fns"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a currency value
export function formatCurrency(value: number | null | undefined, currency = "ZAR") {
  if (value === null || value === undefined) return "";
  
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format a date with a consistent format
export function formatDate(date: Date | string | null | undefined, formatStr = "dd MMM yyyy") {
  if (!date) return "";
  
  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    console.error("Invalid date format:", error);
    return "Invalid Date";
  }
}

// Calculate number of days between two dates
export function calculateDaysBetween(startDate: Date | string | null, endDate: Date | string | null) {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return differenceInDays(end, start) + 1; // Include both start and end days
  } catch (error) {
    console.error("Error calculating days between dates:", error);
    return 0;
  }
}

// Format a date as relative time (e.g., "2 hours ago")
export function formatTimeAgo(date: Date | string | null | undefined) {
  if (!date) return "";
  
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (error) {
    console.error("Error formatting time ago:", error);
    return "Unknown time";
  }
}