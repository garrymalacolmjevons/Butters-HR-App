import { eq, and, gt, lt, desc, isNull, or, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users, employees, payrollRecords, exportRecords, emailSettings, activityLogs,
  User, InsertUser, Employee, InsertEmployee,
  PayrollRecord, InsertPayrollRecord, ExportRecord, InsertExportRecord, 
  EmailSettings, InsertEmailSettings, ActivityLog, InsertActivityLog,
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
  async getEmployees(filter?: { department?: string; status?: string }): Promise<EmployeeWithFullName[]> {
    let query = db.select().from(employees);
    
    if (filter) {
      const conditions = [];
      
      if (filter.department && filter.department !== 'All Departments') {
        conditions.push(eq(employees.department, filter.department));
      }
      
      if (filter.status && filter.status !== 'All Status') {
        conditions.push(eq(employees.status, filter.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    const results = await query;
    
    return results.map(emp => ({
      ...emp,
      fullName: `${emp.firstName} ${emp.lastName}`
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
    const [newEmployee] = await db.insert(employees)
      .values({
        ...employee,
        dateJoined: new Date()
      })
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db.update(employees)
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

  // Payroll Records methods
  async getPayrollRecords(filter?: { 
    employeeId?: number;
    recordType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(PayrollRecord & { employeeName: string })[]> {
    const payrollWithEmployeeQuery = db.select({
      ...payrollRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
    })
    .from(payrollRecords)
    .leftJoin(employees, eq(payrollRecords.employeeId, employees.id));
    
    if (filter) {
      const conditions = [];
      
      if (filter.employeeId) {
        conditions.push(eq(payrollRecords.employeeId, filter.employeeId));
      }
      
      if (filter.recordType) {
        conditions.push(eq(payrollRecords.recordType, filter.recordType));
      }
      
      if (filter.status) {
        conditions.push(eq(payrollRecords.status, filter.status));
      }
      
      if (filter.startDate && filter.endDate) {
        conditions.push(
          and(
            gt(payrollRecords.date, filter.startDate),
            lt(payrollRecords.date, filter.endDate)
          )
        );
      }
      
      if (conditions.length > 0) {
        return await payrollWithEmployeeQuery.where(and(...conditions));
      }
    }
    
    return await payrollWithEmployeeQuery;
  }

  async getPayrollRecord(id: number): Promise<(PayrollRecord & { employeeName: string }) | undefined> {
    const [record] = await db.select({
      ...payrollRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
    })
    .from(payrollRecords)
    .leftJoin(employees, eq(payrollRecords.employeeId, employees.id))
    .where(eq(payrollRecords.id, id));
    
    return record;
  }

  async createPayrollRecord(payrollRecord: InsertPayrollRecord): Promise<PayrollRecord> {
    const [newRecord] = await db.insert(payrollRecords)
      .values({
        ...payrollRecord,
        createdAt: new Date()
      })
      .returning();
    return newRecord;
  }

  async updatePayrollRecord(id: number, payrollRecord: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined> {
    const [updatedRecord] = await db.update(payrollRecords)
      .set(payrollRecord)
      .where(eq(payrollRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async deletePayrollRecord(id: number): Promise<boolean> {
    const result = await db.delete(payrollRecords)
      .where(eq(payrollRecords.id, id));
    return result.rowCount > 0;
  }
  
  // Email Settings methods
  async getEmailSettings(): Promise<EmailSettings | undefined> {
    const [settings] = await db.select().from(emailSettings);
    return settings;
  }
  
  async saveEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    const existing = await this.getEmailSettings();
    
    if (existing) {
      const [updated] = await db.update(emailSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(emailSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db.insert(emailSettings)
        .values({
          ...settings,
          updatedAt: new Date()
        })
        .returning();
      return newSettings;
    }
  }

  // Export Records methods
  async getExportRecords(filter?: { userId?: number }): Promise<(ExportRecord & { userName: string })[]> {
    const exportWithUserQuery = db.select({
      ...exportRecords,
      userName: users.fullName
    })
    .from(exportRecords)
    .leftJoin(users, eq(exportRecords.createdBy, users.id));
    
    if (filter?.userId) {
      return await exportWithUserQuery.where(eq(exportRecords.createdBy, filter.userId));
    }
    
    return await exportWithUserQuery;
  }

  async createExportRecord(exportRecord: InsertExportRecord): Promise<ExportRecord> {
    const [newRecord] = await db.insert(exportRecords)
      .values({
        ...exportRecord,
        createdAt: new Date()
      })
      .returning();
    return newRecord;
  }

  // Activity Logs methods
  async getActivityLogs(limit: number = 10): Promise<(ActivityLog & { userName: string })[]> {
    const logs = await db.select({
      ...activityLogs,
      userName: users.fullName
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
    
    return logs;
  }

  async createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs)
      .values({
        ...activityLog,
        timestamp: new Date()
      })
      .returning();
    return newLog;
  }

  // Dashboard data
  async getDashboardData(): Promise<{
    employeeCount: number;
    pendingLeaveCount: number;
    overtimeHours: number;
    lastUpdated: Date;
  }> {
    // Get count of all employees
    const [employeeResult] = await db.select({
      count: count()
    }).from(employees);
    
    // Get count of pending leave records
    const [leaveResult] = await db.select({
      count: count()
    })
    .from(payrollRecords)
    .where(
      and(
        eq(payrollRecords.recordType, 'Leave'),
        eq(payrollRecords.status, 'Pending')
      )
    );
    
    // Get sum of overtime hours
    const [overtimeResult] = await db.select({
      total: sql<number>`sum(${payrollRecords.hours})`
    })
    .from(payrollRecords)
    .where(eq(payrollRecords.recordType, 'Overtime'));
    
    return {
      employeeCount: Number(employeeResult?.count || 0),
      pendingLeaveCount: Number(leaveResult?.count || 0),
      overtimeHours: Number(overtimeResult?.total || 0),
      lastUpdated: new Date()
    };
  }

  // Report data for exports
  async getReportData(options: {
    month: Date;
    includeRecordTypes: string[];
  }): Promise<{
    employees: EmployeeWithFullName[];
    payrollRecords: (PayrollRecord & { employeeName: string })[];
  }> {
    // Get active employees
    const employees = await this.getEmployees({ status: 'Active' });
    
    // Create date range for the month
    const startDate = new Date(options.month.getFullYear(), options.month.getMonth(), 1);
    const endDate = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0);
    
    // Get payroll records for the month with requested record types
    const recordsQuery = db.select({
      ...payrollRecords,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
    })
    .from(payrollRecords)
    .leftJoin(employees, eq(payrollRecords.employeeId, employees.id))
    .where(
      and(
        gt(payrollRecords.date, startDate),
        lt(payrollRecords.date, endDate)
      )
    );
    
    let payrollRecordsResult: (PayrollRecord & { employeeName: string })[] = [];
    
    if (options.includeRecordTypes.length > 0) {
      const recordsWithTypes = await recordsQuery.where(
        sql`${payrollRecords.recordType} = ANY(${options.includeRecordTypes})`
      );
      payrollRecordsResult = recordsWithTypes;
    }
    
    return {
      employees,
      payrollRecords: payrollRecordsResult
    };
  }
}