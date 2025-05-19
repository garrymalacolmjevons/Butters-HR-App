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

interface PolicyRecord {
  Employee: string;
  'Last Name': string;
  'First Name': string;
  Company: string;
  Value: string;
  Comment: string;
  Status: 'Active' | 'Cancelled';
}

async function importPolicies() {
  try {
    // First clean up existing policy data
    console.log('Clearing existing insurance policy data...');
    await pool.query('DELETE FROM insurance_policies');
    console.log('Existing insurance policy data cleared');

    // Read CSV file
    const filePath = path.join(__dirname, '../attached_assets/ButtsPolicy Import.csv');
    console.log(`Reading file from: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Parse CSV content
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as PolicyRecord[];
    
    console.log(`Found ${records.length} policy records to import`);
    
    // Pre-fetch all employees to reduce database lookups
    const employeesResult = await pool.query('SELECT id, employee_code, first_name, last_name FROM employees');
    const employees = employeesResult.rows;
    const employeesByCode = new Map();
    const employeesByName = new Map();
    
    employees.forEach(emp => {
      if (emp.employee_code) {
        employeesByCode.set(emp.employee_code, emp.id);
      }
      // Create a key combining first and last name for case-insensitive lookup
      const nameKey = `${emp.first_name.toLowerCase()}|${emp.last_name.toLowerCase()}`;
      employeesByName.set(nameKey, emp.id);
    });
    
    console.log(`Loaded ${employees.length} employees for mapping`);
    
    // Insert each policy into the database
    let successCount = 0;
    
    // Prepare values for bulk import
    const insertValues = [];
    const today = new Date();
    
    for (const policy of records) {
      try {
        if (!policy.Company || !policy.Status) {
          console.log('Skipping incomplete policy record:', policy);
          continue;
        }

        // Extract policy number from comment
        const policyNumberMatch = policy.Comment?.match(/POLICY\s+NUMBER[:\s]+([^\s,]+)/i);
        const policyNumber = policyNumberMatch ? policyNumberMatch[1] : policy.Comment?.substring(0, 20) || '';

        // Clean up value (remove 'R' prefix and convert to number)
        const valueString = policy.Value?.replace('R', '')?.trim() || '0';
        const value = parseFloat(valueString) || 0;

        // Find employee by code
        let employeeId = null;
        if (policy.Employee) {
          employeeId = employeesByCode.get(policy.Employee);
        }

        if (!employeeId && policy['First Name'] && policy['Last Name']) {
          // Try to find by first and last name
          const nameKey = `${policy['First Name'].toLowerCase()}|${policy['Last Name'].toLowerCase()}`;
          employeeId = employeesByName.get(nameKey);
        }

        if (!employeeId) {
          console.log(`Could not find employee for policy: ${policy.Employee} ${policy['First Name']} ${policy['Last Name']}`);
          continue;
        }

        // Fix company name mappings
        let companyName = policy.Company;
        if (companyName === 'Old Mutul') {
          companyName = 'Old Mutual';
        }
        
        // Add to the values array
        insertValues.push({
          employeeId,
          company: companyName,
          policyNumber,
          amount: value,
          notes: policy.Comment || '',
          status: policy.Status === 'Active' ? 'Active' : 'Cancelled',
          startDate: today,
        });
        
        successCount++;
      } catch (err) {
        console.error(`Error processing policy for ${policy['First Name']} ${policy['Last Name']}:`, err);
      }
    }
    
    // Bulk insert all policies at once
    if (insertValues.length > 0) {
      // Generate placeholders and values array for bulk insert
      let placeholders = [];
      let flatValues = [];
      let valueIndex = 1;
      
      for (const item of insertValues) {
        const itemPlaceholders = [
          `$${valueIndex++}`, // employee_id
          `$${valueIndex++}`, // company
          `$${valueIndex++}`, // policy_number
          `$${valueIndex++}`, // amount
          `$${valueIndex++}`, // notes
          `$${valueIndex++}`, // status
          `$${valueIndex++}`, // start_date
        ];
        placeholders.push(`(${itemPlaceholders.join(', ')}, 1, 1, NOW(), NOW())`);
        
        flatValues.push(
          item.employeeId,
          item.company,
          item.policyNumber,
          item.amount,
          item.notes,
          item.status,
          item.startDate
        );
      }
      
      const bulkInsertQuery = `
        INSERT INTO insurance_policies (
          employee_id, company, policy_number, amount, notes, status, start_date, created_by, updated_by, created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
      `;
      
      // Execute bulk insert
      await pool.query(bulkInsertQuery, flatValues);
      
      console.log(`Successfully imported ${successCount} insurance policies out of ${records.length} total`);
    } else {
      console.log('No valid policies found to import');
    }
  } catch (error) {
    console.error('Error importing policy data:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the import
importPolicies();