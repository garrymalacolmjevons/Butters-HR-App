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
  insertOvertimeRateSchema
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
        createdBy: userId,
        reportName,
        month: new Date(month),
        includeRecordTypes,
        format
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

  return server;
}