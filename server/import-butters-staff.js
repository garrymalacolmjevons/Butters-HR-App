import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importStaff() {
  try {
    // Read CSV file
    const filePath = path.join(__dirname, '../attached_assets/Butts IMport.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Parse CSV content
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });
    
    console.log(`Found ${records.length} employee records to import`);
    
    // Filter out any records over 64 to ensure we only have 64 staff
    const staffToImport = records.slice(0, 64);
    
    // Insert each employee into the database
    let successCount = 0;
    
    for (const employee of staffToImport) {
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
      }
    }
    
    console.log(`Successfully imported ${successCount} Butters Security staff`);
  } catch (error) {
    console.error('Error importing staff data:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the import
importStaff();