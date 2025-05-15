import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from './db';
import { employees, insurancePolicies } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function importPolicies() {
  console.log('Starting policy import...');
  
  try {
    // Read the CSV file
    const csvData = fs.readFileSync('./attached_assets/ButtsPolicy Import.csv', 'utf-8');
    
    // Parse the CSV file
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records in CSV file`);
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    // Process each record
    for (const record of records) {
      try {
        // Extract employee code, could be numeric or string format
        const employeeCode = record['Employee'] || '';
        if (!employeeCode && employeeCode !== '0') {
          console.log('Skipping record with missing employee code:', record);
          errors++;
          continue;
        }
        
        // Extract company name and normalize it
        const companyRaw = record['Company'] || '';
        if (!companyRaw) {
          console.log('Skipping record with missing company:', record);
          errors++;
          continue;
        }
        
        // Normalize company name (fix typos like "Old Mutul" to "Old Mutual")
        let company = companyRaw;
        if (companyRaw.toLowerCase().includes('mutual') || companyRaw.toLowerCase().includes('mutul')) {
          company = 'Old Mutual';
        } else if (companyRaw.toLowerCase().includes('sanlam')) {
          company = 'Sanlam Sky';
        } else if (companyRaw.toLowerCase().includes('avbob')) {
          company = 'Avbob';
        } else if (companyRaw.toLowerCase().includes('provident')) {
          company = 'Provident Fund';
        }
        
        // Extract amount/premium, handle 'R' prefix
        let amount = record['Value'] || '';
        if (!amount) {
          console.log('Skipping record with missing amount:', record);
          errors++;
          continue;
        }
        
        if (typeof amount === 'string') {
          // Remove 'R' currency marker and other non-numeric characters except decimals
          amount = amount.replace(/[^0-9.]/g, '');
        }
        
        // Convert to number
        const amountValue = parseFloat(amount);
        if (isNaN(amountValue)) {
          console.log('Skipping record with invalid amount:', record);
          errors++;
          continue;
        }
        
        // Extract notes/policy number
        const notes = record['Comment'] || '';
        
        // Extract policy number from notes if present
        let policyNumber = '';
        if (notes) {
          const policyNumberMatch = notes.match(/POLICY\s*NUMBER\s*:?\s*([A-Z0-9]+)/i);
          if (policyNumberMatch && policyNumberMatch[1]) {
            policyNumber = policyNumberMatch[1].trim();
          }
        }
        
        if (!policyNumber) {
          // If policy number couldn't be extracted, use a default format
          policyNumber = `${company.substring(0, 2).toUpperCase()}${employeeCode}${new Date().getTime().toString().substring(8)}`;
        }
        
        // Extract status
        const status = record['Status'] || 'Active';
        const normalizedStatus = status.toLowerCase() === 'active' ? 'Active' : 'Cancelled';
        
        // Extract employee names
        const lastName = record['Last Name'] || '';
        const firstName = record['First Name'] || '';
        
        // Find employee in database
        let employeeId: number | null = null;
        const employeeResult = await db.select()
          .from(employees)
          .where(eq(employees.employeeCode, employeeCode))
          .limit(1);
        
        if (employeeResult.length > 0) {
          employeeId = employeeResult[0].id;
        } else {
          // If employee doesn't exist and we have name data, create a new employee
          if (lastName && firstName) {
            console.log(`Creating new employee: ${firstName} ${lastName} (${employeeCode})`);
            const newEmployee = await db.insert(employees)
              .values({
                employeeCode,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`,
                email: '',
                phone: '',
                position: 'Unknown',
                department: 'Security',
                status: 'Active',
                dateJoined: new Date()
              })
              .returning();
            
            employeeId = newEmployee[0].id;
            console.log(`Created new employee with ID ${employeeId}`);
          } else {
            console.log(`Skipping record because employee doesn't exist: ${employeeCode}`);
            errors++;
            continue;
          }
        }
        
        // Check if policy already exists
        const existingPolicy = await db.select()
          .from(insurancePolicies)
          .where(eq(insurancePolicies.policyNumber, policyNumber))
          .limit(1);
        
        const today = new Date().toISOString().split('T')[0];
        
        if (existingPolicy.length > 0) {
          // Update existing policy
          await db.update(insurancePolicies)
            .set({
              employeeId,
              company,
              amount: amountValue,
              notes,
              status: normalizedStatus,
              updatedBy: 1, // Admin user ID
              updatedAt: new Date()
            })
            .where(eq(insurancePolicies.id, existingPolicy[0].id));
          
          console.log(`Updated policy: ${policyNumber} for employee ${employeeCode}`);
          updated++;
        } else {
          // Create new policy
          await db.insert(insurancePolicies)
            .values({
              employeeId,
              company,
              policyNumber,
              amount: amountValue,
              startDate: today,
              endDate: normalizedStatus === 'Cancelled' ? today : null,
              notes,
              status: normalizedStatus,
              createdBy: 1, // Admin user ID
              updatedBy: 1, // Admin user ID
              createdAt: new Date(),
              updatedAt: new Date()
            });
          
          console.log(`Created new policy: ${policyNumber} for employee ${employeeCode}`);
          created++;
        }
      } catch (error) {
        console.error('Error processing record:', error, record);
        errors++;
      }
    }
    
    console.log(`Import completed: ${created} created, ${updated} updated, ${errors} errors`);
    
    // Create an activity log
    await db.execute(
      `INSERT INTO activity_logs (user_id, action, details) 
       VALUES (1, 'Import Policies', 'Imported ${created + updated} policies (${created} new, ${updated} updated, ${errors} errors)')`
    );
    
    console.log('Activity log created');
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Run the import
importPolicies().then(() => {
  console.log('Import script completed');
  process.exit(0);
}).catch(err => {
  console.error('Import script failed:', err);
  process.exit(1);
});