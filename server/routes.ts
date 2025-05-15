import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import path from "path";
import { 
  userLoginSchema,
  userSchema,
  insertEmployeeSchema, 
  bulkImportEmployeeSchema,
  insertPayrollRecordSchema,
  insertRecurringDeductionSchema,
  insertExportRecordSchema,
  insertEmailSettingsSchema,
  insertOvertimeRateSchema,
  insertInsurancePolicySchema,
  insertPolicyPaymentSchema,
  insertPolicyExportSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { saveBase64Image, deleteImage, ensureUploadsDir } from './uploads';

// Setup auth utilities
const MemoryStoreSession = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Create directory to store uploads
// Make sure uploads directory is created on startup
ensureUploadsDir().catch(err => {
  console.error('Failed to create uploads directory:', err);
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve the public directory for static assets
  app.use(express.static(path.join(process.cwd(), 'public')));
  // Create HTTP server
  const server = createServer(app);

  // Set up session management
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: "keyboard cat", // In production, use environment variable
    })
  );

  // Configure passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        if (user.password !== password) {
          // This is insecure. In production, use bcrypt or similar
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
  };

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    try {
      const { username, password } = userLoginSchema.parse(req.body);
      
      passport.authenticate("local", (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ error: info?.message || "Login failed" });
        }
        
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          
          // Log the activity
          storage.createActivityLog({
            userId: user.id,
            action: "User Login",
            details: `User ${user.username} logged in`
          });
          
          return res.json({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            isAdmin: user.isAdmin,
            role: user.role,
            active: user.active,
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session.userId) {
      storage.createActivityLog({
        userId: req.session.userId,
        action: "User Logout",
        details: "User logged out"
      });
    }
    
    req.logout(() => {
      req.session.destroy(() => {
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      return res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
        active: user.active,
      });
    }
    res.status(401).json({ error: "Not authenticated" });
  });

  // Employee routes
  app.get("/api/employees", isAuthenticated, async (req, res, next) => {
    try {
      const { department, status } = req.query;
      const employees = await storage.getEmployees({
        department: department as string,
        status: status as string
      });
      res.json(employees);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }
      
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/employees", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const data = insertEmployeeSchema.parse(req.body);
      
      const employee = await storage.createEmployee(data);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Create Employee",
        details: `Created employee ${employee.firstName} ${employee.lastName}`
      });
      
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.patch("/api/employees/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }
      
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, data);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Update Employee",
        details: `Updated employee ${employee.firstName} ${employee.lastName}`
      });
      
      res.json(employee);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.post("/api/employees/import", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      
      // Check if we received raw CSV data or JSON with csvData field
      let csvData;
      if (req.headers['content-type']?.includes('text/csv')) {
        // Handle raw CSV data
        csvData = req.body.toString();
      } else if (req.body.csvData) {
        // Handle JSON with csvData field
        csvData = req.body.csvData;
      } else {
        return res.status(400).json({ error: "Missing CSV data" });
      }
      
      console.log("Received CSV data, first 200 chars:", csvData.substring(0, 200));
      
      // Parse CSV data
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        // Transform headers to lowercase
        cast: true
      });
      
      console.log("Parsed records count:", records.length);
      if (records.length > 0) {
        console.log("First record keys:", Object.keys(records[0]));
        console.log("First record data:", JSON.stringify(records[0], null, 2));
      }
      
      // Transform the records to match our schema
      // Specifically for the "Butts IMport.csv" format
      const transformedRecords = records.map((record: any) => {
        // Extract values from record (using any field name format in the CSV)
        const getField = (record: any, possibleNames: string[]): string => {
          for (const name of possibleNames) {
            for (const key of Object.keys(record)) {
              if (key.toLowerCase() === name.toLowerCase()) {
                return record[key] || '';
              }
            }
          }
          return '';
        };
        
        console.log("Raw record from CSV:", record);
        
        // Handle case sensitivity in field names
        const normalizedRecord: Record<string, string> = {};
        Object.keys(record).forEach(key => {
          normalizedRecord[key.toLowerCase()] = record[key];
        });
        
        // Map specifically for Butts IMport.csv format first
        const employeeCode = normalizedRecord.employeecode || '';
        let firstName = normalizedRecord.firstname || '';
        let lastName = normalizedRecord.lastname || '';
        let position = normalizedRecord.position || '';
        const department = normalizedRecord.department || 'Security';
        const company = normalizedRecord.company || 'Butters';
        
        // Handle all caps names in the CSV (common in Butts IMport.csv)
        if (firstName === firstName.toUpperCase()) {
          firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        
        if (lastName === lastName.toUpperCase()) {
          lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
        }
        
        // Trim position field which sometimes has trailing spaces
        position = position.trim();
        
        // If direct mapping didn't work, try with various field name options
        let data = {
          employeeCode: employeeCode || getField(record, ['code', 'employee code', 'employeecode', 'employee_code', 'employeeid']),
          firstName: firstName || getField(record, ['first name', 'first_name', 'fname', 'name', 'firstname']),
          lastName: lastName || getField(record, ['last name', 'last_name', 'lname', 'surname', 'lastname']),
          department: department || getField(record, ['dept', 'division']) || 'Security',
          position: position || getField(record, ['title', 'job title', 'job_title', 'jobtitle', 'role']),
          company: company || getField(record, ['organization', 'org']) || 'Butters',
          status: 'Active'
        };
        
        // Log if we're missing critical data for the first few records
        if (!data.employeeCode || !data.firstName || !data.lastName || !data.position) {
          console.log("Missing critical data for record:", record);
        }
        
        return data;
      });
      
      // Final validation and cleaning
      const validRecords = transformedRecords.filter(record => 
        record.employeeCode && record.firstName && record.lastName && record.position
      );
      
      if (validRecords.length === 0) {
        return res.status(400).json({ 
          error: "No valid employee records found in CSV. Make sure your CSV includes employeeCode, firstName, lastName, and position fields." 
        });
      }
      
      // Validate transformed records
      const employeeData = bulkImportEmployeeSchema.parse(validRecords);
      
      // Bulk create or update employees
      const result = await storage.bulkCreateOrUpdateEmployees(employeeData);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Import Employees",
        details: `Imported ${result.created} new employees, updated ${result.updated} existing employees`
      });
      
      res.json(result);
    } catch (error) {
      console.error('Import error:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      return res.status(500).json({ error: `Failed to import employees: ${error.message}` });
    }
  });

  // Payroll Records routes
  app.get("/api/payroll-records", isAuthenticated, async (req, res, next) => {
    try {
      const { employeeId, recordType, status, startDate, endDate } = req.query;
      
      const filter: any = {};
      if (employeeId) filter.employeeId = parseInt(employeeId as string);
      if (recordType) filter.recordType = recordType as string;
      if (status) filter.status = status as string;
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);
      
      const records = await storage.getPayrollRecords(filter);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/payroll-records/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const record = await storage.getPayrollRecord(id);
      if (!record) {
        return res.status(404).json({ error: "Record not found" });
      }
      
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/payroll-records", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const data = insertPayrollRecordSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const record = await storage.createPayrollRecord(data);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Create Payroll Record",
        details: `Created ${record.recordType} record for employee ID ${record.employeeId}`
      });
      
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.patch("/api/payroll-records/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const data = insertPayrollRecordSchema.partial().parse(req.body);
      const record = await storage.updatePayrollRecord(id, data);
      
      if (!record) {
        return res.status(404).json({ error: "Record not found" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Update Payroll Record",
        details: `Updated ${record.recordType} record ID ${record.id}`
      });
      
      res.json(record);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.delete("/api/payroll-records/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      // Get the record first for the log
      const record = await storage.getPayrollRecord(id);
      if (!record) {
        return res.status(404).json({ error: "Record not found" });
      }
      
      const result = await storage.deletePayrollRecord(id);
      
      if (!result) {
        return res.status(404).json({ error: "Record not found or could not be deleted" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Delete Payroll Record",
        details: `Deleted ${record.recordType} record ID ${id}`
      });
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Report Generation Routes
  app.post("/api/reports/generate", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const recordType = req.query.recordType as string || 'all';
      const includeUnapproved = (req.query.includeUnapproved as string) === 'true';
      const format = (req.query.format as string) || 'csv';
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }
      
      console.log(`Generating ${format} report for ${recordType} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Get report data with the specific date range
      let reportData: any[] = [];
      
      // For payroll records, we need to get data for each type
      const options = {
        startDate,
        endDate,
        includeUnapproved
      };
      
      if (recordType === 'all') {
        // Get all types of records
        reportData = await storage.getReportData(options);
      } else if (recordType === 'earnings') {
        // Get all earnings types
        reportData = await storage.getReportData({
          ...options,
          recordType: 'earnings'
        });
      } else {
        // Get specific record type
        reportData = await storage.getReportData({
          ...options,
          recordType
        });
      }
      
      console.log(`Found ${reportData.length} records for report`);
      
      // Generate a unique filename for the export
      const timestamp = new Date().getTime();
      const fileName = `payroll-${recordType}-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}-${timestamp}`;
      const filePath = `public/exports/${fileName}.${format}`;
      const publicUrl = `/exports/${fileName}.${format}`;
      
      // Ensure the exports directory exists
      const fs = require('fs');
      const path = require('path');
      if (!fs.existsSync('public/exports')) {
        fs.mkdirSync('public/exports', { recursive: true });
      }
      
      if (format === 'excel') {
        // Generate Excel file
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payroll Data');
        
        // Add headers - customize these to match what Tracey needs
        worksheet.columns = [
          { header: 'Employee Code', key: 'employeeCode', width: 15 },
          { header: 'Employee Name', key: 'employeeName', width: 30 },
          { header: 'Record Type', key: 'recordType', width: 20 },
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Description', key: 'description', width: 30 },
          { header: 'Hours', key: 'hours', width: 10 },
          { header: 'Rate', key: 'rate', width: 10 },
          { header: 'Approved', key: 'approved', width: 10 }
        ];
        
        // Add rows
        worksheet.addRows(reportData.map((record: any) => ({
          ...record,
          date: new Date(record.date).toLocaleDateString(),
          approved: record.approved ? 'Yes' : 'No'
        })));
        
        // Save the file
        await workbook.xlsx.writeFile(filePath);
      } else {
        // Generate CSV file
        const { parse } = require('json2csv');
        
        // Format data for CSV - customize these fields to match what Tracey needs
        const csvData = reportData.map((record: any) => ({
          'Employee Code': record.employeeCode || '',
          'Employee Name': record.employeeName,
          'Record Type': record.recordType,
          'Date': new Date(record.date).toLocaleDateString(),
          'Amount': record.amount,
          'Description': record.description || '',
          'Hours': record.hours || '',
          'Rate': record.rate || '',
          'Approved': record.approved ? 'Yes' : 'No'
        }));
        
        // Parse to CSV
        const csv = parse(csvData);
        
        // Write file
        fs.writeFileSync(filePath, csv);
      }
      
      // Create export record in database
      const exportRecord = await storage.createExportRecord({
        userId,
        exportType: recordType,
        fileUrl: publicUrl,
        fileFormat: format,
        startDate,
        endDate,
        includeUnapproved,
        recordCount: reportData.length
      });
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Generated Report",
        details: `Generated ${format.toUpperCase()} report for ${recordType} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
      });
      
      res.status(200).json({
        success: true,
        exportId: exportRecord.id,
        downloadUrl: publicUrl,
        message: `Report generated successfully with ${reportData.length} records`
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report: ' + error.message });
    }
  });
  
  // Get export records
  app.get("/api/export-records", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const exports = await storage.getExportRecords({ userId });
      res.json(exports);
    } catch (error) {
      console.error('Error fetching export records:', error);
      res.status(500).json({ error: 'Failed to fetch export records' });
    }
  });

  // Recurring Deductions routes
  app.get("/api/recurring-deductions", isAuthenticated, async (req, res, next) => {
    try {
      const { employeeId, deductionName } = req.query;
      
      const filter: any = {};
      if (employeeId) filter.employeeId = parseInt(employeeId as string);
      if (deductionName) filter.deductionName = deductionName as string;
      
      const deductions = await storage.getRecurringDeductions(filter);
      res.json(deductions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/recurring-deductions/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deduction ID" });
      }
      
      const deduction = await storage.getRecurringDeduction(id);
      if (!deduction) {
        return res.status(404).json({ error: "Recurring deduction not found" });
      }
      
      res.json(deduction);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/recurring-deductions", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const data = insertRecurringDeductionSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const deduction = await storage.createRecurringDeduction(data);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Create Recurring Deduction",
        details: `Created recurring deduction for employee ID ${deduction.employeeId}`
      });
      
      res.status(201).json(deduction);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.patch("/api/recurring-deductions/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deduction ID" });
      }
      
      const data = insertRecurringDeductionSchema.partial().parse(req.body);
      const deduction = await storage.updateRecurringDeduction(id, data);
      
      if (!deduction) {
        return res.status(404).json({ error: "Recurring deduction not found" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Update Recurring Deduction",
        details: `Updated recurring deduction ID ${deduction.id}`
      });
      
      res.json(deduction);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.delete("/api/recurring-deductions/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deduction ID" });
      }
      
      // Get the deduction first for the log
      const deduction = await storage.getRecurringDeduction(id);
      if (!deduction) {
        return res.status(404).json({ error: "Recurring deduction not found" });
      }
      
      const result = await storage.deleteRecurringDeduction(id);
      
      if (!result) {
        return res.status(404).json({ error: "Recurring deduction not found or could not be deleted" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Delete Recurring Deduction",
        details: `Deleted recurring deduction ID ${id}`
      });
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Email Settings routes
  app.get("/api/email-settings", isAuthenticated, async (req, res, next) => {
    try {
      const settings = await storage.getEmailSettings();
      if (!settings) {
        return res.status(404).json({ error: "Email settings not found" });
      }
      
      // Don't return the SMTP password for security
      const safeSettings = {
        ...settings,
        smtpPassword: undefined  // Remove password from response
      };
      
      res.json(safeSettings);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/email-settings", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only administrators can modify email settings" });
      }
      
      const data = insertEmailSettingsSchema.parse({
        ...req.body,
        updatedBy: userId
      });
      
      const settings = await storage.saveEmailSettings(data);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "Update Email Settings",
        details: `Updated email settings`
      });
      
      // Don't return the SMTP password for security
      const safeSettings = {
        ...settings,
        smtpPassword: undefined  // Remove password from response
      };
      
      res.json(safeSettings);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Export Records routes
  app.get("/api/exports", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      let filter = {};
      
      // If not admin, only show user's own exports
      if (!user.isAdmin) {
        filter = { userId };
      }
      
      const records = await storage.getExportRecords(filter);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/exports", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      
      // Validate export request
      const { reportName, month, includeRecordTypes, format = 'xlsx' } = req.body;
      
      if (!reportName || !month || !includeRecordTypes || !includeRecordTypes.length) {
        return res.status(400).json({ error: "Missing required export parameters" });
      }
      
      // Create export record first
      const exportRecord = await storage.createExportRecord({
        userId,
        exportType: 'payroll',
        fileUrl: '',
        startDate: new Date(month),
        endDate: new Date(month),
        fileFormat: format
      });
      
      // Get report data based on parameters
      const reportData = await storage.getReportData({
        month: new Date(month),
        includeRecordTypes
      });
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.creator = 'Butters Payroll App';
      
      // Add Employees sheet
      const employeesSheet = workbook.addWorksheet('Employees');
      employeesSheet.columns = [
        { header: 'Employee Code', key: 'employeeCode', width: 15 },
        { header: 'Full Name', key: 'fullName', width: 25 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Position', key: 'position', width: 20 },
        { header: 'Status', key: 'status', width: 10 }
      ];
      
      // Add employees data
      employeesSheet.addRows(reportData.employees);
      
      // Add Records sheet
      const recordsSheet = workbook.addWorksheet('Payroll Records');
      recordsSheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Record Type', key: 'recordType', width: 15 },
        { header: 'Employee', key: 'employeeName', width: 25 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Hours', key: 'hours', width: 10 },
        { header: 'Rate', key: 'rate', width: 10 },
        { header: 'Total Days', key: 'totalDays', width: 10 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Details', key: 'details', width: 30 }
      ];
      
      // Add payroll records data
      recordsSheet.addRows(reportData.payrollRecords);
      
      // Format the Excel data
      const formatDate = (sheet: ExcelJS.Worksheet, dateColumns: string[]) => {
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) { // Skip header row
            dateColumns.forEach(col => {
              const cell = row.getCell(col);
              if (cell.value instanceof Date) {
                cell.numFmt = 'yyyy-mm-dd';
              }
            });
          }
        });
      };
      
      formatDate(recordsSheet, ['date']);
      
      // Generate response based on requested format
      if (format === 'xlsx') {
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Log the activity
        await storage.createActivityLog({
          userId,
          action: "Generate Export",
          details: `Generated "${reportName}" export in ${format} format`
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(reportName)}.xlsx`);
        res.send(Buffer.from(buffer));
      } else {
        return res.status(400).json({ error: "Unsupported export format" });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Activity Logs routes
  app.get("/api/activity-logs", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as any;
      
      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only administrators can view activity logs" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const logs = await storage.getActivityLogs(limit);
      
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard data route
  app.get("/api/dashboard", isAuthenticated, async (req, res, next) => {
    try {
      const data = await storage.getDashboardData();
      res.json(data);
    } catch (error) {
      next(error);
    }
  });
  
  // Document image upload endpoint
  app.post("/api/upload-document", isAuthenticated, async (req, res, next) => {
    try {
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: "No image data provided" });
      }
      
      // Save the base64 image and get back the URL
      const imageUrl = await saveBase64Image(imageData);
      
      res.status(201).json({ url: imageUrl });
    } catch (error) {
      console.error("Error uploading document image:", error);
      res.status(500).json({ error: "Failed to upload document image" });
    }
  });
  
  // Leave routes
  app.get("/api/leave", isAuthenticated, async (req, res, next) => {
    try {
      const filter = {
        recordType: "Leave"
      };
      
      // Add optional filters
      if (req.query.startDate) {
        filter["startDate"] = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filter["endDate"] = new Date(req.query.endDate as string);
      }
      if (req.query.status) {
        filter["status"] = req.query.status as string;
      }
      if (req.query.employeeId) {
        filter["employeeId"] = parseInt(req.query.employeeId as string);
      }
      
      const records = await storage.getPayrollRecords(filter);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/leave", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      
      // Create a leave record (which is a type of payroll record)
      const data = insertPayrollRecordSchema.parse({
        ...req.body,
        recordType: "Leave",
        createdBy: userId
      });
      
      const record = await storage.createPayrollRecord(data);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Create Leave Record",
        details: `Created leave record for employee ID ${record.employeeId}`
      });
      
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });
  
  app.get("/api/leave/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const record = await storage.getPayrollRecord(id);
      
      if (!record) {
        return res.status(404).json({ error: "Leave record not found" });
      }
      
      if (record.recordType !== "Leave") {
        return res.status(400).json({ error: "Record is not a leave record" });
      }
      
      res.json(record);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/leave/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if record exists and is a leave record
      const existingRecord = await storage.getPayrollRecord(id);
      if (!existingRecord) {
        return res.status(404).json({ error: "Leave record not found" });
      }
      
      if (existingRecord.recordType !== "Leave") {
        return res.status(400).json({ error: "Record is not a leave record" });
      }
      
      // Update the record
      const data = insertPayrollRecordSchema.partial().parse(req.body);
      
      // Ensure recordType remains "Leave"
      if (data.recordType && data.recordType !== "Leave") {
        return res.status(400).json({ error: "Cannot change record type" });
      }
      
      const updatedRecord = await storage.updatePayrollRecord(id, data);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Update Leave Record",
        details: `Updated leave record ID ${id} for employee ID ${existingRecord.employeeId}`
      });
      
      res.json(updatedRecord);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });
  
  app.delete("/api/leave/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if record exists and is a leave record
      const existingRecord = await storage.getPayrollRecord(id);
      if (!existingRecord) {
        return res.status(404).json({ error: "Leave record not found" });
      }
      
      if (existingRecord.recordType !== "Leave") {
        return res.status(400).json({ error: "Record is not a leave record" });
      }
      
      // Delete the record
      const success = await storage.deletePayrollRecord(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "Delete Leave Record",
          details: `Deleted leave record ID ${id} for employee ID ${existingRecord.employeeId}`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete leave record" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Overtime Rates routes
  app.get("/api/overtime-rates", isAuthenticated, async (req, res, next) => {
    try {
      const rates = await storage.getOvertimeRates();
      res.json(rates);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/overtime-rates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const rate = await storage.getOvertimeRate(id);
      if (!rate) {
        return res.status(404).json({ error: "Overtime rate not found" });
      }
      
      res.json(rate);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/overtime-rates", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only administrators can manage overtime rates" });
      }
      
      // Validate input
      const parsedData = insertOvertimeRateSchema.parse({
        ...req.body,
        updatedBy: userId
      });
      
      // Create the overtime rate
      const newRate = await storage.createOvertimeRate(parsedData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "CREATE_OVERTIME_RATE",
        details: `Created ${newRate.overtimeType} overtime rate (${newRate.rate}x)`
      });
      
      res.status(201).json(newRate);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.put("/api/overtime-rates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only administrators can manage overtime rates" });
      }
      
      // Check if rate exists
      const existingRate = await storage.getOvertimeRate(id);
      if (!existingRate) {
        return res.status(404).json({ error: "Overtime rate not found" });
      }
      
      // Validate input
      const parsedData = insertOvertimeRateSchema.partial().parse({
        ...req.body,
        updatedBy: userId
      });
      
      // Update the overtime rate
      const updatedRate = await storage.updateOvertimeRate(id, parsedData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "UPDATE_OVERTIME_RATE",
        details: `Updated ${updatedRate?.overtimeType} overtime rate (${updatedRate?.rate}x)`
      });
      
      res.json(updatedRate);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.delete("/api/overtime-rates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      // Check if user is admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only administrators can manage overtime rates" });
      }
      
      // Check if rate exists
      const existingRate = await storage.getOvertimeRate(id);
      if (!existingRate) {
        return res.status(404).json({ error: "Overtime rate not found" });
      }
      
      // Delete the overtime rate
      const success = await storage.deleteOvertimeRate(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "DELETE_OVERTIME_RATE",
          details: `Deleted ${existingRate.overtimeType} overtime rate`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete overtime rate" });
      }
    } catch (error) {
      next(error);
    }
  });

  // User Management Routes
  
  // Get all users
  app.get("/api/users", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as any;
      
      // Only admins can view all users
      if (!currentUser.isAdmin) {
        return res.status(403).json({ error: "Only administrators can view user list" });
      }
      
      // Get all users from storage
      const users = await Promise.all((await storage.getAllUsers()).map(async (user) => {
        // Don't send password in response
        const { password, ...safeUser } = user;
        return safeUser;
      }));
      
      res.json(users);
    } catch (error) {
      next(error);
    }
  });
  
  // Get specific user
  app.get("/api/users/:id", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as any;
      const userId = parseInt(req.params.id);
      
      // Only admins or the user themselves can view their details
      if (!currentUser.isAdmin && currentUser.id !== userId) {
        return res.status(403).json({ error: "You don't have permission to view this user" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't send password in response
      const { password, ...safeUser } = user;
      
      res.json(safeUser);
    } catch (error) {
      next(error);
    }
  });
  
  // Create new user
  app.post("/api/users", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as any;
      
      // Only admins can create users
      if (!currentUser.isAdmin) {
        return res.status(403).json({ error: "Only administrators can create new users" });
      }
      
      // Validate user data
      const userData = userSchema.parse(req.body);
      
      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Create the user
      const newUser = await storage.createUser(userData);
      
      // Log activity
      await storage.createActivityLog({
        userId: currentUser.id,
        action: "CREATE_USER",
        details: `Created user ${userData.username} with role ${userData.role}`
      });
      
      // Don't send password in response
      const { password, ...safeUser } = newUser;
      
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });
  
  // Update user
  app.patch("/api/users/:id", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as any;
      const userId = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Only admins can update other users
      // Regular users can only update their own profile, and cannot change their role
      if (!currentUser.isAdmin && currentUser.id !== userId) {
        return res.status(403).json({ error: "You don't have permission to update this user" });
      }
      
      // Non-admins cannot change their own role
      if (!currentUser.isAdmin && currentUser.id === userId && req.body.role) {
        return res.status(403).json({ error: "You cannot change your own role" });
      }
      
      // Validate update data - partial validation as this is a PATCH
      const updateData = userSchema.partial().parse(req.body);
      
      // If updating username, check it's not already taken
      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await storage.getUserByUsername(updateData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: currentUser.id,
        action: "UPDATE_USER",
        details: `Updated user ${updatedUser.username}`
      });
      
      // Don't send password in response
      const { password, ...safeUser } = updatedUser;
      
      res.json(safeUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });
  
  // Delete user
  app.delete("/api/users/:id", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as any;
      const userId = parseInt(req.params.id);
      
      // Only admins can delete users
      if (!currentUser.isAdmin) {
        return res.status(403).json({ error: "Only administrators can delete users" });
      }
      
      // Users cannot delete themselves
      if (currentUser.id === userId) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Delete the user
      const success = await storage.deleteUser(userId);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: currentUser.id,
          action: "DELETE_USER",
          details: `Deleted user ${user.username}`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Insurance Policies Routes
  // Get all insurance policies with optional filtering
  app.get("/api/policies", isAuthenticated, async (req, res, next) => {
    try {
      const filter: {
        employeeId?: number;
        company?: string;
        status?: string;
      } = {};
      
      if (req.query.employeeId) {
        filter.employeeId = parseInt(req.query.employeeId as string);
      }
      
      if (req.query.company) {
        filter.company = req.query.company as string;
      }
      
      if (req.query.status) {
        filter.status = req.query.status as string;
      }
      
      const policies = await storage.getInsurancePolicies(filter);
      res.json(policies);
    } catch (error) {
      next(error);
    }
  });
  
  // Get a specific insurance policy by ID
  app.get("/api/policies/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid policy ID" });
      }
      
      const policy = await storage.getInsurancePolicy(id);
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      
      res.json(policy);
    } catch (error) {
      next(error);
    }
  });
  
  // Create a new insurance policy
  app.post("/api/policies", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      
      // Validate request body
      const policyData = insertInsurancePolicySchema.parse({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
      });
      
      // Save base64 document image if provided
      if (policyData.documentImage && policyData.documentImage.startsWith('data:')) {
        const imagePath = await saveBase64Image(policyData.documentImage, 'policy-documents');
        policyData.documentImage = imagePath;
      }
      
      // Create the policy
      const newPolicy = await storage.createInsurancePolicy(policyData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "CREATE_POLICY",
        details: `Created insurance policy for employee #${policyData.employeeId} with ${policyData.company}`
      });
      
      res.status(201).json(newPolicy);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });
  
  // Update an existing insurance policy
  app.patch("/api/policies/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid policy ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if policy exists
      const existingPolicy = await storage.getInsurancePolicy(id);
      if (!existingPolicy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      
      // Validate update data - partial validation as this is a PATCH
      const updateData = insertInsurancePolicySchema.partial().parse({
        ...req.body,
        updatedBy: userId
      });
      
      // Handle document image if it's being updated
      if (updateData.documentImage && updateData.documentImage.startsWith('data:')) {
        // Delete old image if it exists
        if (existingPolicy.documentImage) {
          await deleteImage(existingPolicy.documentImage);
        }
        
        // Save new image
        const imagePath = await saveBase64Image(updateData.documentImage, 'policy-documents');
        updateData.documentImage = imagePath;
      }
      
      // Update the policy
      const updatedPolicy = await storage.updateInsurancePolicy(id, updateData);
      
      if (!updatedPolicy) {
        return res.status(500).json({ error: "Failed to update policy" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "UPDATE_POLICY",
        details: `Updated insurance policy #${id} for ${existingPolicy.employeeName}`
      });
      
      res.json(updatedPolicy);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });
  
  // Delete an insurance policy
  app.delete("/api/policies/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid policy ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if policy exists
      const policy = await storage.getInsurancePolicy(id);
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      
      // Delete document image if it exists
      if (policy.documentImage) {
        await deleteImage(policy.documentImage);
      }
      
      // Delete the policy
      const success = await storage.deleteInsurancePolicy(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "DELETE_POLICY",
          details: `Deleted insurance policy #${id} for ${policy.employeeName}`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete policy" });
      }
    } catch (error) {
      next(error);
    }
  });
  
  // Policy Payments Routes
  // Get all policy payments with optional filtering
  app.get("/api/policy-payments", isAuthenticated, async (req, res, next) => {
    try {
      const filter: {
        policyId?: number;
        startDate?: Date;
        endDate?: Date;
      } = {};
      
      if (req.query.policyId) {
        filter.policyId = parseInt(req.query.policyId as string);
      }
      
      if (req.query.startDate) {
        filter.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filter.endDate = new Date(req.query.endDate as string);
      }
      
      const payments = await storage.getPolicyPayments(filter);
      res.json(payments);
    } catch (error) {
      next(error);
    }
  });
  
  // Get a specific policy payment by ID
  app.get("/api/policy-payments/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid payment ID" });
      }
      
      const payment = await storage.getPolicyPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error) {
      next(error);
    }
  });
  
  // Create a new policy payment
  app.post("/api/policy-payments", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      
      // Validate request body
      const paymentData = insertPolicyPaymentSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      // Create the payment
      const newPayment = await storage.createPolicyPayment(paymentData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "CREATE_POLICY_PAYMENT",
        details: `Created payment of R${paymentData.amount} for policy #${paymentData.policyId}`
      });
      
      res.status(201).json(newPayment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });
  
  // Update an existing policy payment
  app.patch("/api/policy-payments/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid payment ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if payment exists
      const existingPayment = await storage.getPolicyPayment(id);
      if (!existingPayment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Validate update data - partial validation as this is a PATCH
      const updateData = insertPolicyPaymentSchema.partial().parse(req.body);
      
      // Update the payment
      const updatedPayment = await storage.updatePolicyPayment(id, updateData);
      
      if (!updatedPayment) {
        return res.status(500).json({ error: "Failed to update payment" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "UPDATE_POLICY_PAYMENT",
        details: `Updated payment #${id} for policy #${existingPayment.policyId}`
      });
      
      res.json(updatedPayment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });
  
  // Delete a policy payment
  app.delete("/api/policy-payments/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid payment ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if payment exists
      const payment = await storage.getPolicyPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Delete the payment
      const success = await storage.deletePolicyPayment(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "DELETE_POLICY_PAYMENT",
          details: `Deleted payment #${id} for policy #${payment.policyId}`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete payment" });
      }
    } catch (error) {
      next(error);
    }
  });
  
  // Policy Export Routes
  // Get all policy exports with optional filtering
  app.get("/api/policy-exports", isAuthenticated, async (req, res, next) => {
    try {
      const filter: {
        userId?: number;
        company?: string;
      } = {};
      
      if (req.query.userId) {
        filter.userId = parseInt(req.query.userId as string);
      }
      
      if (req.query.company) {
        filter.company = req.query.company as string;
      }
      
      const exports = await storage.getPolicyExports(filter);
      res.json(exports);
    } catch (error) {
      next(error);
    }
  });
  
  // Create a new policy export
  app.post("/api/policy-exports", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      
      // Validate request body
      const exportData = insertPolicyExportSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      // Create export record
      const newExport = await storage.createPolicyExport(exportData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "CREATE_POLICY_EXPORT",
        details: `Created policy export "${exportData.exportName}" for ${exportData.company || 'all companies'}`
      });
      
      // Get the report data
      const reportData = await storage.getPolicyReportData({
        month: new Date(exportData.month),
        company: exportData.company || undefined
      });
      
      // Generate Excel file
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Butters Payroll System';
      workbook.created = new Date();
      
      // Policies sheet
      const policiesSheet = workbook.addWorksheet('Policies');
      policiesSheet.columns = [
        { header: 'Employee', key: 'employee', width: 30 },
        { header: 'Policy Number', key: 'policyNumber', width: 20 },
        { header: 'Company', key: 'company', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Notes', key: 'notes', width: 30 }
      ];
      
      // Add policy data
      reportData.policies.forEach(policy => {
        policiesSheet.addRow({
          employee: policy.employeeName,
          policyNumber: policy.policyNumber,
          company: policy.company,
          status: policy.status,
          startDate: policy.startDate,
          amount: policy.amount,
          notes: policy.notes
        });
      });
      
      // Format headers
      policiesSheet.getRow(1).font = { bold: true };
      
      // Payments sheet
      const paymentsSheet = workbook.addWorksheet('Payments');
      paymentsSheet.columns = [
        { header: 'Employee', key: 'employee', width: 30 },
        { header: 'Policy Number', key: 'policyNumber', width: 20 },
        { header: 'Payment Date', key: 'paymentDate', width: 15 },
        { header: 'Month', key: 'month', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 }
      ];
      
      // Add payment data
      reportData.payments.forEach(payment => {
        paymentsSheet.addRow({
          employee: payment.employeeName,
          policyNumber: payment.policyNumber,
          paymentDate: payment.paymentDate,
          month: payment.month,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          notes: payment.notes
        });
      });
      
      // Format headers
      paymentsSheet.getRow(1).font = { bold: true };
      
      // Create buffer for the Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Convert buffer to base64 for response
      const base64 = Buffer.from(buffer).toString('base64');
      
      res.json({
        export: newExport,
        data: base64,
        filename: `policy-export-${newExport.id}.xlsx`
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });
  
  // Get policy report data for a specific month and company
  app.get("/api/policy-reports", isAuthenticated, async (req, res, next) => {
    try {
      // Validate query parameters
      if (!req.query.month) {
        return res.status(400).json({ error: "Month parameter is required" });
      }
      
      const month = new Date(req.query.month as string);
      if (isNaN(month.getTime())) {
        return res.status(400).json({ error: "Invalid month format" });
      }
      
      const company = req.query.company as string | undefined;
      
      // Get report data
      const reportData = await storage.getPolicyReportData({
        month,
        company
      });
      
      res.json(reportData);
    } catch (error) {
      next(error);
    }
  });

  return server;
}