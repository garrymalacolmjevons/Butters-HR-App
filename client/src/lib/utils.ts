import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
 
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