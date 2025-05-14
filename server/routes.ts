import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { 
  userLoginSchema, 
  insertEmployeeSchema, 
  bulkImportEmployeeSchema,
  insertPayrollRecordSchema,
  insertExportRecordSchema,
  insertEmailSettingsSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

// Setup auth utilities
const MemoryStoreSession = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
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
            isAdmin: user.isAdmin,
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
        isAdmin: user.isAdmin,
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
      
      // Parse CSV data from the request body
      if (!req.body.csvData) {
        return res.status(400).json({ error: "Missing CSV data" });
      }
      
      const records = parse(req.body.csvData, {
        columns: true,
        skip_empty_lines: true
      });
      
      // Validate each record using Zod schema
      const employeeData = bulkImportEmployeeSchema.parse(records);
      
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
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      next(error);
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

  return server;
}