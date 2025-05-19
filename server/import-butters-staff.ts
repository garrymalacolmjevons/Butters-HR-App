import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ws from 'ws';

// Configure neon for WebSocket support
neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface EmployeeRecord {
  employeeCode: string;
  PersonalTitle: string;
  firstName: string;
  lastName: string;
  position: string;
  company: string;
  department: string;
}

async function importStaff() {
  try {
    // Read CSV file
    const filePath = path.join(__dirname, '../attached_assets/Butts IMport.csv');
    console.log(`Reading file from: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Parse CSV content
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as EmployeeRecord[];
    
    console.log(`Found ${records.length} employee records to import`);
    
    // Filter out any records over 64 to ensure we only have 64 staff
    const staffToImport = records.slice(0, 64);
    
    // Insert each employee into the database
    let successCount = 0;
    
    for (const employee of staffToImport) {
      try {
        // Map employee data from CSV to database schema
        const insertQuery = `
          INSERT INTO employees (
            employee_code, first_name, last_name, position, department, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          ) RETURNING id
        `;
        
        // Values to insert
        const values = [
          employee.employeeCode || null, 
          employee.firstName || null, 
          employee.lastName || null, 
          employee.position || null, 
          'Security', // All employees are in Security department
          'Active' // Default status for all employees
        ];
        
        // Execute query
        const result = await pool.query(insertQuery, values);
        
        if (result.rows.length > 0) {
          successCount++;
          console.log(`Imported employee: ${employee.firstName} ${employee.lastName}`);
        }
      } catch (err) {
        console.error(`Error importing employee ${employee.firstName} ${employee.lastName}:`, err);
      }
    }
    
    console.log(`Successfully imported ${successCount} Butters Security staff out of ${staffToImport.length} total`);
  } catch (error) {
    console.error('Error importing staff data:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the import
importStaff();