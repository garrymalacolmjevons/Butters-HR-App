import { parse as csvParse } from "csv-parse/browser/esm";

export interface CSVParseOptions {
  headerMapping: Record<string, string[]>;
  requiredFields: string[];
}

export interface PolicyCsvRow {
  employeeCode: string;
  lastName: string;
  firstName: string;
  company: string;
  amount: string;
  notes: string;
  status: string;
}

export function getPolicyCsvParseOptions(): CSVParseOptions {
  return {
    headerMapping: {
      employeeCode: ["employee", "employee_code", "employeecode", "code", "id", "employee id", "employee_id", "employeeid"],
      lastName: ["last name", "lastname", "lname", "last_name", "surname"],
      firstName: ["first name", "firstname", "fname", "first_name", "name"],
      company: ["company", "insurance company", "insurance_company", "insurancecompany", "provider"],
      amount: ["value", "amount", "premium", "fee"],
      notes: ["comment", "notes", "description", "details", "policy number", "policy_number", "policynumber"],
      status: ["status", "policy status", "policy_status", "policystatus"]
    },
    requiredFields: ["employeeCode", "company", "amount", "status"]
  };
}

export async function parseCSV(file: File, options: CSVParseOptions): Promise<PolicyCsvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      if (!event.target || !event.target.result) {
        return reject(new Error("Failed to read file"));
      }
      
      const csvData = event.target.result as string;
      
      try {
        // Parse the CSV file
        const records = await new Promise<any[]>((resolve, reject) => {
          csvParse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          }, (err, output) => {
            if (err) reject(err);
            else resolve(output);
          });
        });
        
        // Map headers and validate
        const { headerMapping, requiredFields } = options;
        const mappedRecords: PolicyCsvRow[] = [];
        const errors: string[] = [];
        
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const mappedRecord: any = {};
          
          // Map fields based on possible header names
          for (const [targetField, possibleHeaders] of Object.entries(headerMapping)) {
            let foundValue = null;
            
            for (const header of possibleHeaders) {
              const headerLower = header.toLowerCase();
              
              // Check for exact match
              if (record[header] !== undefined) {
                foundValue = record[header];
                break;
              }
              
              // Check for case-insensitive match
              for (const key of Object.keys(record)) {
                if (key.toLowerCase() === headerLower) {
                  foundValue = record[key];
                  break;
                }
              }
              
              if (foundValue !== null) break;
            }
            
            mappedRecord[targetField] = foundValue !== null ? foundValue : '';
          }
          
          // Validate required fields
          const missingFields = requiredFields.filter(
            field => !mappedRecord[field] || mappedRecord[field].trim() === ''
          );
          
          if (missingFields.length > 0) {
            errors.push(
              `Row ${i + 2}: Missing required fields: ${missingFields.join(', ')}`
            );
          } else {
            mappedRecords.push(mappedRecord as PolicyCsvRow);
          }
        }
        
        if (errors.length > 0) {
          const error = new Error("CSV parsing validation failed");
          (error as any).details = errors;
          reject(error);
        } else {
          resolve(mappedRecords);
        }
      } catch (error) {
        console.error("CSV Parse error:", error);
        reject(new Error("Failed to parse CSV file. Please ensure the file is in the correct format."));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };
    
    reader.readAsText(file);
  });
}