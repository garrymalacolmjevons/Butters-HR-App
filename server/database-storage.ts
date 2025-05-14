import { eq, and, gt, lt, desc, isNull, or, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users, employees, leaveRecords, overtimeRecords, deductionRecords,
  allowanceRecords, exportRecords, activityLogs,
  User, InsertUser, Employee, InsertEmployee,
  LeaveRecord, InsertLeaveRecord, OvertimeRecord, InsertOvertimeRecord,
  DeductionRecord, InsertDeductionRecord, AllowanceRecord, InsertAllowanceRecord,
  ExportRecord, InsertExportRecord, ActivityLog, InsertActivityLog,
  EmployeeWithFullName
} from "@shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Employee methods
  async getEmployees(filter?: { company?: string; department?: string; status?: string }): Promise<EmployeeWithFullName[]> {
    let query = db.select().from(employees);
    
    if (filter) {
      const conditions = [];
      
      if (filter.company) {
        conditions.push(eq(employees.company, filter.company));
      }
      
      if (filter.department) {
        conditions.push(eq(employees.department, filter.department));
      }
      
      if (filter.status) {
        conditions.push(eq(employees.status, filter.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    const results = await query;
    return results.map(employee => ({
      ...employee,
      fullName: `${employee.firstName} ${employee.lastName}`
    }));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByCode(code: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeCode, code));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee;
  }

  async bulkCreateOrUpdateEmployees(employeeList: InsertEmployee[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    
    for (const employee of employeeList) {
      const existingEmployee = await this.getEmployeeByCode(employee.employeeCode);
      
      if (existingEmployee) {
        await this.updateEmployee(existingEmployee.id, employee);
        updated++;
      } else {
        await this.createEmployee(employee);
        created++;
      }
    }
    
    return { created, updated };
  }

  // Leave Records methods
  async getLeaveRecords(filter?: {
    employeeId?: number;
    company?: string;
    leaveType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(LeaveRecord & { employeeName: string; company: string })[]> {
    // Construct the query with join to employees table
    let query = db.select({
      ...leaveRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(leaveRecords)
    .innerJoin(employees, eq(leaveRecords.employeeId, employees.id));
    
    // Apply filters
    if (filter) {
      const conditions = [];
      
      if (filter.employeeId !== undefined) {
        conditions.push(eq(leaveRecords.employeeId, filter.employeeId));
      }
      
      if (filter.company) {
        conditions.push(eq(employees.company, filter.company));
      }
      
      if (filter.leaveType) {
        conditions.push(eq(leaveRecords.leaveType, filter.leaveType));
      }
      
      if (filter.status) {
        conditions.push(eq(leaveRecords.status, filter.status));
      }
      
      if (filter.startDate) {
        conditions.push(gt(leaveRecords.startDate, filter.startDate.toISOString()));
      }
      
      if (filter.endDate) {
        conditions.push(lt(leaveRecords.endDate, filter.endDate.toISOString()));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    // Order by most recent
    query = query.orderBy(desc(leaveRecords.createdAt));
    
    return query;
  }

  async getLeaveRecord(id: number): Promise<(LeaveRecord & { employeeName: string; company: string }) | undefined> {
    const [record] = await db.select({
      ...leaveRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(leaveRecords)
    .innerJoin(employees, eq(leaveRecords.employeeId, employees.id))
    .where(eq(leaveRecords.id, id));
    
    return record;
  }

  async createLeaveRecord(leaveRecord: InsertLeaveRecord): Promise<LeaveRecord> {
    const [newRecord] = await db.insert(leaveRecords).values(leaveRecord).returning();
    return newRecord;
  }

  async updateLeaveRecord(id: number, leaveRecord: Partial<InsertLeaveRecord>): Promise<LeaveRecord | undefined> {
    const [updatedRecord] = await db
      .update(leaveRecords)
      .set(leaveRecord)
      .where(eq(leaveRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async deleteLeaveRecord(id: number): Promise<boolean> {
    const result = await db.delete(leaveRecords).where(eq(leaveRecords.id, id)).returning();
    return result.length > 0;
  }

  // Overtime Records methods
  async getOvertimeRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(OvertimeRecord & { employeeName: string; company: string })[]> {
    let query = db.select({
      ...overtimeRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(overtimeRecords)
    .innerJoin(employees, eq(overtimeRecords.employeeId, employees.id));
    
    if (filter) {
      const conditions = [];
      
      if (filter.employeeId !== undefined) {
        conditions.push(eq(overtimeRecords.employeeId, filter.employeeId));
      }
      
      if (filter.company) {
        conditions.push(eq(employees.company, filter.company));
      }
      
      if (filter.startDate) {
        conditions.push(gt(overtimeRecords.date, filter.startDate.toISOString()));
      }
      
      if (filter.endDate) {
        conditions.push(lt(overtimeRecords.date, filter.endDate.toISOString()));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    query = query.orderBy(desc(overtimeRecords.createdAt));
    
    return query;
  }

  async getOvertimeRecord(id: number): Promise<(OvertimeRecord & { employeeName: string; company: string }) | undefined> {
    const [record] = await db.select({
      ...overtimeRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(overtimeRecords)
    .innerJoin(employees, eq(overtimeRecords.employeeId, employees.id))
    .where(eq(overtimeRecords.id, id));
    
    return record;
  }

  async createOvertimeRecord(overtimeRecord: InsertOvertimeRecord): Promise<OvertimeRecord> {
    const [newRecord] = await db.insert(overtimeRecords).values(overtimeRecord).returning();
    return newRecord;
  }

  async updateOvertimeRecord(id: number, overtimeRecord: Partial<InsertOvertimeRecord>): Promise<OvertimeRecord | undefined> {
    const [updatedRecord] = await db
      .update(overtimeRecords)
      .set(overtimeRecord)
      .where(eq(overtimeRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async deleteOvertimeRecord(id: number): Promise<boolean> {
    const result = await db.delete(overtimeRecords).where(eq(overtimeRecords.id, id)).returning();
    return result.length > 0;
  }

  // Deduction Records methods
  async getDeductionRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(DeductionRecord & { employeeName: string; company: string })[]> {
    let query = db.select({
      ...deductionRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(deductionRecords)
    .innerJoin(employees, eq(deductionRecords.employeeId, employees.id));
    
    if (filter) {
      const conditions = [];
      
      if (filter.employeeId !== undefined) {
        conditions.push(eq(deductionRecords.employeeId, filter.employeeId));
      }
      
      if (filter.company) {
        conditions.push(eq(employees.company, filter.company));
      }
      
      if (filter.startDate) {
        conditions.push(gt(deductionRecords.date, filter.startDate.toISOString()));
      }
      
      if (filter.endDate) {
        conditions.push(lt(deductionRecords.date, filter.endDate.toISOString()));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    query = query.orderBy(desc(deductionRecords.createdAt));
    
    return query;
  }

  async getDeductionRecord(id: number): Promise<(DeductionRecord & { employeeName: string; company: string }) | undefined> {
    const [record] = await db.select({
      ...deductionRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(deductionRecords)
    .innerJoin(employees, eq(deductionRecords.employeeId, employees.id))
    .where(eq(deductionRecords.id, id));
    
    return record;
  }

  async createDeductionRecord(deductionRecord: InsertDeductionRecord): Promise<DeductionRecord> {
    const [newRecord] = await db.insert(deductionRecords).values(deductionRecord).returning();
    return newRecord;
  }

  async updateDeductionRecord(id: number, deductionRecord: Partial<InsertDeductionRecord>): Promise<DeductionRecord | undefined> {
    const [updatedRecord] = await db
      .update(deductionRecords)
      .set(deductionRecord)
      .where(eq(deductionRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async deleteDeductionRecord(id: number): Promise<boolean> {
    const result = await db.delete(deductionRecords).where(eq(deductionRecords.id, id)).returning();
    return result.length > 0;
  }

  // Allowance Records methods
  async getAllowanceRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(AllowanceRecord & { employeeName: string; company: string })[]> {
    let query = db.select({
      ...allowanceRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(allowanceRecords)
    .innerJoin(employees, eq(allowanceRecords.employeeId, employees.id));
    
    if (filter) {
      const conditions = [];
      
      if (filter.employeeId !== undefined) {
        conditions.push(eq(allowanceRecords.employeeId, filter.employeeId));
      }
      
      if (filter.company) {
        conditions.push(eq(employees.company, filter.company));
      }
      
      if (filter.startDate) {
        conditions.push(gt(allowanceRecords.date, filter.startDate.toISOString()));
      }
      
      if (filter.endDate) {
        conditions.push(lt(allowanceRecords.date, filter.endDate.toISOString()));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    query = query.orderBy(desc(allowanceRecords.createdAt));
    
    return query;
  }

  async getAllowanceRecord(id: number): Promise<(AllowanceRecord & { employeeName: string; company: string }) | undefined> {
    const [record] = await db.select({
      ...allowanceRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      company: employees.company
    })
    .from(allowanceRecords)
    .innerJoin(employees, eq(allowanceRecords.employeeId, employees.id))
    .where(eq(allowanceRecords.id, id));
    
    return record;
  }

  async createAllowanceRecord(allowanceRecord: InsertAllowanceRecord): Promise<AllowanceRecord> {
    const [newRecord] = await db.insert(allowanceRecords).values(allowanceRecord).returning();
    return newRecord;
  }

  async updateAllowanceRecord(id: number, allowanceRecord: Partial<InsertAllowanceRecord>): Promise<AllowanceRecord | undefined> {
    const [updatedRecord] = await db
      .update(allowanceRecords)
      .set(allowanceRecord)
      .where(eq(allowanceRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async deleteAllowanceRecord(id: number): Promise<boolean> {
    const result = await db.delete(allowanceRecords).where(eq(allowanceRecords.id, id)).returning();
    return result.length > 0;
  }

  // Export Records methods
  async getExportRecords(filter?: { company?: string; userId?: number }): Promise<(ExportRecord & { userName: string })[]> {
    let query = db.select({
      ...exportRecords,
      userName: users.fullName
    })
    .from(exportRecords)
    .innerJoin(users, eq(exportRecords.createdBy, users.id));
    
    if (filter) {
      const conditions = [];
      
      if (filter.company) {
        conditions.push(eq(exportRecords.company, filter.company));
      }
      
      if (filter.userId !== undefined) {
        conditions.push(eq(exportRecords.createdBy, filter.userId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    query = query.orderBy(desc(exportRecords.createdAt));
    
    return query;
  }

  async createExportRecord(exportRecord: InsertExportRecord): Promise<ExportRecord> {
    const [newRecord] = await db.insert(exportRecords).values(exportRecord).returning();
    return newRecord;
  }

  // Activity Logs methods
  async getActivityLogs(limit: number = 10): Promise<(ActivityLog & { userName: string })[]> {
    const query = db.select({
      ...activityLogs,
      userName: users.fullName
    })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
    
    return query;
  }

  async createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(activityLog).returning();
    return newLog;
  }

  // Dashboard data
  async getDashboardData(): Promise<{
    employeeCounts: { total: number; butters: number; makana: number };
    pendingLeave: { total: number; butters: number; makana: number };
    overtimeHours: { total: number; butters: number; makana: number };
    lastUpdated: Date;
  }> {
    // Total employee counts
    const [totalEmployeesResult] = await db
      .select({ 
        total: count(), 
        butters: count(
          and(eq(employees.company, 'Butters'))
        ),
        makana: count(
          and(eq(employees.company, 'Makana'))
        )
      })
      .from(employees);

    // Pending leave counts
    const [pendingLeaveResult] = await db
      .select({
        total: count(),
        butters: count(
          and(eq(employees.company, 'Butters'))
        ),
        makana: count(
          and(eq(employees.company, 'Makana'))
        )
      })
      .from(leaveRecords)
      .innerJoin(employees, eq(leaveRecords.employeeId, employees.id))
      .where(eq(leaveRecords.status, 'Pending'));

    // Overtime hours
    const [totalOvertimeResult] = await db
      .select({
        total: sql<number>`sum(${overtimeRecords.hours})`,
        butters: sql<number>`sum(case when ${employees.company} = 'Butters' then ${overtimeRecords.hours} else 0 end)`,
        makana: sql<number>`sum(case when ${employees.company} = 'Makana' then ${overtimeRecords.hours} else 0 end)`
      })
      .from(overtimeRecords)
      .innerJoin(employees, eq(overtimeRecords.employeeId, employees.id));

    const employeeCounts = {
      total: totalEmployeesResult.total || 0,
      butters: totalEmployeesResult.butters || 0,
      makana: totalEmployeesResult.makana || 0
    };

    const pendingLeave = {
      total: pendingLeaveResult.total || 0,
      butters: pendingLeaveResult.butters || 0,
      makana: pendingLeaveResult.makana || 0
    };

    const overtimeHours = {
      total: Number(totalOvertimeResult.total) || 0,
      butters: Number(totalOvertimeResult.butters) || 0,
      makana: Number(totalOvertimeResult.makana) || 0
    };

    return {
      employeeCounts,
      pendingLeave,
      overtimeHours,
      lastUpdated: new Date()
    };
  }

  // Report data for exports
  async getReportData(options: {
    company?: string;
    month: Date;
    includeLeave: boolean;
    includeOvertime: boolean;
    includeDeductions: boolean;
    includeAllowances: boolean;
  }): Promise<{
    employees: EmployeeWithFullName[];
    leave: (LeaveRecord & { employeeName: string })[];
    overtime: (OvertimeRecord & { employeeName: string })[];
    deductions: (DeductionRecord & { employeeName: string })[];
    allowances: (AllowanceRecord & { employeeName: string })[];
  }> {
    // Get the start and end of the month
    const startOfMonth = new Date(options.month.getFullYear(), options.month.getMonth(), 1);
    const endOfMonth = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0);
    
    // Query employees
    let employeeQuery = db.select().from(employees);
    if (options.company) {
      employeeQuery = employeeQuery.where(eq(employees.company, options.company));
    }
    const employeesList = await employeeQuery;
    const employeesWithFullName = employeesList.map(employee => ({
      ...employee,
      fullName: `${employee.firstName} ${employee.lastName}`
    }));
    
    // Prepare results structure
    const result: {
      employees: EmployeeWithFullName[];
      leave: (LeaveRecord & { employeeName: string })[];
      overtime: (OvertimeRecord & { employeeName: string })[];
      deductions: (DeductionRecord & { employeeName: string })[];
      allowances: (AllowanceRecord & { employeeName: string })[];
    } = {
      employees: employeesWithFullName,
      leave: [],
      overtime: [],
      deductions: [],
      allowances: []
    };
    
    // Query leave records if requested
    if (options.includeLeave) {
      let leaveQuery = db.select({
        ...leaveRecords,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(leaveRecords)
      .innerJoin(employees, eq(leaveRecords.employeeId, employees.id))
      .where(
        and(
          options.company ? eq(employees.company, options.company) : undefined,
          gt(leaveRecords.startDate, startOfMonth.toISOString()),
          lt(leaveRecords.endDate, endOfMonth.toISOString())
        )
      );
      
      result.leave = await leaveQuery;
    }
    
    // Query overtime records if requested
    if (options.includeOvertime) {
      let overtimeQuery = db.select({
        ...overtimeRecords,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(overtimeRecords)
      .innerJoin(employees, eq(overtimeRecords.employeeId, employees.id))
      .where(
        and(
          options.company ? eq(employees.company, options.company) : undefined,
          gt(overtimeRecords.date, startOfMonth.toISOString()),
          lt(overtimeRecords.date, endOfMonth.toISOString())
        )
      );
      
      result.overtime = await overtimeQuery;
    }
    
    // Query deduction records if requested
    if (options.includeDeductions) {
      let deductionQuery = db.select({
        ...deductionRecords,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(deductionRecords)
      .innerJoin(employees, eq(deductionRecords.employeeId, employees.id))
      .where(
        and(
          options.company ? eq(employees.company, options.company) : undefined,
          gt(deductionRecords.date, startOfMonth.toISOString()),
          lt(deductionRecords.date, endOfMonth.toISOString())
        )
      );
      
      result.deductions = await deductionQuery;
    }
    
    // Query allowance records if requested
    if (options.includeAllowances) {
      let allowanceQuery = db.select({
        ...allowanceRecords,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(allowanceRecords)
      .innerJoin(employees, eq(allowanceRecords.employeeId, employees.id))
      .where(
        and(
          options.company ? eq(employees.company, options.company) : undefined,
          gt(allowanceRecords.date, startOfMonth.toISOString()),
          lt(allowanceRecords.date, endOfMonth.toISOString())
        )
      );
      
      result.allowances = await allowanceQuery;
    }
    
    return result;
  }
}