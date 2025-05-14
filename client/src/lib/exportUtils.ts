import { downloadBlob } from "./utils";

export interface ExportOptions {
  reportName: string;
  company?: string;
  month: Date;
  includeLeave: boolean;
  includeOvertime: boolean;
  includeDeductions: boolean;
  includeAllowances: boolean;
  format: string;
}

export async function generateExport(options: ExportOptions): Promise<void> {
  try {
    const response = await fetch("/api/exports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to generate export");
    }

    const blob = await response.blob();
    const fileName = `${options.reportName.replace(/\s+/g, "_")}.xlsx`;
    
    downloadBlob(blob, fileName);
    
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}

export function getMonthName(date: Date): string {
  return date.toLocaleString("default", { month: "long" });
}

export function getMonthYear(date: Date): string {
  return `${getMonthName(date)} ${date.getFullYear()}`;
}

export function getDefaultReportName(reportType: string, company: string | undefined, date: Date): string {
  const monthYear = getMonthYear(date);
  const companyStr = company && company !== "All Companies" ? ` - ${company}` : "";
  return `${reportType}${companyStr} - ${monthYear}`;
}
