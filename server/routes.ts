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
  insertLeaveRecordSchema,
  insertOvertimeRecordSchema,
  insertDeductionRecordSchema,
  insertAllowanceRecordSchema,
  insertExportRecordSchema
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
  // Setup sessions
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // Prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "hi-tec-security-hr-portal",
    })
  );

  // Setup passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username" });
        }
        
        // In production, we would compare hashed passwords
        if (user.password !== password) {
          return done(null, false, { message: "Invalid password" });
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

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Error handling utility
  const handleZodError = (error: unknown): string => {
    if (error instanceof ZodError) {
      return fromZodError(error).message;
    }
    return String(error);
  };

  // Authentication routes
  app.post("/api/auth/login", (req, res, next) => {
    try {
      const validatedData = userLoginSchema.parse(req.body);
      
      passport.authenticate("local", (err, user, info) => {
        if (err) {
          return next(err);
        }
        
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          
          // Log activity
          storage.createActivityLog({
            userId: user.id,
            action: "Login",
            details: `User ${user.username} logged in`
          });
          
          return res.status(200).json({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            company: user.company,
            isAdmin: user.isAdmin
          });
        });
      })(req, res, next);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      company: user.company,
      isAdmin: user.isAdmin
    });
  });

  app.post("/api/auth/logout", isAuthenticated, (req, res) => {
    // Log activity
    const user = req.user as any;
    storage.createActivityLog({
      userId: user.id,
      action: "Logout",
      details: `User ${user.username} logged out`
    });
    
    req.logout(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Employee routes
  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const { company, department, status } = req.query as { company?: string; department?: string; status?: string };
      const employees = await storage.getEmployees({ company, department, status });
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.id);
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json({
        ...employee,
        fullName: `${employee.firstName} ${employee.lastName}`
      });
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      
      // Log activity
      const user = req.user as any;
      storage.createActivityLog({
        userId: user.id,
        action: "Create Employee",
        details: `Created employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`
      });
      
      res.status(201).json({
        ...employee,
        fullName: `${employee.firstName} ${employee.lastName}`
      });
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.put("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      
      const updatedEmployee = await storage.updateEmployee(employeeId, validatedData);
      
      if (!updatedEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Log activity
      const user = req.user as any;
      storage.createActivityLog({
        userId: user.id,
        action: "Update Employee",
        details: `Updated employee ${updatedEmployee.firstName} ${updatedEmployee.lastName} (${updatedEmployee.employeeCode})`
      });
      
      res.json({
        ...updatedEmployee,
        fullName: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`
      });
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  // Import employee data from VIP
  app.post("/api/employees/import", isAuthenticated, express.raw({ type: 'text/csv', limit: '10mb' }), async (req, res) => {
    try {
      // Parse CSV data
      const csvString = req.body.toString();
      const records = parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Transform and validate data
      const employeeData = records.map((record: any) => ({
        employeeCode: record.employeeCode || record.employee_code || record.code,
        firstName: record.firstName || record.first_name || record.firstname,
        lastName: record.lastName || record.last_name || record.lastname,
        company: record.company,
        department: record.department,
        position: record.position || record.title || record.job_title,
        status: record.status || 'Active'
      }));
      
      // Validate the data
      const validatedData = bulkImportEmployeeSchema.parse(employeeData);
      
      // Bulk create or update employees
      const result = await storage.bulkCreateOrUpdateEmployees(validatedData);
      
      // Log activity
      const user = req.user as any;
      storage.createActivityLog({
        userId: user.id,
        action: "Import Employees",
        details: `Imported ${result.created} new employees and updated ${result.updated} existing employees`
      });
      
      res.status(200).json({
        message: `Successfully imported ${result.created} new employees and updated ${result.updated} existing employees`,
        ...result
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid data format in the CSV file",
          details: handleZodError(error)
        });
      }
      res.status(500).json({ message: String(error) });
    }
  });

  // Leave record routes
  app.get("/api/leave", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, company, leaveType, status, startDate, endDate } = req.query as { 
        employeeId?: string;
        company?: string;
        leaveType?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
      };
      
      const filter: any = {};
      
      if (employeeId) filter.employeeId = parseInt(employeeId);
      if (company) filter.company = company;
      if (leaveType) filter.leaveType = leaveType;
      if (status) filter.status = status;
      if (startDate) filter.startDate = new Date(startDate);
      if (endDate) filter.endDate = new Date(endDate);
      
      const leaveRecords = await storage.getLeaveRecords(filter);
      res.json(leaveRecords);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.get("/api/leave/:id", isAuthenticated, async (req, res) => {
    try {
      const leaveId = parseInt(req.params.id);
      const leaveRecord = await storage.getLeaveRecord(leaveId);
      
      if (!leaveRecord) {
        return res.status(404).json({ message: "Leave record not found" });
      }
      
      res.json(leaveRecord);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.post("/api/leave", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLeaveRecordSchema.parse(req.body);
      const leaveRecord = await storage.createLeaveRecord(validatedData);
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(validatedData.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Create Leave Record",
        details: `Created ${validatedData.leaveType} record for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.status(201).json(leaveRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.put("/api/leave/:id", isAuthenticated, async (req, res) => {
    try {
      const leaveId = parseInt(req.params.id);
      const validatedData = insertLeaveRecordSchema.partial().parse(req.body);
      
      const updatedLeaveRecord = await storage.updateLeaveRecord(leaveId, validatedData);
      
      if (!updatedLeaveRecord) {
        return res.status(404).json({ message: "Leave record not found" });
      }
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(updatedLeaveRecord.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Update Leave Record",
        details: `Updated ${updatedLeaveRecord.leaveType} record for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.json(updatedLeaveRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.delete("/api/leave/:id", isAuthenticated, async (req, res) => {
    try {
      const leaveId = parseInt(req.params.id);
      const leaveRecord = await storage.getLeaveRecord(leaveId);
      
      if (!leaveRecord) {
        return res.status(404).json({ message: "Leave record not found" });
      }
      
      const deleted = await storage.deleteLeaveRecord(leaveId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete leave record" });
      }
      
      // Log activity
      const user = req.user as any;
      storage.createActivityLog({
        userId: user.id,
        action: "Delete Leave Record",
        details: `Deleted ${leaveRecord.leaveType} record for ${leaveRecord.employeeName}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  // Overtime record routes
  app.get("/api/overtime", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, company, startDate, endDate } = req.query as { 
        employeeId?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
      };
      
      const filter: any = {};
      
      if (employeeId) filter.employeeId = parseInt(employeeId);
      if (company) filter.company = company;
      if (startDate) filter.startDate = new Date(startDate);
      if (endDate) filter.endDate = new Date(endDate);
      
      const overtimeRecords = await storage.getOvertimeRecords(filter);
      res.json(overtimeRecords);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.get("/api/overtime/:id", isAuthenticated, async (req, res) => {
    try {
      const overtimeId = parseInt(req.params.id);
      const overtimeRecord = await storage.getOvertimeRecord(overtimeId);
      
      if (!overtimeRecord) {
        return res.status(404).json({ message: "Overtime record not found" });
      }
      
      res.json(overtimeRecord);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.post("/api/overtime", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertOvertimeRecordSchema.parse(req.body);
      const overtimeRecord = await storage.createOvertimeRecord(validatedData);
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(validatedData.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Create Overtime Record",
        details: `Created overtime record of ${validatedData.hours} hours for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.status(201).json(overtimeRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.put("/api/overtime/:id", isAuthenticated, async (req, res) => {
    try {
      const overtimeId = parseInt(req.params.id);
      const validatedData = insertOvertimeRecordSchema.partial().parse(req.body);
      
      const updatedOvertimeRecord = await storage.updateOvertimeRecord(overtimeId, validatedData);
      
      if (!updatedOvertimeRecord) {
        return res.status(404).json({ message: "Overtime record not found" });
      }
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(updatedOvertimeRecord.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Update Overtime Record",
        details: `Updated overtime record for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.json(updatedOvertimeRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.delete("/api/overtime/:id", isAuthenticated, async (req, res) => {
    try {
      const overtimeId = parseInt(req.params.id);
      const overtimeRecord = await storage.getOvertimeRecord(overtimeId);
      
      if (!overtimeRecord) {
        return res.status(404).json({ message: "Overtime record not found" });
      }
      
      const deleted = await storage.deleteOvertimeRecord(overtimeId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete overtime record" });
      }
      
      // Log activity
      const user = req.user as any;
      storage.createActivityLog({
        userId: user.id,
        action: "Delete Overtime Record",
        details: `Deleted overtime record for ${overtimeRecord.employeeName}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  // Deduction record routes
  app.get("/api/deductions", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, company, startDate, endDate } = req.query as { 
        employeeId?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
      };
      
      const filter: any = {};
      
      if (employeeId) filter.employeeId = parseInt(employeeId);
      if (company) filter.company = company;
      if (startDate) filter.startDate = new Date(startDate);
      if (endDate) filter.endDate = new Date(endDate);
      
      const deductionRecords = await storage.getDeductionRecords(filter);
      res.json(deductionRecords);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.get("/api/deductions/:id", isAuthenticated, async (req, res) => {
    try {
      const deductionId = parseInt(req.params.id);
      const deductionRecord = await storage.getDeductionRecord(deductionId);
      
      if (!deductionRecord) {
        return res.status(404).json({ message: "Deduction record not found" });
      }
      
      res.json(deductionRecord);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.post("/api/deductions", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDeductionRecordSchema.parse(req.body);
      const deductionRecord = await storage.createDeductionRecord(validatedData);
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(validatedData.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Create Deduction Record",
        details: `Created deduction record of ${validatedData.amount} for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.status(201).json(deductionRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.put("/api/deductions/:id", isAuthenticated, async (req, res) => {
    try {
      const deductionId = parseInt(req.params.id);
      const validatedData = insertDeductionRecordSchema.partial().parse(req.body);
      
      const updatedDeductionRecord = await storage.updateDeductionRecord(deductionId, validatedData);
      
      if (!updatedDeductionRecord) {
        return res.status(404).json({ message: "Deduction record not found" });
      }
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(updatedDeductionRecord.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Update Deduction Record",
        details: `Updated deduction record for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.json(updatedDeductionRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.delete("/api/deductions/:id", isAuthenticated, async (req, res) => {
    try {
      const deductionId = parseInt(req.params.id);
      const deductionRecord = await storage.getDeductionRecord(deductionId);
      
      if (!deductionRecord) {
        return res.status(404).json({ message: "Deduction record not found" });
      }
      
      const deleted = await storage.deleteDeductionRecord(deductionId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete deduction record" });
      }
      
      // Log activity
      const user = req.user as any;
      storage.createActivityLog({
        userId: user.id,
        action: "Delete Deduction Record",
        details: `Deleted deduction record for ${deductionRecord.employeeName}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  // Allowance record routes
  app.get("/api/allowances", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, company, startDate, endDate } = req.query as { 
        employeeId?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
      };
      
      const filter: any = {};
      
      if (employeeId) filter.employeeId = parseInt(employeeId);
      if (company) filter.company = company;
      if (startDate) filter.startDate = new Date(startDate);
      if (endDate) filter.endDate = new Date(endDate);
      
      const allowanceRecords = await storage.getAllowanceRecords(filter);
      res.json(allowanceRecords);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.get("/api/allowances/:id", isAuthenticated, async (req, res) => {
    try {
      const allowanceId = parseInt(req.params.id);
      const allowanceRecord = await storage.getAllowanceRecord(allowanceId);
      
      if (!allowanceRecord) {
        return res.status(404).json({ message: "Allowance record not found" });
      }
      
      res.json(allowanceRecord);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.post("/api/allowances", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAllowanceRecordSchema.parse(req.body);
      const allowanceRecord = await storage.createAllowanceRecord(validatedData);
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(validatedData.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Create Allowance Record",
        details: `Created allowance record of ${validatedData.amount} for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.status(201).json(allowanceRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.put("/api/allowances/:id", isAuthenticated, async (req, res) => {
    try {
      const allowanceId = parseInt(req.params.id);
      const validatedData = insertAllowanceRecordSchema.partial().parse(req.body);
      
      const updatedAllowanceRecord = await storage.updateAllowanceRecord(allowanceId, validatedData);
      
      if (!updatedAllowanceRecord) {
        return res.status(404).json({ message: "Allowance record not found" });
      }
      
      // Log activity
      const user = req.user as any;
      const employee = await storage.getEmployee(updatedAllowanceRecord.employeeId);
      storage.createActivityLog({
        userId: user.id,
        action: "Update Allowance Record",
        details: `Updated allowance record for ${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}`
      });
      
      res.json(updatedAllowanceRecord);
    } catch (error) {
      res.status(400).json({ message: handleZodError(error) });
    }
  });

  app.delete("/api/allowances/:id", isAuthenticated, async (req, res) => {
    try {
      const allowanceId = parseInt(req.params.id);
      const allowanceRecord = await storage.getAllowanceRecord(allowanceId);
      
      if (!allowanceRecord) {
        return res.status(404).json({ message: "Allowance record not found" });
      }
      
      const deleted = await storage.deleteAllowanceRecord(allowanceId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete allowance record" });
      }
      
      // Log activity
      const user = req.user as any;
      storage.createActivityLog({
        userId: user.id,
        action: "Delete Allowance Record",
        details: `Deleted allowance record for ${allowanceRecord.employeeName}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  // Dashboard data
  app.get("/api/dashboard", isAuthenticated, async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  // Activity logs
  app.get("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activityLogs = await storage.getActivityLogs(limit);
      res.json(activityLogs);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  // Report and export routes
  app.get("/api/export-records", isAuthenticated, async (req, res) => {
    try {
      const { company, userId } = req.query as { company?: string; userId?: string };
      const filter: any = {};
      
      if (company) filter.company = company;
      if (userId) filter.userId = parseInt(userId);
      
      const exportRecords = await storage.getExportRecords(filter);
      res.json(exportRecords);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.post("/api/exports", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertExportRecordSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      // Create export record
      const exportRecord = await storage.createExportRecord(validatedData);
      
      // Get data for the report
      const reportData = await storage.getReportData({
        company: validatedData.company,
        month: validatedData.month,
        includeLeave: validatedData.includeLeave,
        includeOvertime: validatedData.includeOvertime,
        includeDeductions: validatedData.includeDeductions,
        includeAllowances: validatedData.includeAllowances
      });
      
      // Generate Excel file
      const workbook = new ExcelJS.Workbook();
      workbook.creator = user.fullName;
      workbook.created = new Date();
      
      // Employees worksheet
      const employeesSheet = workbook.addWorksheet('Employees');
      employeesSheet.columns = [
        { header: 'Employee Code', key: 'employeeCode', width: 15 },
        { header: 'Full Name', key: 'fullName', width: 25 },
        { header: 'Company', key: 'company', width: 12 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Position', key: 'position', width: 20 },
        { header: 'Status', key: 'status', width: 12 }
      ];
      
      reportData.employees.forEach(employee => {
        employeesSheet.addRow({
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          company: employee.company,
          department: employee.department,
          position: employee.position,
          status: employee.status
        });
      });
      
      // Leave worksheet if included
      if (validatedData.includeLeave && reportData.leave.length > 0) {
        const leaveSheet = workbook.addWorksheet('Leave');
        leaveSheet.columns = [
          { header: 'Employee Code', key: 'employeeCode', width: 15 },
          { header: 'Employee Name', key: 'employeeName', width: 25 },
          { header: 'Leave Type', key: 'leaveType', width: 15 },
          { header: 'Start Date', key: 'startDate', width: 12 },
          { header: 'End Date', key: 'endDate', width: 12 },
          { header: 'Total Days', key: 'totalDays', width: 12 },
          { header: 'Status', key: 'status', width: 12 }
        ];
        
        for (const leave of reportData.leave) {
          const employee = reportData.employees.find(e => e.id === leave.employeeId);
          leaveSheet.addRow({
            employeeCode: employee?.employeeCode,
            employeeName: leave.employeeName,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            totalDays: leave.totalDays,
            status: leave.status
          });
        }
      }
      
      // Overtime worksheet if included
      if (validatedData.includeOvertime && reportData.overtime.length > 0) {
        const overtimeSheet = workbook.addWorksheet('Overtime');
        overtimeSheet.columns = [
          { header: 'Employee Code', key: 'employeeCode', width: 15 },
          { header: 'Employee Name', key: 'employeeName', width: 25 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Hours', key: 'hours', width: 10 },
          { header: 'Rate', key: 'rate', width: 10 },
          { header: 'Approved', key: 'approved', width: 10 }
        ];
        
        for (const overtime of reportData.overtime) {
          const employee = reportData.employees.find(e => e.id === overtime.employeeId);
          overtimeSheet.addRow({
            employeeCode: employee?.employeeCode,
            employeeName: overtime.employeeName,
            date: overtime.date,
            hours: overtime.hours,
            rate: overtime.rate,
            approved: overtime.approved ? 'Yes' : 'No'
          });
        }
      }
      
      // Deductions worksheet if included
      if (validatedData.includeDeductions && reportData.deductions.length > 0) {
        const deductionsSheet = workbook.addWorksheet('Deductions');
        deductionsSheet.columns = [
          { header: 'Employee Code', key: 'employeeCode', width: 15 },
          { header: 'Employee Name', key: 'employeeName', width: 25 },
          { header: 'Description', key: 'description', width: 25 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Recurring', key: 'recurring', width: 10 }
        ];
        
        for (const deduction of reportData.deductions) {
          const employee = reportData.employees.find(e => e.id === deduction.employeeId);
          deductionsSheet.addRow({
            employeeCode: employee?.employeeCode,
            employeeName: deduction.employeeName,
            description: deduction.description,
            amount: deduction.amount,
            date: deduction.date,
            recurring: deduction.recurring ? 'Yes' : 'No'
          });
        }
      }
      
      // Allowances worksheet if included
      if (validatedData.includeAllowances && reportData.allowances.length > 0) {
        const allowancesSheet = workbook.addWorksheet('Allowances');
        allowancesSheet.columns = [
          { header: 'Employee Code', key: 'employeeCode', width: 15 },
          { header: 'Employee Name', key: 'employeeName', width: 25 },
          { header: 'Description', key: 'description', width: 25 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Recurring', key: 'recurring', width: 10 }
        ];
        
        for (const allowance of reportData.allowances) {
          const employee = reportData.employees.find(e => e.id === allowance.employeeId);
          allowancesSheet.addRow({
            employeeCode: employee?.employeeCode,
            employeeName: allowance.employeeName,
            description: allowance.description,
            amount: allowance.amount,
            date: allowance.date,
            recurring: allowance.recurring ? 'Yes' : 'No'
          });
        }
      }
      
      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Log activity
      storage.createActivityLog({
        userId: user.id,
        action: "Generate Export",
        details: `Generated ${validatedData.reportName} for ${validatedData.company || 'All Companies'}`
      });
      
      // Send response with file content
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${validatedData.reportName.replace(/\s+/g, '_')}.xlsx`);
      res.send(buffer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: handleZodError(error) });
      }
      res.status(500).json({ message: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
