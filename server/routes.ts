import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import * as fs from 'fs';

import path from "path";
import { 
  userLoginSchema,
  userSchema,
  insertEmployeeSchema, 
  bulkImportEmployeeSchema,
  insertPayrollRecordSchema,
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
import { Parser as Json2csvParser } from 'json2csv';
import { upload, saveBase64Image, deleteImage, ensureUploadsDir } from './uploads';
import { configureMicrosoftAuth } from './microsoft-auth';

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

  // Configure Microsoft authentication
  configureMicrosoftAuth(app);

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

  // File upload route for handling documents
  app.post("/api/uploads", isAuthenticated, upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      // Generate URLs for the uploaded files
      const fileIds = req.files.map((file) => {
        const relativePath = `/uploads/${file.filename}`;
        return relativePath;
      });
      
      // Log the upload
      if (req.session.userId) {
        await storage.createActivityLog({
          userId: req.session.userId,
          action: "File upload",
          details: `Uploaded ${fileIds.length} document(s)`
        });
      }
      
      res.json({
        success: true,
        message: `${fileIds.length} file(s) uploaded successfully`,
        fileIds
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

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

  // Staff Records route removed
  
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
      
      // Get list of exported record IDs from the tracking table
      const exportedResult = await db.execute(`
        SELECT DISTINCT record_id FROM exported_record_tracking
      `);
      
      // Convert to a Set for efficient lookup
      const exportedIds = new Set(exportedResult.rows.map((row: any) => Number(row.record_id)));
      
      // Add hasBeenExported flag to each record
      const recordsWithExportStatus = records.map(record => ({
        ...record,
        hasBeenExported: exportedIds.has(record.id)
      }));
      
      // Return the records with export status
      return res.json(recordsWithExportStatus);
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
      
      // Log activity
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
      
      const data = insertPayrollRecordSchema.partial().parse({
        ...req.body,
        updatedBy: userId
      });
      
      const record = await storage.updatePayrollRecord(id, data);
      
      if (!record) {
        return res.status(404).json({ error: "Record not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Update Payroll Record",
        details: `Updated ${record.recordType} record for employee ID ${record.employeeId}`
      });
      
      res.json(record);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });
  
  // Records Editor API endpoints
  app.get("/api/payroll/records", isAuthenticated, async (req, res, next) => {
    try {
      const { employeeId, recordType, status, startDate, endDate } = req.query;
      
      const filter: any = {};
      if (employeeId) filter.employeeId = parseInt(employeeId as string);
      if (recordType) filter.recordType = recordType as string;
      if (status) filter.status = status as string;
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);
      
      const records = await storage.getPayrollRecords(filter);
      
      // Get list of exported record IDs from the tracking table
      const exportedResult = await db.execute(`
        SELECT DISTINCT record_id FROM exported_record_tracking
      `);
      
      // Convert to a Set for efficient lookup
      const exportedIds = new Set(exportedResult.rows.map((row: any) => Number(row.record_id)));
      
      // Add hasBeenExported flag to each record
      const recordsWithExportStatus = records.map(record => ({
        ...record,
        hasBeenExported: exportedIds.has(record.id)
      }));
      
      // Return the records with export status
      return res.json(recordsWithExportStatus);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/payroll/records/:id", isAuthenticated, async (req, res, next) => {
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
  
  app.post("/api/payroll/records", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const data = insertPayrollRecordSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const record = await storage.createPayrollRecord(data);
      
      // Log activity
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
  
  app.patch("/api/payroll/records/:id", isAuthenticated, async (req, res, next) => {
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
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Update Payroll Record",
        details: `Updated ${record.recordType} record with ID ${id}`
      });
      
      res.json(record);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });
  
  app.delete("/api/payroll/records/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const existingRecord = await storage.getPayrollRecord(id);
      if (!existingRecord) {
        return res.status(404).json({ error: "Record not found" });
      }
      
      const success = await storage.deletePayrollRecord(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "Delete Payroll Record",
          details: `Deleted ${existingRecord.recordType} record with ID ${id}`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete record" });
      }
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
  
  // All leave endpoints have been removed

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
        return res.status(400).json({ error: "Invalid overtime rate ID" });
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
      const data = insertOvertimeRateSchema.parse(req.body);
      
      const rate = await storage.createOvertimeRate(data);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Create Overtime Rate",
        details: `Created overtime rate for ${rate.overtimeType}`
      });
      
      res.status(201).json(rate);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.patch("/api/overtime-rates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid overtime rate ID" });
      }
      
      const data = insertOvertimeRateSchema.partial().parse(req.body);
      const rate = await storage.updateOvertimeRate(id, data);
      
      if (!rate) {
        return res.status(404).json({ error: "Overtime rate not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Update Overtime Rate",
        details: `Updated overtime rate for ${rate.overtimeType}`
      });
      
      res.json(rate);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.delete("/api/overtime-rates/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid overtime rate ID" });
      }
      
      const rate = await storage.getOvertimeRate(id);
      if (!rate) {
        return res.status(404).json({ error: "Overtime rate not found" });
      }
      
      const success = await storage.deleteOvertimeRate(id);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId,
          action: "Delete Overtime Rate",
          details: `Deleted overtime rate for ${rate.overtimeType}`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete overtime rate" });
      }
    } catch (error) {
      next(error);
    }
  });
  
  // Insurance Policies endpoints
  app.get('/api/policies', isAuthenticated, async (req, res, next) => {
    try {
      const { employeeId, company, status } = req.query;
      
      const filter: any = {};
      if (employeeId) filter.employeeId = parseInt(employeeId as string);
      if (company) filter.company = company as string;
      if (status) filter.status = status as string;
      
      const policies = await storage.getInsurancePolicies(filter);
      
      res.json(policies);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/policies/:id', isAuthenticated, async (req, res, next) => {
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

  // Track exported records endpoint
  app.post('/api/records/track-export', isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const { recordIds } = req.body;
      
      if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
        return res.status(400).json({ error: "Record IDs are required for tracking exports" });
      }
      
      // Create a values string for the SQL query
      const valuesString = recordIds.map(recordId => 
        `(${recordId}, ${userId}, NOW())`
      ).join(', ');
      
      // Insert into tracking table with conflict handling
      const trackingQuery = `
        INSERT INTO exported_record_tracking (record_id, exported_by, exported_at)
        VALUES ${valuesString}
        ON CONFLICT (record_id) DO UPDATE
        SET exported_at = NOW(), exported_by = ${userId}
      `;
      
      await db.execute(trackingQuery);
      
      res.json({ success: true, message: `Tracked ${recordIds.length} exported records` });
    } catch (error) {
      console.error('Error tracking exported records:', error);
      next(error);
    }
  });

  app.post('/api/policies', isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const data = insertInsurancePolicySchema.parse({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
      });
      
      const policy = await storage.createInsurancePolicy(data);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Create Policy",
        details: `Created insurance policy for employee ID ${policy.employeeId}`
      });
      
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.patch('/api/policies/:id', isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid policy ID" });
      }
      
      const data = insertInsurancePolicySchema.partial().parse({
        ...req.body,
        updatedBy: userId
      });
      
      const policy = await storage.updateInsurancePolicy(id, data);
      
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Update Policy",
        details: `Updated insurance policy for employee ID ${policy.employeeId}`
      });
      
      res.json(policy);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.delete('/api/policies/:id', isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid policy ID" });
      }
      
      // Get the policy first for activity logging
      const policy = await storage.getInsurancePolicy(id);
      
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      
      const success = await storage.deleteInsurancePolicy(id);
      
      if (!success) {
        return res.status(404).json({ error: "Policy not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Delete Policy",
        details: `Deleted insurance policy for employee ID ${policy.employeeId}`
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Policy Payments endpoints
  app.get('/api/policy-payments', isAuthenticated, async (req, res, next) => {
    try {
      const { policyId, startDate, endDate } = req.query;
      
      const filter: any = {};
      if (policyId) filter.policyId = parseInt(policyId as string);
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);
      
      const payments = await storage.getPolicyPayments(filter);
      
      res.json(payments);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/policy-payments', isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const data = insertPolicyPaymentSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const payment = await storage.createPolicyPayment(data);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "Create Policy Payment",
        details: `Created payment for policy ID ${payment.policyId}`
      });
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Policy Exports endpoint
  app.post('/api/policy-exports', isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const { month, company, exportName, format = 'xlsx' } = req.body;
      
      // Generate report data
      const monthDate = new Date(month);
      const reportData = await storage.getPolicyReportData({
        month: monthDate,
        company: company || undefined
      });
      
      // Format for export
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Policies');
      
      // Add headers
      worksheet.columns = [
        { header: 'Employee', key: 'employeeName', width: 30 },
        { header: 'Company', key: 'company', width: 20 },
        { header: 'Policy Number', key: 'policyNumber', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 }
      ];
      
      // Add data
      reportData.policies.forEach(policy => {
        worksheet.addRow({
          employeeName: policy.employeeName,
          company: policy.company,
          policyNumber: policy.policyNumber,
          amount: policy.amount,
          status: policy.status,
          startDate: policy.startDate
        });
      });
      
      // Format amounts as currency
      worksheet.getColumn('amount').numFmt = '"R"#,##0.00';
      
      // Add totals
      const totalRow = worksheet.addRow({
        employeeName: 'TOTAL',
        amount: reportData.policies.reduce((sum, policy) => sum + (policy.amount || 0), 0)
      });
      totalRow.font = { bold: true };
      
      // Generate the Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const base64data = buffer.toString('base64');
      
      // Save export record
      const exportRecord = await storage.createPolicyExport({
        userId,
        exportName,
        exportDate: new Date(),
        month: monthDate,
        company: company || null,
        format,
        totalAmount: reportData.policies.reduce((sum, policy) => sum + (policy.amount || 0), 0),
        recordCount: reportData.policies.length
      });
      
      // Generate filename
      const filename = `policy_report_${month}${company ? `_${company.replace(/\s+/g, '_')}` : ''}.xlsx`;
      
      // Return the file data and metadata
      res.json({
        success: true,
        data: base64data,
        filename,
        exportId: exportRecord.id
      });
    } catch (error) {
      console.error('Error generating policy report:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
    }
  });
  
  app.get('/api/policy-exports', isAuthenticated, async (req, res, next) => {
    try {
      const { userId } = req.query;
      
      const filter: any = {};
      if (userId) filter.userId = parseInt(userId as string);
      
      const exports = await storage.getPolicyExports(filter);
      
      res.json(exports);
    } catch (error) {
      next(error);
    }
  });

  return server;
}