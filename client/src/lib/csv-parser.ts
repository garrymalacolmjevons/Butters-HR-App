import { ImportEmployee } from "@shared/schema";

interface CSVParseOptions {
  headerMapping: Record<string, string[]>;
  requiredFields: string[];
}

class CSVParseError extends Error {
  public details: string[];
  
  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "CSVParseError";
    this.details = details;
  }
}

export async function parseCSV(file: File, options: CSVParseOptions): Promise<ImportEmployee[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target || !event.target.result) {
          reject(new CSVParseError("Failed to read file"));
          return;
        }
        
        const csv = event.target.result as string;
        const lines = csv.split("\n");
        
        // Get header line and remove whitespace
        const headerLine = lines[0].trim();
        const headers = headerLine.split(",").map(h => h.trim().toLowerCase());
        
        // Validate headers by checking if all required fields can be matched
        const missingFields: string[] = [];
        
        for (const field of options.requiredFields) {
          const possibleHeaders = options.headerMapping[field] || [];
          const exists = possibleHeaders.some(header => 
            headers.includes(header.toLowerCase())
          );
          
          if (!exists) {
            missingFields.push(field);
          }
        }
        
        if (missingFields.length > 0) {
          reject(new CSVParseError(
            "CSV file is missing required fields", 
            missingFields.map(field => `Missing field: ${field}`)
          ));
          return;
        }
        
        // Map CSV headers to our schema fields
        const fieldMap = new Map<string, string>();
        
        for (const [field, possibleHeaders] of Object.entries(options.headerMapping)) {
          for (const header of possibleHeaders) {
            const index = headers.findIndex(h => h === header.toLowerCase());
            if (index !== -1) {
              fieldMap.set(field, headers[index]);
              break;
            }
          }
        }
        
        // Parse data rows
        const employees: ImportEmployee[] = [];
        const errors: string[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(",").map(v => v.trim());
          
          // Skip if the row doesn't have enough columns
          if (values.length < headers.length) {
            errors.push(`Row ${i + 1}: Insufficient columns`);
            continue;
          }
          
          try {
            const employee: Record<string, any> = {};
            
            // Get values based on field mapping
            for (const [field, header] of fieldMap.entries()) {
              const index = headers.indexOf(header);
              if (index !== -1) {
                employee[field] = values[index];
              }
            }
            
            // Handle special cases or transformations
            if (employee.company && 
                !["Butters", "Makana"].includes(employee.company)) {
              errors.push(`Row ${i + 1}: Invalid company "${employee.company}" (must be "Butters" or "Makana")`);
              continue;
            }
            
            if (employee.department && 
                !["Security", "Administration", "Operations"].includes(employee.department)) {
              errors.push(`Row ${i + 1}: Invalid department "${employee.department}" (must be "Security", "Administration", or "Operations")`);
              continue;
            }
            
            if (employee.status && 
                !["Active", "On Leave", "Terminated"].includes(employee.status)) {
              errors.push(`Row ${i + 1}: Invalid status "${employee.status}" (must be "Active", "On Leave", or "Terminated")`);
              continue;
            }
            
            // Set defaults for optional fields
            if (!employee.status) {
              employee.status = "Active";
            }
            
            // Skip if any required field is missing
            const missing = options.requiredFields.filter(field => !employee[field]);
            if (missing.length > 0) {
              errors.push(`Row ${i + 1}: Missing required fields: ${missing.join(", ")}`);
              continue;
            }
            
            employees.push(employee as ImportEmployee);
          } catch (error) {
            errors.push(`Row ${i + 1}: ${String(error)}`);
          }
        }
        
        if (errors.length > 0) {
          reject(new CSVParseError(`Found ${errors.length} errors while parsing CSV`, errors));
          return;
        }
        
        if (employees.length === 0) {
          reject(new CSVParseError("No valid employee records found in CSV"));
          return;
        }
        
        resolve(employees);
      } catch (error) {
        reject(new CSVParseError(`Failed to parse CSV: ${String(error)}`));
      }
    };
    
    reader.onerror = () => {
      reject(new CSVParseError("Error reading file"));
    };
    
    reader.readAsText(file);
  });
}

export function getCsvParseOptions(): CSVParseOptions {
  return {
    headerMapping: {
      employeeCode: ["employee_code", "employeecode", "code", "id", "employee id", "employee_id", "employeeid"],
      firstName: ["first_name", "firstname", "fname", "first name", "name", "firstname"],
      lastName: ["last_name", "lastname", "lname", "last name", "surname"],
      company: ["company", "organization", "org"],
      department: ["department", "dept", "division"],
      position: ["position", "title", "job title", "job_title", "jobtitle", "role"],
      status: ["status", "employee status", "employee_status", "employeestatus"]
    },
    // We'll default company and department on the server side
    // Only require the basic employee information
    requiredFields: ["employeeCode", "firstName", "lastName", "position"]
  };
}
