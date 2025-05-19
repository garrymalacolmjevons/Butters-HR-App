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
    
    // Insert each policy into the database
    let successCount = 0;
    
    for (const policy of records) {
      try {
        if (!policy.Company || !policy.Status) {
          console.log('Skipping incomplete policy record:', policy);
          continue;
        }

        // Extract policy number from comment
        const policyNumberMatch = policy.Comment?.match(/POLICY\s+NUMBER[:\s]+([^\s,]+)/i);
        const policyNumber = policyNumberMatch ? policyNumberMatch[1] : null;

        // Clean up value (remove 'R' prefix and convert to number)
        const valueString = policy.Value?.replace('R', '')?.trim() || '0';
        const value = parseFloat(valueString) || 0;

        // Find employee by code
        let employeeId = null;
        if (policy.Employee) {
          const result = await pool.query(
            'SELECT id FROM employees WHERE employee_code = $1',
            [policy.Employee]
          );
          
          if (result.rows.length > 0) {
            employeeId = result.rows[0].id;
          }
        }

        if (!employeeId) {
          // Try to find by first and last name
          if (policy['First Name'] && policy['Last Name']) {
            const result = await pool.query(
              'SELECT id FROM employees WHERE first_name ILIKE $1 AND last_name ILIKE $2',
              [policy['First Name'], policy['Last Name']]
            );
            
            if (result.rows.length > 0) {
              employeeId = result.rows[0].id;
            }
          }
        }

        if (!employeeId) {
          console.log(`Could not find employee for policy: ${policy.Employee} ${policy['First Name']} ${policy['Last Name']}`);
          continue;
        }

        // Map policy data from CSV to database schema
        const insertQuery = `
          INSERT INTO insurance_policies (
            employee_id, company, policy_number, amount, notes, status, start_date, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
          ) RETURNING id
        `;
        
        // Fix company name mappings
        let companyName = policy.Company;
        if (companyName === 'Old Mutul') {
          companyName = 'Old Mutual';
        }

        // Set current date for start_date if not provided
        const today = new Date();
        
        // Values to insert
        const values = [
          employeeId,
          companyName,
          policyNumber,
          value,
          policy.Comment,
          policy.Status === 'Active' ? 'Active' : 'Cancelled'
        ];
        
        // Execute query
        const result = await pool.query(insertQuery, values);
        
        if (result.rows.length > 0) {
          successCount++;
          console.log(`Imported policy for ${policy['First Name']} ${policy['Last Name']} - ${policy.Company} - ${policyNumber}`);
        }
      } catch (err) {
        console.error(`Error importing policy for ${policy['First Name']} ${policy['Last Name']}:`, err);
      }
    }
    
    console.log(`Successfully imported ${successCount} insurance policies out of ${records.length} total`);
  } catch (error) {
    console.error('Error importing policy data:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the import
importPolicies();