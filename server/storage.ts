import { 
  User, InsertUser, Employee, InsertEmployee, 
  LeaveRecord, InsertLeaveRecord, OvertimeRecord, InsertOvertimeRecord,
  DeductionRecord, InsertDeductionRecord, AllowanceRecord, InsertAllowanceRecord,
  ExportRecord, InsertExportRecord, ActivityLog, InsertActivityLog,
  EmployeeWithFullName
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Employees
  getEmployees(filter?: { company?: string; department?: string; status?: string }): Promise<EmployeeWithFullName[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByCode(code: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  bulkCreateOrUpdateEmployees(employees: InsertEmployee[]): Promise<{ created: number; updated: number }>;
  
  // Leave Records
  getLeaveRecords(filter?: { 
    employeeId?: number;
    company?: string;
    leaveType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(LeaveRecord & { employeeName: string; company: string })[]>;
  getLeaveRecord(id: number): Promise<(LeaveRecord & { employeeName: string; company: string }) | undefined>;
  createLeaveRecord(leaveRecord: InsertLeaveRecord): Promise<LeaveRecord>;
  updateLeaveRecord(id: number, leaveRecord: Partial<InsertLeaveRecord>): Promise<LeaveRecord | undefined>;
  deleteLeaveRecord(id: number): Promise<boolean>;
  
  // Overtime Records
  getOvertimeRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(OvertimeRecord & { employeeName: string; company: string })[]>;
  getOvertimeRecord(id: number): Promise<(OvertimeRecord & { employeeName: string; company: string }) | undefined>;
  createOvertimeRecord(overtimeRecord: InsertOvertimeRecord): Promise<OvertimeRecord>;
  updateOvertimeRecord(id: number, overtimeRecord: Partial<InsertOvertimeRecord>): Promise<OvertimeRecord | undefined>;
  deleteOvertimeRecord(id: number): Promise<boolean>;
  
  // Deduction Records
  getDeductionRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(DeductionRecord & { employeeName: string; company: string })[]>;
  getDeductionRecord(id: number): Promise<(DeductionRecord & { employeeName: string; company: string }) | undefined>;
  createDeductionRecord(deductionRecord: InsertDeductionRecord): Promise<DeductionRecord>;
  updateDeductionRecord(id: number, deductionRecord: Partial<InsertDeductionRecord>): Promise<DeductionRecord | undefined>;
  deleteDeductionRecord(id: number): Promise<boolean>;
  
  // Allowance Records
  getAllowanceRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(AllowanceRecord & { employeeName: string; company: string })[]>;
  getAllowanceRecord(id: number): Promise<(AllowanceRecord & { employeeName: string; company: string }) | undefined>;
  createAllowanceRecord(allowanceRecord: InsertAllowanceRecord): Promise<AllowanceRecord>;
  updateAllowanceRecord(id: number, allowanceRecord: Partial<InsertAllowanceRecord>): Promise<AllowanceRecord | undefined>;
  deleteAllowanceRecord(id: number): Promise<boolean>;
  
  // Export Records
  getExportRecords(filter?: { company?: string; userId?: number }): Promise<(ExportRecord & { userName: string })[]>;
  createExportRecord(exportRecord: InsertExportRecord): Promise<ExportRecord>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<(ActivityLog & { userName: string })[]>;
  createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog>;
  
  // Dashboard data
  getDashboardData(): Promise<{
    employeeCounts: { total: number; butters: number; makana: number };
    pendingLeave: { total: number; butters: number; makana: number };
    overtimeHours: { total: number; butters: number; makana: number };
    lastUpdated: Date;
  }>;
  
  // Report data for exports
  getReportData(options: {
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
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private employees: Map<number, Employee>;
  private leaveRecords: Map<number, LeaveRecord>;
  private overtimeRecords: Map<number, OvertimeRecord>;
  private deductionRecords: Map<number, DeductionRecord>;
  private allowanceRecords: Map<number, AllowanceRecord>;
  private exportRecords: Map<number, ExportRecord>;
  private activityLogs: Map<number, ActivityLog>;
  
  private userId: number;
  private employeeId: number;
  private leaveId: number;
  private overtimeId: number;
  private deductionId: number;
  private allowanceId: number;
  private exportId: number;
  private activityLogId: number;
  
  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.leaveRecords = new Map();
    this.overtimeRecords = new Map();
    this.deductionRecords = new Map();
    this.allowanceRecords = new Map();
    this.exportRecords = new Map();
    this.activityLogs = new Map();
    
    this.userId = 1;
    this.employeeId = 1;
    this.leaveId = 1;
    this.overtimeId = 1;
    this.deductionId = 1;
    this.allowanceId = 1;
    this.exportId = 1;
    this.activityLogId = 1;
    
    // Add default admin user
    this.createUser({
      username: "admin",
      password: "admin123", // in production, we would hash this
      fullName: "Admin User",
      company: "Butters",
      isAdmin: true
    });
    
    // Add sample HR user
    this.createUser({
      username: "hrmanager",
      password: "hr123", // in production, we would hash this
      fullName: "HR Manager",
      company: "Makana",
      isAdmin: false
    });
    
    // Add some sample employees for testing
    this.createEmployee({
      employeeCode: "EMP001",
      firstName: "John",
      lastName: "Smith",
      company: "Butters",
      department: "Security",
      position: "Security Officer",
      status: "Active"
    });
    
    this.createEmployee({
      employeeCode: "EMP023",
      firstName: "Sarah",
      lastName: "Johnson",
      company: "Makana",
      department: "Administration",
      position: "HR Assistant",
      status: "Active"
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
  async getEmployees(filter?: { company?: string; department?: string; status?: string }): Promise<EmployeeWithFullName[]> {
    let employees = Array.from(this.employees.values());
    
    if (filter) {
      if (filter.company && filter.company !== 'All Companies') {
        employees = employees.filter(emp => emp.company === filter.company);
      }
      
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
  
  // Leave Record methods
  async getLeaveRecords(filter?: { 
    employeeId?: number;
    company?: string;
    leaveType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(LeaveRecord & { employeeName: string; company: string })[]> {
    let leaveRecords = Array.from(this.leaveRecords.values());
    
    if (filter) {
      if (filter.employeeId) {
        leaveRecords = leaveRecords.filter(record => record.employeeId === filter.employeeId);
      }
      
      if (filter.leaveType && filter.leaveType !== 'All Leave Types') {
        leaveRecords = leaveRecords.filter(record => record.leaveType === filter.leaveType);
      }
      
      if (filter.status && filter.status !== 'All Status') {
        leaveRecords = leaveRecords.filter(record => record.status === filter.status);
      }
      
      if (filter.startDate && filter.endDate) {
        leaveRecords = leaveRecords.filter(record => {
          const recordStart = new Date(record.startDate);
          const recordEnd = new Date(record.endDate);
          const filterStart = new Date(filter.startDate!);
          const filterEnd = new Date(filter.endDate!);
          
          return (
            (recordStart >= filterStart && recordStart <= filterEnd) ||
            (recordEnd >= filterStart && recordEnd <= filterEnd) ||
            (recordStart <= filterStart && recordEnd >= filterEnd)
          );
        });
      }
    }
    
    // Enrich with employee names and company
    return await Promise.all(leaveRecords.map(async record => {
      const employee = await this.getEmployee(record.employeeId);
      return {
        ...record,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
        company: employee ? employee.company : 'Unknown'
      };
    }));
  }
  
  async getLeaveRecord(id: number): Promise<(LeaveRecord & { employeeName: string; company: string }) | undefined> {
    const record = this.leaveRecords.get(id);
    if (!record) return undefined;
    
    const employee = await this.getEmployee(record.employeeId);
    return {
      ...record,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
      company: employee ? employee.company : 'Unknown'
    };
  }
  
  async createLeaveRecord(leaveRecord: InsertLeaveRecord): Promise<LeaveRecord> {
    const id = this.leaveId++;
    const newLeaveRecord: LeaveRecord = { ...leaveRecord, id, createdAt: new Date() };
    this.leaveRecords.set(id, newLeaveRecord);
    return newLeaveRecord;
  }
  
  async updateLeaveRecord(id: number, leaveRecord: Partial<InsertLeaveRecord>): Promise<LeaveRecord | undefined> {
    const existingRecord = this.leaveRecords.get(id);
    if (!existingRecord) return undefined;
    
    const updatedRecord = { ...existingRecord, ...leaveRecord };
    this.leaveRecords.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deleteLeaveRecord(id: number): Promise<boolean> {
    return this.leaveRecords.delete(id);
  }
  
  // Overtime Record methods
  async getOvertimeRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(OvertimeRecord & { employeeName: string; company: string })[]> {
    let overtimeRecords = Array.from(this.overtimeRecords.values());
    
    if (filter) {
      if (filter.employeeId) {
        overtimeRecords = overtimeRecords.filter(record => record.employeeId === filter.employeeId);
      }
      
      if (filter.startDate && filter.endDate) {
        overtimeRecords = overtimeRecords.filter(record => {
          const recordDate = new Date(record.date);
          const filterStart = new Date(filter.startDate!);
          const filterEnd = new Date(filter.endDate!);
          
          return recordDate >= filterStart && recordDate <= filterEnd;
        });
      }
    }
    
    // Filter by company and enrich with employee names
    const records = await Promise.all(overtimeRecords.map(async record => {
      const employee = await this.getEmployee(record.employeeId);
      return {
        ...record,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
        company: employee ? employee.company : 'Unknown'
      };
    }));
    
    // Further filter by company if needed
    if (filter?.company && filter.company !== 'All Companies') {
      return records.filter(record => record.company === filter.company);
    }
    
    return records;
  }
  
  async getOvertimeRecord(id: number): Promise<(OvertimeRecord & { employeeName: string; company: string }) | undefined> {
    const record = this.overtimeRecords.get(id);
    if (!record) return undefined;
    
    const employee = await this.getEmployee(record.employeeId);
    return {
      ...record,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
      company: employee ? employee.company : 'Unknown'
    };
  }
  
  async createOvertimeRecord(overtimeRecord: InsertOvertimeRecord): Promise<OvertimeRecord> {
    const id = this.overtimeId++;
    const newOvertimeRecord: OvertimeRecord = { ...overtimeRecord, id, createdAt: new Date() };
    this.overtimeRecords.set(id, newOvertimeRecord);
    return newOvertimeRecord;
  }
  
  async updateOvertimeRecord(id: number, overtimeRecord: Partial<InsertOvertimeRecord>): Promise<OvertimeRecord | undefined> {
    const existingRecord = this.overtimeRecords.get(id);
    if (!existingRecord) return undefined;
    
    const updatedRecord = { ...existingRecord, ...overtimeRecord };
    this.overtimeRecords.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deleteOvertimeRecord(id: number): Promise<boolean> {
    return this.overtimeRecords.delete(id);
  }
  
  // Deduction Record methods
  async getDeductionRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(DeductionRecord & { employeeName: string; company: string })[]> {
    let deductionRecords = Array.from(this.deductionRecords.values());
    
    if (filter) {
      if (filter.employeeId) {
        deductionRecords = deductionRecords.filter(record => record.employeeId === filter.employeeId);
      }
      
      if (filter.startDate && filter.endDate) {
        deductionRecords = deductionRecords.filter(record => {
          const recordDate = new Date(record.date);
          const filterStart = new Date(filter.startDate!);
          const filterEnd = new Date(filter.endDate!);
          
          return recordDate >= filterStart && recordDate <= filterEnd;
        });
      }
    }
    
    // Filter by company and enrich with employee names
    const records = await Promise.all(deductionRecords.map(async record => {
      const employee = await this.getEmployee(record.employeeId);
      return {
        ...record,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
        company: employee ? employee.company : 'Unknown'
      };
    }));
    
    // Further filter by company if needed
    if (filter?.company && filter.company !== 'All Companies') {
      return records.filter(record => record.company === filter.company);
    }
    
    return records;
  }
  
  async getDeductionRecord(id: number): Promise<(DeductionRecord & { employeeName: string; company: string }) | undefined> {
    const record = this.deductionRecords.get(id);
    if (!record) return undefined;
    
    const employee = await this.getEmployee(record.employeeId);
    return {
      ...record,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
      company: employee ? employee.company : 'Unknown'
    };
  }
  
  async createDeductionRecord(deductionRecord: InsertDeductionRecord): Promise<DeductionRecord> {
    const id = this.deductionId++;
    const newDeductionRecord: DeductionRecord = { ...deductionRecord, id, createdAt: new Date() };
    this.deductionRecords.set(id, newDeductionRecord);
    return newDeductionRecord;
  }
  
  async updateDeductionRecord(id: number, deductionRecord: Partial<InsertDeductionRecord>): Promise<DeductionRecord | undefined> {
    const existingRecord = this.deductionRecords.get(id);
    if (!existingRecord) return undefined;
    
    const updatedRecord = { ...existingRecord, ...deductionRecord };
    this.deductionRecords.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deleteDeductionRecord(id: number): Promise<boolean> {
    return this.deductionRecords.delete(id);
  }
  
  // Allowance Record methods
  async getAllowanceRecords(filter?: {
    employeeId?: number;
    company?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(AllowanceRecord & { employeeName: string; company: string })[]> {
    let allowanceRecords = Array.from(this.allowanceRecords.values());
    
    if (filter) {
      if (filter.employeeId) {
        allowanceRecords = allowanceRecords.filter(record => record.employeeId === filter.employeeId);
      }
      
      if (filter.startDate && filter.endDate) {
        allowanceRecords = allowanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          const filterStart = new Date(filter.startDate!);
          const filterEnd = new Date(filter.endDate!);
          
          return recordDate >= filterStart && recordDate <= filterEnd;
        });
      }
    }
    
    // Filter by company and enrich with employee names
    const records = await Promise.all(allowanceRecords.map(async record => {
      const employee = await this.getEmployee(record.employeeId);
      return {
        ...record,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
        company: employee ? employee.company : 'Unknown'
      };
    }));
    
    // Further filter by company if needed
    if (filter?.company && filter.company !== 'All Companies') {
      return records.filter(record => record.company === filter.company);
    }
    
    return records;
  }
  
  async getAllowanceRecord(id: number): Promise<(AllowanceRecord & { employeeName: string; company: string }) | undefined> {
    const record = this.allowanceRecords.get(id);
    if (!record) return undefined;
    
    const employee = await this.getEmployee(record.employeeId);
    return {
      ...record,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
      company: employee ? employee.company : 'Unknown'
    };
  }
  
  async createAllowanceRecord(allowanceRecord: InsertAllowanceRecord): Promise<AllowanceRecord> {
    const id = this.allowanceId++;
    const newAllowanceRecord: AllowanceRecord = { ...allowanceRecord, id, createdAt: new Date() };
    this.allowanceRecords.set(id, newAllowanceRecord);
    return newAllowanceRecord;
  }
  
  async updateAllowanceRecord(id: number, allowanceRecord: Partial<InsertAllowanceRecord>): Promise<AllowanceRecord | undefined> {
    const existingRecord = this.allowanceRecords.get(id);
    if (!existingRecord) return undefined;
    
    const updatedRecord = { ...existingRecord, ...allowanceRecord };
    this.allowanceRecords.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deleteAllowanceRecord(id: number): Promise<boolean> {
    return this.allowanceRecords.delete(id);
  }
  
  // Export Record methods
  async getExportRecords(filter?: { company?: string; userId?: number }): Promise<(ExportRecord & { userName: string })[]> {
    let exportRecords = Array.from(this.exportRecords.values());
    
    if (filter) {
      if (filter.company && filter.company !== 'All Companies') {
        exportRecords = exportRecords.filter(record => record.company === filter.company);
      }
      
      if (filter.userId) {
        exportRecords = exportRecords.filter(record => record.createdBy === filter.userId);
      }
    }
    
    // Enrich with user names
    return await Promise.all(exportRecords.map(async record => {
      const user = await this.getUser(record.createdBy);
      return {
        ...record,
        userName: user ? user.fullName : 'Unknown User'
      };
    }));
  }
  
  async createExportRecord(exportRecord: InsertExportRecord): Promise<ExportRecord> {
    const id = this.exportId++;
    const newExportRecord: ExportRecord = { ...exportRecord, id, createdAt: new Date() };
    this.exportRecords.set(id, newExportRecord);
    return newExportRecord;
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
    employeeCounts: { total: number; butters: number; makana: number };
    pendingLeave: { total: number; butters: number; makana: number };
    overtimeHours: { total: number; butters: number; makana: number };
    lastUpdated: Date;
  }> {
    const employees = await this.getEmployees();
    const buttersEmployees = employees.filter(emp => emp.company === 'Butters');
    const makanaEmployees = employees.filter(emp => emp.company === 'Makana');
    
    // Get leave records with pending status
    const allLeaveRecords = await this.getLeaveRecords({ status: 'Pending' });
    const buttersLeave = allLeaveRecords.filter(leave => leave.company === 'Butters');
    const makanaLeave = allLeaveRecords.filter(leave => leave.company === 'Makana');
    
    // Get overtime hours for current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const overtimeRecords = await this.getOvertimeRecords({
      startDate: startOfMonth,
      endDate: endOfMonth
    });
    
    const buttersTotalHours = overtimeRecords
      .filter(record => record.company === 'Butters')
      .reduce((total, record) => total + record.hours, 0);
      
    const makanaTotalHours = overtimeRecords
      .filter(record => record.company === 'Makana')
      .reduce((total, record) => total + record.hours, 0);
    
    return {
      employeeCounts: {
        total: employees.length,
        butters: buttersEmployees.length,
        makana: makanaEmployees.length
      },
      pendingLeave: {
        total: allLeaveRecords.length,
        butters: buttersLeave.length,
        makana: makanaLeave.length
      },
      overtimeHours: {
        total: buttersTotalHours + makanaTotalHours,
        butters: buttersTotalHours,
        makana: makanaTotalHours
      },
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
    // Get start and end date for the specified month
    const startOfMonth = new Date(options.month.getFullYear(), options.month.getMonth(), 1);
    const endOfMonth = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0);
    
    // Get employees
    let employees = await this.getEmployees();
    
    // Filter by company if specified
    if (options.company && options.company !== 'All Companies') {
      employees = employees.filter(emp => emp.company === options.company);
    }
    
    // Initialize result with filtered employees
    const result = {
      employees,
      leave: [] as (LeaveRecord & { employeeName: string })[],
      overtime: [] as (OvertimeRecord & { employeeName: string })[],
      deductions: [] as (DeductionRecord & { employeeName: string })[],
      allowances: [] as (AllowanceRecord & { employeeName: string })[]
    };
    
    // Get the employee IDs we need to filter by
    const employeeIds = employees.map(emp => emp.id);
    
    // Get leave records if requested
    if (options.includeLeave) {
      const allLeaveRecords = await this.getLeaveRecords({
        startDate: startOfMonth,
        endDate: endOfMonth
      });
      
      result.leave = allLeaveRecords
        .filter(record => employeeIds.includes(record.employeeId))
        .map(record => ({
          ...record,
          employeeName: record.employeeName
        }));
    }
    
    // Get overtime records if requested
    if (options.includeOvertime) {
      const allOvertimeRecords = await this.getOvertimeRecords({
        startDate: startOfMonth,
        endDate: endOfMonth
      });
      
      result.overtime = allOvertimeRecords
        .filter(record => employeeIds.includes(record.employeeId))
        .map(record => ({
          ...record,
          employeeName: record.employeeName
        }));
    }
    
    // Get deduction records if requested
    if (options.includeDeductions) {
      const allDeductionRecords = await this.getDeductionRecords({
        startDate: startOfMonth,
        endDate: endOfMonth
      });
      
      result.deductions = allDeductionRecords
        .filter(record => employeeIds.includes(record.employeeId))
        .map(record => ({
          ...record,
          employeeName: record.employeeName
        }));
    }
    
    // Get allowance records if requested
    if (options.includeAllowances) {
      const allAllowanceRecords = await this.getAllowanceRecords({
        startDate: startOfMonth,
        endDate: endOfMonth
      });
      
      result.allowances = allAllowanceRecords
        .filter(record => employeeIds.includes(record.employeeId))
        .map(record => ({
          ...record,
          employeeName: record.employeeName
        }));
    }
    
    return result;
  }
}

import { DatabaseStorage } from "./database-storage";

// Create a DatabaseStorage instance
export const storage = new DatabaseStorage();
