import { eq, and, gt, lt, gte, lte, desc, isNull, or, sql, count, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users, employees, payrollRecords, recurringDeductions, exportRecords, emailSettings, activityLogs, overtimeRates,
  insurancePolicies, policyPayments, policyExports,
  User, InsertUser, Employee, InsertEmployee,
  PayrollRecord, InsertPayrollRecord, RecurringDeduction, InsertRecurringDeduction,
  ExportRecord, InsertExportRecord, EmailSettings, InsertEmailSettings, 
  ActivityLog, InsertActivityLog, OvertimeRate, InsertOvertimeRate, EmployeeWithFullName,
  InsurancePolicy, InsertInsurancePolicy, PolicyPayment, InsertPolicyPayment, PolicyExport, InsertPolicyExport
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
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return !!result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Employee methods
  async getEmployees(filter?: { department?: string; status?: string }): Promise<EmployeeWithFullName[]> {
    try {
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
      
      return results.map(emp => {
        // Add the VIP code fields with defaults if they don't exist
        return {
          ...emp,
          fullName: `${emp.firstName} ${emp.lastName}`,
          vipCode: emp.vipCode || null,
          vipCodeRequested: emp.vipCodeRequested || false,
          vipCodeRequestDate: emp.vipCodeRequestDate || null,
          vipCodeStatus: emp.vipCodeStatus || 'Not Requested'
        };
      });
    } catch (error) {
      // Handle case where vip_code columns don't exist yet
      if (error.message && error.message.includes('column "vip_code" does not exist')) {
        console.error("VIP code columns don't exist in the database yet. Using select with specific columns.");
        
        // Query with only the columns we know exist
        let query = db.select({
          id: employees.id,
          employeeCode: employees.employeeCode,
          firstName: employees.firstName,
          lastName: employees.lastName,
          department: employees.department,
          position: employees.position,
          email: employees.email,
          status: employees.status,
          dateJoined: employees.dateJoined
        }).from(employees);
        
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
        
        // Add fullName and missing VIP fields
        return results.map(emp => ({
          ...emp,
          fullName: `${emp.firstName} ${emp.lastName}`,
          vipCode: null,
          vipCodeRequested: false,
          vipCodeRequestDate: null,
          vipCodeStatus: 'Not Requested'
        }));
      }
      
      // Re-throw any other errors
      throw error;
    }
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
    .leftJoin(users, eq(exportRecords.userId, users.id));
    
    if (filter?.userId) {
      return await exportWithUserQuery.where(eq(exportRecords.userId, filter.userId));
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
    policyValueTotal: number;
    monthlyEarnings: number;
    totalDeductions: number;
  }> {
    // Get count of all employees
    const [employeeResult] = await db.select({
      count: count()
    }).from(employees);
    
    // Get sum of all active policy values
    const [policyValueResult] = await db.select({
      total: sql<number>`sum(${insurancePolicies.amount})`
    })
    .from(insurancePolicies)
    .where(eq(insurancePolicies.status, 'Active'));
    
    // Get current month date range
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Get sum of all earnings for the current month
    const earningTypes = ['Overtime', 'Commission', 'Special Shift', 'Escort Allowance', 'Standby Shift'];
    const [earningsResult] = await db.select({
      total: sql<number>`sum(${payrollRecords.amount})`
    })
    .from(payrollRecords)
    .where(
      and(
        inArray(payrollRecords.recordType, earningTypes),
        gte(payrollRecords.date, startOfMonth),
        lte(payrollRecords.date, endOfMonth)
      )
    );
    
    // Get sum of all deductions for the current month
    const deductionTypes = ['Deduction', 'Loan', 'Advance'];
    const [deductionsResult] = await db.select({
      total: sql<number>`sum(${payrollRecords.amount})`
    })
    .from(payrollRecords)
    .where(
      and(
        inArray(payrollRecords.recordType, deductionTypes),
        gte(payrollRecords.date, startOfMonth),
        lte(payrollRecords.date, endOfMonth)
      )
    );
    
    return {
      employeeCount: Number(employeeResult?.count || 0),
      policyValueTotal: Number(policyValueResult?.total || 0),
      monthlyEarnings: Number(earningsResult?.total || 0),
      totalDeductions: Number(deductionsResult?.total || 0)
    };
  }

  // Overtime Rates methods
  async getOvertimeRates(): Promise<OvertimeRate[]> {
    return await db.select().from(overtimeRates).orderBy(overtimeRates.overtimeType);
  }
  
  async getOvertimeRate(id: number): Promise<OvertimeRate | undefined> {
    const [rate] = await db.select().from(overtimeRates).where(eq(overtimeRates.id, id));
    return rate;
  }
  
  async getOvertimeRateByType(overtimeType: string): Promise<OvertimeRate | undefined> {
    const [rate] = await db.select().from(overtimeRates).where(eq(overtimeRates.overtimeType, overtimeType));
    return rate;
  }
  
  async createOvertimeRate(overtimeRate: InsertOvertimeRate): Promise<OvertimeRate> {
    const [newRate] = await db.insert(overtimeRates)
      .values({
        ...overtimeRate,
        updatedAt: new Date()
      })
      .returning();
    return newRate;
  }
  
  async updateOvertimeRate(id: number, overtimeRate: Partial<InsertOvertimeRate>): Promise<OvertimeRate | undefined> {
    const [updatedRate] = await db.update(overtimeRates)
      .set({
        ...overtimeRate,
        updatedAt: new Date()
      })
      .where(eq(overtimeRates.id, id))
      .returning();
    return updatedRate;
  }
  
  async deleteOvertimeRate(id: number): Promise<boolean> {
    const result = await db.delete(overtimeRates)
      .where(eq(overtimeRates.id, id));
    return result.rowCount > 0;
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

  // Recurring Deductions methods
  async getRecurringDeductions(filter?: { 
    employeeId?: number;
    deductionName?: string;
  }): Promise<(RecurringDeduction & { employeeName: string })[]> {
    const query = db.select({
      ...recurringDeductions,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
    })
    .from(recurringDeductions)
    .leftJoin(employees, eq(recurringDeductions.employeeId, employees.id))
    .orderBy(desc(recurringDeductions.createdAt));
    
    // Apply filters
    if (filter) {
      const conditions = [];
      
      if (filter.employeeId) {
        conditions.push(eq(recurringDeductions.employeeId, filter.employeeId));
      }
      
      if (filter.deductionName) {
        conditions.push(eq(recurringDeductions.deductionName, filter.deductionName));
      }
      
      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }
    }
    
    return await query;
  }

  async getRecurringDeduction(id: number): Promise<(RecurringDeduction & { employeeName: string }) | undefined> {
    const [result] = await db.select({
      ...recurringDeductions,
      employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`
    })
    .from(recurringDeductions)
    .leftJoin(employees, eq(recurringDeductions.employeeId, employees.id))
    .where(eq(recurringDeductions.id, id));
    
    return result;
  }

  async createRecurringDeduction(deduction: InsertRecurringDeduction): Promise<RecurringDeduction> {
    const [result] = await db
      .insert(recurringDeductions)
      .values({
        ...deduction,
        createdAt: new Date()
      })
      .returning();
    
    return result;
  }

  async updateRecurringDeduction(id: number, deduction: Partial<InsertRecurringDeduction>): Promise<RecurringDeduction | undefined> {
    const [result] = await db
      .update(recurringDeductions)
      .set(deduction)
      .where(eq(recurringDeductions.id, id))
      .returning();
    
    return result;
  }

  async deleteRecurringDeduction(id: number): Promise<boolean> {
    const result = await db
      .delete(recurringDeductions)
      .where(eq(recurringDeductions.id, id));
    
    return result.rowCount > 0;
  }

  // Insurance Policy methods
  async getInsurancePolicies(filter?: {
    employeeId?: number;
    company?: string;
    status?: string;
  }): Promise<(InsurancePolicy & { employeeName: string })[]> {
    let query = db
      .select({
        ...insurancePolicies,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(insurancePolicies)
      .leftJoin(employees, eq(insurancePolicies.employeeId, employees.id))
      .orderBy(desc(insurancePolicies.updatedAt));
    
    if (filter) {
      if (filter.employeeId !== undefined) {
        query = query.where(eq(insurancePolicies.employeeId, filter.employeeId));
      }
      
      if (filter.company !== undefined) {
        query = query.where(eq(insurancePolicies.company, filter.company));
      }
      
      if (filter.status !== undefined) {
        query = query.where(eq(insurancePolicies.status, filter.status));
      }
    }
    
    return await query;
  }
  
  async getInsurancePolicy(id: number): Promise<(InsurancePolicy & { employeeName: string }) | undefined> {
    const [result] = await db
      .select({
        ...insurancePolicies,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(insurancePolicies)
      .leftJoin(employees, eq(insurancePolicies.employeeId, employees.id))
      .where(eq(insurancePolicies.id, id));
    
    return result;
  }
  
  async createInsurancePolicy(policy: InsertInsurancePolicy): Promise<InsurancePolicy> {
    const [result] = await db
      .insert(insurancePolicies)
      .values({
        ...policy,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return result;
  }
  
  async updateInsurancePolicy(id: number, policy: Partial<InsertInsurancePolicy>): Promise<InsurancePolicy | undefined> {
    const [result] = await db
      .update(insurancePolicies)
      .set({
        ...policy,
        updatedAt: new Date()
      })
      .where(eq(insurancePolicies.id, id))
      .returning();
    
    return result;
  }
  
  async deleteInsurancePolicy(id: number): Promise<boolean> {
    const result = await db
      .delete(insurancePolicies)
      .where(eq(insurancePolicies.id, id));
    
    return result.rowCount > 0;
  }
  
  // Policy Payments methods
  async getPolicyPayments(filter?: {
    policyId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(PolicyPayment & { policyNumber: string, employeeName: string })[]> {
    let query = db
      .select({
        ...policyPayments,
        policyNumber: insurancePolicies.policyNumber,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(policyPayments)
      .leftJoin(insurancePolicies, eq(policyPayments.policyId, insurancePolicies.id))
      .leftJoin(employees, eq(insurancePolicies.employeeId, employees.id))
      .orderBy(desc(policyPayments.createdAt));
    
    if (filter) {
      if (filter.policyId !== undefined) {
        query = query.where(eq(policyPayments.policyId, filter.policyId));
      }
      
      if (filter.startDate !== undefined) {
        query = query.where(gte(policyPayments.paymentDate, filter.startDate));
      }
      
      if (filter.endDate !== undefined) {
        query = query.where(lte(policyPayments.paymentDate, filter.endDate));
      }
    }
    
    return await query;
  }
  
  async getPolicyPayment(id: number): Promise<PolicyPayment | undefined> {
    const [result] = await db
      .select()
      .from(policyPayments)
      .where(eq(policyPayments.id, id));
    
    return result;
  }
  
  async createPolicyPayment(payment: InsertPolicyPayment): Promise<PolicyPayment> {
    const [result] = await db
      .insert(policyPayments)
      .values({
        ...payment,
        createdAt: new Date()
      })
      .returning();
    
    return result;
  }
  
  async updatePolicyPayment(id: number, payment: Partial<InsertPolicyPayment>): Promise<PolicyPayment | undefined> {
    const [result] = await db
      .update(policyPayments)
      .set(payment)
      .where(eq(policyPayments.id, id))
      .returning();
    
    return result;
  }
  
  async deletePolicyPayment(id: number): Promise<boolean> {
    const result = await db
      .delete(policyPayments)
      .where(eq(policyPayments.id, id));
    
    return result.rowCount > 0;
  }
  
  // Policy Exports methods
  async getPolicyExports(filter?: { userId?: number, company?: string }): Promise<(PolicyExport & { userName: string })[]> {
    let query = db
      .select({
        ...policyExports,
        userName: users.fullName
      })
      .from(policyExports)
      .leftJoin(users, eq(policyExports.createdBy, users.id))
      .orderBy(desc(policyExports.createdAt));
    
    if (filter) {
      if (filter.userId !== undefined) {
        query = query.where(eq(policyExports.createdBy, filter.userId));
      }
      
      if (filter.company !== undefined) {
        query = query.where(eq(policyExports.company, filter.company));
      }
    }
    
    return await query;
  }
  
  async createPolicyExport(policyExport: InsertPolicyExport): Promise<PolicyExport> {
    const [result] = await db
      .insert(policyExports)
      .values({
        ...policyExport,
        createdAt: new Date()
      })
      .returning();
    
    return result;
  }
  
  // Policy Reports
  async getPolicyReportData(options: {
    month: Date;
    company?: string;
  }): Promise<{
    policies: (InsurancePolicy & { employeeName: string })[];
    payments: (PolicyPayment & { policyNumber: string, employeeName: string })[];
  }> {
    // Get policies
    let policiesQuery = db
      .select({
        ...insurancePolicies,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(insurancePolicies)
      .leftJoin(employees, eq(insurancePolicies.employeeId, employees.id))
      .where(eq(insurancePolicies.status, 'Active'));
    
    if (options.company) {
      policiesQuery = policiesQuery.where(eq(insurancePolicies.company, options.company));
    }
    
    const policies = await policiesQuery;
    
    // Start of month and end of month dates for filtering payments
    const startOfMonth = new Date(options.month.getFullYear(), options.month.getMonth(), 1);
    const endOfMonth = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0);
    
    // Get payments for the month
    let paymentsQuery = db
      .select({
        ...policyPayments,
        policyNumber: insurancePolicies.policyNumber,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`
      })
      .from(policyPayments)
      .leftJoin(insurancePolicies, eq(policyPayments.policyId, insurancePolicies.id))
      .leftJoin(employees, eq(insurancePolicies.employeeId, employees.id))
      .where(and(
        gte(policyPayments.paymentDate, startOfMonth),
        lte(policyPayments.paymentDate, endOfMonth)
      ));
    
    if (options.company) {
      paymentsQuery = paymentsQuery.where(eq(insurancePolicies.company, options.company));
    }
    
    const payments = await paymentsQuery;
    
    return {
      policies,
      payments
    };
  }
  
  // Get report data for payroll exports
  async getReportData(options: {
    startDate: Date;
    endDate: Date;
    recordType?: string;
    includeUnapproved?: boolean;
  }) {
    const { startDate, endDate, recordType, includeUnapproved = false } = options;
    
    // Build query based on options
    let query = db
      .select({
        ...payrollRecords,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        employeeCode: employees.employeeCode
      })
      .from(payrollRecords)
      .leftJoin(employees, eq(payrollRecords.employeeId, employees.id))
      .where(and(
        gte(payrollRecords.date, startDate),
        lte(payrollRecords.date, endDate)
      ));
    
    // Filter by record type if provided
    if (recordType) {
      if (recordType === 'earnings') {
        // For 'earnings', include all earning types
        const earningTypes = ['Overtime', 'Commission', 'Special Shift', 'Escort Allowance'];
        query = query.where(inArray(payrollRecords.recordType, earningTypes));
      } else if (recordType !== 'all') {
        // For specific record type
        query = query.where(eq(payrollRecords.recordType, recordType));
      }
    }
    
    // Include only approved records unless includeUnapproved is true
    if (!includeUnapproved) {
      query = query.where(eq(payrollRecords.approved, true));
    }
    
    // Order by employee name and date
    query = query.orderBy(
      sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      payrollRecords.date
    );
    
    return await query;
  }
}