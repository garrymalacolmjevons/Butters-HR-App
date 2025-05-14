import { 
  User, InsertUser, Employee, InsertEmployee,
  PayrollRecord, InsertPayrollRecord, ExportRecord, InsertExportRecord,
  EmailSettings, InsertEmailSettings, ActivityLog, InsertActivityLog,
  OvertimeRate, InsertOvertimeRate, EmployeeWithFullName
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Employees
  getEmployees(filter?: { department?: string; status?: string }): Promise<EmployeeWithFullName[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByCode(code: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  bulkCreateOrUpdateEmployees(employees: InsertEmployee[]): Promise<{ created: number; updated: number }>;
  
  // Payroll Records
  getPayrollRecords(filter?: { 
    employeeId?: number;
    recordType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(PayrollRecord & { employeeName: string })[]>;
  getPayrollRecord(id: number): Promise<(PayrollRecord & { employeeName: string }) | undefined>;
  createPayrollRecord(payrollRecord: InsertPayrollRecord): Promise<PayrollRecord>;
  updatePayrollRecord(id: number, payrollRecord: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined>;
  deletePayrollRecord(id: number): Promise<boolean>;
  
  // Email Settings
  getEmailSettings(): Promise<EmailSettings | undefined>;
  saveEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings>;
  
  // Overtime Rates
  getOvertimeRates(): Promise<OvertimeRate[]>;
  getOvertimeRate(id: number): Promise<OvertimeRate | undefined>;
  getOvertimeRateByType(overtimeType: string): Promise<OvertimeRate | undefined>;
  createOvertimeRate(overtimeRate: InsertOvertimeRate): Promise<OvertimeRate>;
  updateOvertimeRate(id: number, overtimeRate: Partial<InsertOvertimeRate>): Promise<OvertimeRate | undefined>;
  deleteOvertimeRate(id: number): Promise<boolean>;
  
  // Export Records
  getExportRecords(filter?: { userId?: number }): Promise<(ExportRecord & { userName: string })[]>;
  createExportRecord(exportRecord: InsertExportRecord): Promise<ExportRecord>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<(ActivityLog & { userName: string })[]>;
  createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog>;
  
  // Dashboard data
  getDashboardData(): Promise<{
    employeeCount: number;
    pendingLeaveCount: number;
    overtimeHours: number;
    lastUpdated: Date;
  }>;
  
  // Report data for exports
  getReportData(options: {
    month: Date;
    includeRecordTypes: string[];
  }): Promise<{
    employees: EmployeeWithFullName[];
    payrollRecords: (PayrollRecord & { employeeName: string })[];
  }>;
}

// Memory storage implementation for development
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private employees: Map<number, Employee>;
  private payrollRecords: Map<number, PayrollRecord>;
  private emailSettings: Map<number, EmailSettings>;
  private exportRecords: Map<number, ExportRecord>;
  private activityLogs: Map<number, ActivityLog>;
  private overtimeRates: Map<number, OvertimeRate>;
  
  private userId: number;
  private employeeId: number;
  private payrollRecordId: number;
  private emailSettingsId: number;
  private exportId: number;
  private activityLogId: number;
  private overtimeRateId: number;
  
  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.payrollRecords = new Map();
    this.emailSettings = new Map();
    this.exportRecords = new Map();
    this.activityLogs = new Map();
    this.overtimeRates = new Map();
    
    this.userId = 1;
    this.employeeId = 1;
    this.payrollRecordId = 1;
    this.emailSettingsId = 1;
    this.exportId = 1;
    this.activityLogId = 1;
    this.overtimeRateId = 1;
    
    // Add default admin user
    this.createUser({
      username: "admin",
      password: "admin123", // in production, we would hash this
      fullName: "Admin User",
      isAdmin: true,
      email: "admin@hitech.com"
    });
    
    // Add sample HR user
    this.createUser({
      username: "hrmanager",
      password: "hr123", // in production, we would hash this
      fullName: "HR Manager",
      isAdmin: false,
      email: "hr@hitech.com"
    });
    
    // Add default overtime rates
    this.createOvertimeRate({
      overtimeType: 'Weekday',
      rate: 1.5,
      description: 'Monday to Friday overtime rate',
      updatedBy: 1
    });
    
    this.createOvertimeRate({
      overtimeType: 'Saturday',
      rate: 1.5,
      description: 'Saturday overtime rate',
      updatedBy: 1
    });
    
    this.createOvertimeRate({
      overtimeType: 'Sunday',
      rate: 2.0,
      description: 'Sunday overtime rate',
      updatedBy: 1
    });
    
    this.createOvertimeRate({
      overtimeType: 'Public Holiday',
      rate: 2.5,
      description: 'Public holiday overtime rate',
      updatedBy: 1
    });
    
    // Add some sample employees for testing
    this.createEmployee({
      employeeCode: "EMP001",
      firstName: "John",
      lastName: "Smith",
      department: "Security",
      position: "Security Officer",
      status: "Active",
      email: "john.smith@hitech.com"
    });
    
    this.createEmployee({
      employeeCode: "EMP023",
      firstName: "Sarah",
      lastName: "Johnson",
      department: "Administration",
      position: "HR Assistant",
      status: "Active",
      email: "sarah.j@hitech.com"
    });
    
    // Add sample email settings
    this.saveEmailSettings({
      smtpServer: "smtp.hitech.com",
      smtpPort: 587,
      smtpUsername: "notifications@hitech.com",
      smtpPassword: "password123",
      fromEmail: "notifications@hitech.com",
      fromName: "Hi-Tec Security HR",
      enabled: true,
      updatedBy: 1
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Employee methods
  async getEmployees(filter?: { department?: string; status?: string }): Promise<EmployeeWithFullName[]> {
    let employees = Array.from(this.employees.values());
    
    if (filter) {
      if (filter.department && filter.department !== 'All Departments') {
        employees = employees.filter(emp => emp.department === filter.department);
      }
      
      if (filter.status && filter.status !== 'All Status') {
        employees = employees.filter(emp => emp.status === filter.status);
      }
    }
    
    return employees.map(emp => ({
      ...emp,
      fullName: `${emp.firstName} ${emp.lastName}`
    }));
  }
  
  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }
  
  async getEmployeeByCode(code: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (emp) => emp.employeeCode === code
    );
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = this.employeeId++;
    const newEmployee: Employee = { ...employee, id, dateJoined: new Date() };
    this.employees.set(id, newEmployee);
    return newEmployee;
  }
  
  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const existingEmployee = this.employees.get(id);
    if (!existingEmployee) return undefined;
    
    const updatedEmployee = { ...existingEmployee, ...employee };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }
  
  async bulkCreateOrUpdateEmployees(employees: InsertEmployee[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    
    for (const employee of employees) {
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
  
  // Payroll Record methods
  async getPayrollRecords(filter?: { 
    employeeId?: number;
    recordType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(PayrollRecord & { employeeName: string })[]> {
    let records = Array.from(this.payrollRecords.values());
    
    if (filter) {
      if (filter.employeeId) {
        records = records.filter(record => record.employeeId === filter.employeeId);
      }
      
      if (filter.recordType) {
        records = records.filter(record => record.recordType === filter.recordType);
      }
      
      if (filter.status) {
        records = records.filter(record => record.status === filter.status);
      }
      
      if (filter.startDate && filter.endDate) {
        records = records.filter(record => {
          const recordDate = new Date(record.date);
          const filterStart = new Date(filter.startDate!);
          const filterEnd = new Date(filter.endDate!);
          
          return recordDate >= filterStart && recordDate <= filterEnd;
        });
      }
    }
    
    // Enrich with employee names
    return await Promise.all(records.map(async record => {
      const employee = await this.getEmployee(record.employeeId);
      return {
        ...record,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
      };
    }));
  }
  
  async getPayrollRecord(id: number): Promise<(PayrollRecord & { employeeName: string }) | undefined> {
    const record = this.payrollRecords.get(id);
    if (!record) return undefined;
    
    const employee = await this.getEmployee(record.employeeId);
    return {
      ...record,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
    };
  }
  
  async createPayrollRecord(payrollRecord: InsertPayrollRecord): Promise<PayrollRecord> {
    const id = this.payrollRecordId++;
    const newRecord: PayrollRecord = { ...payrollRecord, id, createdAt: new Date() };
    this.payrollRecords.set(id, newRecord);
    return newRecord;
  }
  
  async updatePayrollRecord(id: number, payrollRecord: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined> {
    const existingRecord = this.payrollRecords.get(id);
    if (!existingRecord) return undefined;
    
    const updatedRecord = { ...existingRecord, ...payrollRecord };
    this.payrollRecords.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deletePayrollRecord(id: number): Promise<boolean> {
    return this.payrollRecords.delete(id);
  }
  
  // Email Settings methods
  async getEmailSettings(): Promise<EmailSettings | undefined> {
    // Always return the first one as we only have one email setting record
    return Array.from(this.emailSettings.values())[0];
  }
  
  async saveEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    // If there's already a settings entry, update it instead of creating a new one
    const existingSettings = await this.getEmailSettings();
    
    if (existingSettings) {
      const updatedSettings: EmailSettings = { 
        ...existingSettings, 
        ...settings,
        updatedAt: new Date()
      };
      this.emailSettings.set(existingSettings.id, updatedSettings);
      return updatedSettings;
    } else {
      const id = this.emailSettingsId++;
      const newSettings: EmailSettings = { 
        ...settings, 
        id,
        updatedAt: new Date()
      };
      this.emailSettings.set(id, newSettings);
      return newSettings;
    }
  }
  
  // Overtime Rates methods
  async getOvertimeRates(): Promise<OvertimeRate[]> {
    return Array.from(this.overtimeRates.values());
  }
  
  async getOvertimeRate(id: number): Promise<OvertimeRate | undefined> {
    return this.overtimeRates.get(id);
  }
  
  async getOvertimeRateByType(overtimeType: string): Promise<OvertimeRate | undefined> {
    return Array.from(this.overtimeRates.values()).find(rate => rate.overtimeType === overtimeType);
  }
  
  async createOvertimeRate(overtimeRate: InsertOvertimeRate): Promise<OvertimeRate> {
    const id = this.overtimeRateId++;
    const newRate: OvertimeRate = {
      ...overtimeRate,
      id,
      updatedAt: new Date()
    };
    this.overtimeRates.set(id, newRate);
    return newRate;
  }
  
  async updateOvertimeRate(id: number, overtimeRate: Partial<InsertOvertimeRate>): Promise<OvertimeRate | undefined> {
    const existingRate = await this.getOvertimeRate(id);
    if (!existingRate) return undefined;
    
    const updatedRate: OvertimeRate = {
      ...existingRate,
      ...overtimeRate,
      updatedAt: new Date()
    };
    this.overtimeRates.set(id, updatedRate);
    return updatedRate;
  }
  
  async deleteOvertimeRate(id: number): Promise<boolean> {
    return this.overtimeRates.delete(id);
  }
  
  // Export Records methods
  async getExportRecords(filter?: { userId?: number }): Promise<(ExportRecord & { userName: string })[]> {
    let records = Array.from(this.exportRecords.values());
    
    if (filter?.userId) {
      records = records.filter(record => record.createdBy === filter.userId);
    }
    
    // Enrich with user names
    return await Promise.all(records.map(async record => {
      const user = await this.getUser(record.createdBy);
      return {
        ...record,
        userName: user ? user.fullName : 'Unknown User'
      };
    }));
  }
  
  async createExportRecord(exportRecord: InsertExportRecord): Promise<ExportRecord> {
    const id = this.exportId++;
    const newRecord: ExportRecord = { ...exportRecord, id, createdAt: new Date() };
    this.exportRecords.set(id, newRecord);
    return newRecord;
  }
  
  // Activity Log methods
  async getActivityLogs(limit: number = 10): Promise<(ActivityLog & { userName: string })[]> {
    const logs = Array.from(this.activityLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    
    // Enrich with user names
    return await Promise.all(logs.map(async log => {
      const user = await this.getUser(log.userId);
      return {
        ...log,
        userName: user ? user.fullName : 'Unknown User'
      };
    }));
  }
  
  async createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogId++;
    const newActivityLog: ActivityLog = { ...activityLog, id, timestamp: new Date() };
    this.activityLogs.set(id, newActivityLog);
    return newActivityLog;
  }
  
  // Dashboard data
  async getDashboardData(): Promise<{
    employeeCount: number;
    pendingLeaveCount: number;
    overtimeHours: number;
    lastUpdated: Date;
  }> {
    const employees = await this.getEmployees();
    
    // Find leave records with pending status
    const leaveRecords = await this.getPayrollRecords({
      recordType: 'Leave',
      status: 'Pending'
    });
    
    // Count total overtime hours
    const overtimeRecords = await this.getPayrollRecords({
      recordType: 'Overtime'
    });
    const totalOvertimeHours = overtimeRecords.reduce((total, record) => total + (record.hours || 0), 0);
    
    return {
      employeeCount: employees.length,
      pendingLeaveCount: leaveRecords.length,
      overtimeHours: totalOvertimeHours,
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
    
    // Filter records by month and requested types
    const startDate = new Date(options.month.getFullYear(), options.month.getMonth(), 1);
    const endDate = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0);
    
    let payrollRecords: (PayrollRecord & { employeeName: string })[] = [];
    
    // Only fetch records for the requested types
    if (options.includeRecordTypes.length > 0) {
      const allRecords = await this.getPayrollRecords({
        startDate,
        endDate
      });
      
      payrollRecords = allRecords.filter(record => 
        options.includeRecordTypes.includes(record.recordType)
      );
    }
    
    return {
      employees,
      payrollRecords
    };
  }
}

// Import database storage
import { DatabaseStorage } from "./database-storage";

// Use database storage by default
export const storage = new DatabaseStorage();