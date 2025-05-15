import { 
  User, InsertUser, Employee, InsertEmployee,
  PayrollRecord, InsertPayrollRecord, RecurringDeduction, InsertRecurringDeduction,
  ExportRecord, InsertExportRecord, EmailSettings, InsertEmailSettings, 
  ActivityLog, InsertActivityLog, OvertimeRate, InsertOvertimeRate, EmployeeWithFullName,
  InsurancePolicy, InsertInsurancePolicy, PolicyPayment, InsertPolicyPayment,
  PolicyExport, InsertPolicyExport
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
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
  
  // Recurring Deductions
  getRecurringDeductions(filter?: { 
    employeeId?: number;
    deductionName?: string;
  }): Promise<(RecurringDeduction & { employeeName: string })[]>;
  getRecurringDeduction(id: number): Promise<(RecurringDeduction & { employeeName: string }) | undefined>;
  createRecurringDeduction(deduction: InsertRecurringDeduction): Promise<RecurringDeduction>;
  updateRecurringDeduction(id: number, deduction: Partial<InsertRecurringDeduction>): Promise<RecurringDeduction | undefined>;
  deleteRecurringDeduction(id: number): Promise<boolean>;
  
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
  
  // Insurance Policies
  getInsurancePolicies(filter?: {
    employeeId?: number;
    company?: string;
    status?: string;
  }): Promise<(InsurancePolicy & { employeeName: string })[]>;
  getInsurancePolicy(id: number): Promise<(InsurancePolicy & { employeeName: string }) | undefined>;
  createInsurancePolicy(policy: InsertInsurancePolicy): Promise<InsurancePolicy>;
  updateInsurancePolicy(id: number, policy: Partial<InsertInsurancePolicy>): Promise<InsurancePolicy | undefined>;
  deleteInsurancePolicy(id: number): Promise<boolean>;
  
  // Policy Payments
  getPolicyPayments(filter?: {
    policyId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(PolicyPayment & { policyNumber: string, employeeName: string })[]>;
  getPolicyPayment(id: number): Promise<PolicyPayment | undefined>;
  createPolicyPayment(payment: InsertPolicyPayment): Promise<PolicyPayment>;
  updatePolicyPayment(id: number, payment: Partial<InsertPolicyPayment>): Promise<PolicyPayment | undefined>;
  deletePolicyPayment(id: number): Promise<boolean>;
  
  // Policy Exports
  getPolicyExports(filter?: { userId?: number, company?: string }): Promise<(PolicyExport & { userName: string })[]>;
  createPolicyExport(policyExport: InsertPolicyExport): Promise<PolicyExport>;
  
  // Policy Reports
  getPolicyReportData(options: {
    month: Date;
    company?: string;
  }): Promise<{
    policies: (InsurancePolicy & { employeeName: string })[];
    payments: (PolicyPayment & { policyNumber: string, employeeName: string })[];
  }>;
  
  // Dashboard data
  getDashboardData(): Promise<{
    employeeCount: number;
    policyValueTotal: number;
    monthlyEarnings: number;
    totalDeductions: number;
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
  private recurringDeductions: Map<number, RecurringDeduction>;
  private emailSettings: Map<number, EmailSettings>;
  private exportRecords: Map<number, ExportRecord>;
  private activityLogs: Map<number, ActivityLog>;
  private overtimeRates: Map<number, OvertimeRate>;
  private insurancePolicies: Map<number, InsurancePolicy>;
  private policyPayments: Map<number, PolicyPayment>;
  private policyExports: Map<number, PolicyExport>;
  
  private userId: number;
  private employeeId: number;
  private payrollRecordId: number;
  private recurringDeductionId: number;
  private emailSettingsId: number;
  private exportId: number;
  private activityLogId: number;
  private overtimeRateId: number;
  private insurancePolicyId: number;
  private policyPaymentId: number;
  private policyExportId: number;
  
  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.payrollRecords = new Map();
    this.recurringDeductions = new Map();
    this.emailSettings = new Map();
    this.exportRecords = new Map();
    this.activityLogs = new Map();
    this.overtimeRates = new Map();
    this.insurancePolicies = new Map();
    this.policyPayments = new Map();
    this.policyExports = new Map();
    
    this.userId = 1;
    this.employeeId = 1;
    this.payrollRecordId = 1;
    this.recurringDeductionId = 1;
    this.emailSettingsId = 1;
    this.exportId = 1;
    this.activityLogId = 1;
    this.overtimeRateId = 1;
    this.insurancePolicyId = 1;
    this.policyPaymentId = 1;
    this.policyExportId = 1;
    
    // Add default admin user
    this.createUser({
      username: "admin",
      password: "admin123", // in production, we would hash this
      fullName: "Admin User",
      isAdmin: true,
      email: "admin@hitech.com",
      role: "Admin",
      active: true
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
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { 
      ...user, 
      id,
      role: user.role || 'Viewer',
      active: user.active !== undefined ? user.active : true 
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
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

  // Recurring Deductions Methods
  async getRecurringDeductions(filter?: { 
    employeeId?: number;
    deductionName?: string;
  }): Promise<(RecurringDeduction & { employeeName: string })[]> {
    let deductions = Array.from(this.recurringDeductions.values());
    
    // Apply filters
    if (filter) {
      if (filter.employeeId) {
        deductions = deductions.filter(d => d.employeeId === filter.employeeId);
      }
      
      if (filter.deductionName) {
        deductions = deductions.filter(d => d.deductionName === filter.deductionName);
      }
    }
    
    // Add employee names
    return deductions.map(deduction => {
      const employee = this.employees.get(deduction.employeeId);
      return {
        ...deduction,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
      };
    });
  }

  async getRecurringDeduction(id: number): Promise<(RecurringDeduction & { employeeName: string }) | undefined> {
    const deduction = this.recurringDeductions.get(id);
    
    if (!deduction) {
      return undefined;
    }
    
    const employee = this.employees.get(deduction.employeeId);
    return {
      ...deduction,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
    };
  }

  async createRecurringDeduction(deduction: InsertRecurringDeduction): Promise<RecurringDeduction> {
    const id = this.recurringDeductionId++;
    
    const newDeduction: RecurringDeduction = {
      ...deduction,
      id,
      createdAt: new Date(),
      referenceNumber: `RD${id.toString().padStart(6, '0')}`
    };
    
    this.recurringDeductions.set(id, newDeduction);
    return newDeduction;
  }

  async updateRecurringDeduction(id: number, deduction: Partial<InsertRecurringDeduction>): Promise<RecurringDeduction | undefined> {
    const existingDeduction = this.recurringDeductions.get(id);
    
    if (!existingDeduction) {
      return undefined;
    }
    
    const updatedDeduction: RecurringDeduction = {
      ...existingDeduction,
      ...deduction
    };
    
    this.recurringDeductions.set(id, updatedDeduction);
    return updatedDeduction;
  }

  async deleteRecurringDeduction(id: number): Promise<boolean> {
    return this.recurringDeductions.delete(id);
  }

  // Insurance Policies methods
  async getInsurancePolicies(filter?: {
    employeeId?: number;
    company?: string;
    status?: string;
  }): Promise<(InsurancePolicy & { employeeName: string })[]> {
    let policies = Array.from(this.insurancePolicies.values());
    
    if (filter) {
      if (filter.employeeId !== undefined) {
        policies = policies.filter(p => p.employeeId === filter.employeeId);
      }
      
      if (filter.company !== undefined) {
        policies = policies.filter(p => p.company === filter.company);
      }
      
      if (filter.status !== undefined) {
        policies = policies.filter(p => p.status === filter.status);
      }
    }
    
    return policies.map(policy => {
      const employee = this.employees.get(policy.employeeId);
      return {
        ...policy,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
      };
    }).sort((a, b) => {
      if (a.updatedAt && b.updatedAt) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      return 0;
    });
  }
  
  async getInsurancePolicy(id: number): Promise<(InsurancePolicy & { employeeName: string }) | undefined> {
    const policy = this.insurancePolicies.get(id);
    
    if (!policy) {
      return undefined;
    }
    
    const employee = this.employees.get(policy.employeeId);
    return {
      ...policy,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
    };
  }
  
  async createInsurancePolicy(policy: InsertInsurancePolicy): Promise<InsurancePolicy> {
    const id = this.insurancePolicyId++;
    
    const newPolicy: InsurancePolicy = {
      ...policy,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.insurancePolicies.set(id, newPolicy);
    return newPolicy;
  }
  
  async updateInsurancePolicy(id: number, policy: Partial<InsertInsurancePolicy>): Promise<InsurancePolicy | undefined> {
    const existingPolicy = this.insurancePolicies.get(id);
    
    if (!existingPolicy) {
      return undefined;
    }
    
    const updatedPolicy: InsurancePolicy = {
      ...existingPolicy,
      ...policy,
      updatedAt: new Date()
    };
    
    this.insurancePolicies.set(id, updatedPolicy);
    return updatedPolicy;
  }
  
  async deleteInsurancePolicy(id: number): Promise<boolean> {
    return this.insurancePolicies.delete(id);
  }
  
  // Policy Payments methods
  async getPolicyPayments(filter?: {
    policyId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<(PolicyPayment & { policyNumber: string, employeeName: string })[]> {
    let payments = Array.from(this.policyPayments.values());
    
    if (filter) {
      if (filter.policyId !== undefined) {
        payments = payments.filter(p => p.policyId === filter.policyId);
      }
      
      if (filter.startDate !== undefined) {
        payments = payments.filter(p => new Date(p.paymentDate) >= filter.startDate!);
      }
      
      if (filter.endDate !== undefined) {
        payments = payments.filter(p => new Date(p.paymentDate) <= filter.endDate!);
      }
    }
    
    return payments.map(payment => {
      const policy = this.insurancePolicies.get(payment.policyId);
      const employee = policy ? this.employees.get(policy.employeeId) : undefined;
      return {
        ...payment,
        policyNumber: policy ? policy.policyNumber : 'Unknown Policy',
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
      };
    }).sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return 0;
    });
  }
  
  async getPolicyPayment(id: number): Promise<PolicyPayment | undefined> {
    return this.policyPayments.get(id);
  }
  
  async createPolicyPayment(payment: InsertPolicyPayment): Promise<PolicyPayment> {
    const id = this.policyPaymentId++;
    
    const newPayment: PolicyPayment = {
      ...payment,
      id,
      createdAt: new Date()
    };
    
    this.policyPayments.set(id, newPayment);
    return newPayment;
  }
  
  async updatePolicyPayment(id: number, payment: Partial<InsertPolicyPayment>): Promise<PolicyPayment | undefined> {
    const existingPayment = this.policyPayments.get(id);
    
    if (!existingPayment) {
      return undefined;
    }
    
    const updatedPayment: PolicyPayment = {
      ...existingPayment,
      ...payment
    };
    
    this.policyPayments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  async deletePolicyPayment(id: number): Promise<boolean> {
    return this.policyPayments.delete(id);
  }
  
  // Policy Exports methods
  async getPolicyExports(filter?: { userId?: number, company?: string }): Promise<(PolicyExport & { userName: string })[]> {
    let exports = Array.from(this.policyExports.values());
    
    if (filter) {
      if (filter.userId !== undefined) {
        exports = exports.filter(e => e.createdBy === filter.userId);
      }
      
      if (filter.company !== undefined) {
        exports = exports.filter(e => e.company === filter.company);
      }
    }
    
    return exports.map(policyExport => {
      const user = this.users.get(policyExport.createdBy);
      return {
        ...policyExport,
        userName: user ? user.fullName : 'Unknown User'
      };
    }).sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return 0;
    });
  }
  
  async createPolicyExport(policyExport: InsertPolicyExport): Promise<PolicyExport> {
    const id = this.policyExportId++;
    
    const newExport: PolicyExport = {
      ...policyExport,
      id,
      createdAt: new Date()
    };
    
    this.policyExports.set(id, newExport);
    return newExport;
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
    let policiesFilter: { employeeId?: number; company?: string; status?: string } = { 
      status: 'Active'
    };
    
    if (options.company) {
      policiesFilter.company = options.company;
    }
    
    const policies = await this.getInsurancePolicies(policiesFilter);
    
    // Start of month and end of month dates for filtering payments
    const startOfMonth = new Date(options.month.getFullYear(), options.month.getMonth(), 1);
    const endOfMonth = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0);
    
    // Get payments for the month
    const payments = await this.getPolicyPayments({
      startDate: startOfMonth,
      endDate: endOfMonth
    });
    
    // Filter payments by company if needed
    const filteredPayments = options.company
      ? payments.filter(payment => {
          const policy = this.insurancePolicies.get(payment.policyId);
          return policy && policy.company === options.company;
        })
      : payments;
    
    return {
      policies,
      payments: filteredPayments
    };
  }
}

// Import database storage
import { DatabaseStorage } from "./database-storage";

// Use database storage by default
export const storage = new DatabaseStorage();