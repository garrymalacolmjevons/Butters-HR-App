import { pgTable, text, serial, integer, boolean, timestamp, real, date, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations as defineRelations } from "drizzle-orm";

// Enums
export const recordTypeEnum = pgEnum('record_type', [
  'Leave', 
  'Termination', 
  'Advance', 
  'Loan', 
  'Deduction', 
  'Overtime', 
  'Standby Shift', 
  'Bank Account Change', 
  'Special Shift', 
  'Escort Allowance', 
  'Commission', 
  'Cash in Transit',
  'Camera Allowance',
  'Staff Garnishee',
  'Maternity Leave'
]);
export const leaveTypeEnum = pgEnum('leave_type', ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave', 'Compassionate Leave', 'Study Leave']);
export const leaveStatusEnum = pgEnum('leave_status', ['Pending', 'Approved', 'Rejected']);
export const employeeStatusEnum = pgEnum('employee_status', ['Active', 'On Leave', 'Terminated']);
export const departmentEnum = pgEnum('department', ['Security', 'Administration', 'Operations']);
export const overtimeTypeEnum = pgEnum('overtime_type', ['Weekday', 'Saturday', 'Sunday', 'Public Holiday']);
export const userRoleEnum = pgEnum('user_role', ['Admin', 'HR Manager', 'Payroll Officer', 'Viewer']);
export const insuranceCompanyEnum = pgEnum('insurance_company', ['Sanlam Sky', 'Avbob', 'Old Mutual', 'Provident Fund']);
export const policyStatusEnum = pgEnum('policy_status', ['Active', 'Cancelled', 'Pending', 'Suspended']);
export const garnisheeStatusEnum = pgEnum('garnishee_status', ['Active', 'Completed', 'Cancelled', 'Suspended']);

// Users (HR staff)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  isAdmin: boolean("is_admin").default(false),
  email: text("email"),
  role: userRoleEnum("role").default('Viewer'),
  active: boolean("active").default(true),
});

// Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  idNumber: text("id_number"),
  department: departmentEnum("department").notNull(),
  position: text("position").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  status: employeeStatusEnum("status").default('Active'),
  dateJoined: date("date_joined"),
  
  // Financial information
  baseSalary: real("base_salary").default(0),
  taxNumber: text("tax_number"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankBranch: text("bank_branch"),
  
  // Additional benefits/extras
  allowances: text("allowances"),
  benefits: text("benefits"),
  
  // Documents
  documentIds: text("document_ids").array(),
  documentsNote: text("documents_note"),
  
  // VIP code tracking
  vipCode: text("vip_code"),
  vipCodeRequested: boolean("vip_code_requested").default(false),
  vipCodeRequestDate: timestamp("vip_code_request_date"),
  vipCodeStatus: text("vip_code_status").default('Not Requested'),
});

// Payroll Records
export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  recordType: recordTypeEnum("record_type").notNull(),
  date: date("date").notNull(),
  amount: real("amount"), // Financial value when applicable
  hours: real("hours"), // For overtime, standby shifts, etc.
  rate: real("rate"), // Rate multiplier when applicable
  startDate: date("start_date"), // For leave periods
  endDate: date("end_date"), // For leave periods
  totalDays: real("total_days"), // For leave records
  status: leaveStatusEnum("status"), // For leave and termination
  details: text("details"), // For bank account changes, special instructions, etc.
  description: text("description"), // For categorization
  approved: boolean("approved").default(false),
  notes: text("notes"),
  documentImage: text("document_image"), // URL to the signed document image
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recurring Deductions
export const recurringDeductions = pgTable("recurring_deductions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  deductionName: text("deduction_name").notNull(),
  amount: real("amount").notNull(),
  startDate: date("start_date").notNull(), // When the recurring deduction begins
  endDate: date("end_date"), // Optional end date (null means indefinite)
  frequency: text("frequency").default("monthly"), // monthly, weekly, etc.
  description: text("description"),
  approved: boolean("approved").default(false), // Was this deduction approved
  referenceNumber: text("reference_number"), // For cross-referencing with physical documents
  documentImage: text("document_image"), // URL to the signed document image
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  active: boolean("active").default(true), // To deactivate without deleting
});

// Export Records
export const exportRecords = pgTable("export_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  exportType: text("export_type").notNull(), // 'all', 'earnings', 'Overtime', etc.
  fileUrl: text("file_url").notNull(),
  fileFormat: text("file_format").default('csv'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  includeUnapproved: boolean("include_unapproved").default(false),
  recordCount: integer("record_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email Settings
export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  smtpServer: text("smtp_server").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpUsername: text("smtp_username").notNull(),
  smtpPassword: text("smtp_password").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  enabled: boolean("enabled").default(true),
  updatedBy: integer("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Overtime Rates
export const overtimeRates = pgTable("overtime_rates", {
  id: serial("id").primaryKey(),
  overtimeType: overtimeTypeEnum("overtime_type").notNull(),
  rate: real("rate").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insurance Policies
export const insurancePolicies = pgTable("insurance_policies", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  company: insuranceCompanyEnum("company").notNull(),
  policyNumber: text("policy_number").notNull(),
  amount: real("amount").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: policyStatusEnum("status").default('Active'),
  notes: text("notes"),
  documentImage: text("document_image"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at"),
});

// Policy Payments
export const policyPayments = pgTable("policy_payments", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id").notNull(),
  paymentDate: date("payment_date").notNull(),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").default('Payroll Deduction'),
  month: date("month").notNull(), // Month this payment applies to
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Policy Exports
export const policyExports = pgTable("policy_exports", {
  id: serial("id").primaryKey(),
  exportName: text("export_name").notNull(),
  company: insuranceCompanyEnum("company"),
  month: date("month").notNull(),
  totalAmount: real("total_amount").notNull(),
  format: text("format").default('csv'),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ 
  id: true,
  dateJoined: true,
  vipCode: true,
  vipCodeRequested: true,
  vipCodeRequestDate: true,
  vipCodeStatus: true,
  documentIds: true // We'll handle this separately
});
export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({ id: true, createdAt: true });
export const insertRecurringDeductionSchema = createInsertSchema(recurringDeductions).omit({ id: true, createdAt: true });
export const insertExportRecordSchema = createInsertSchema(exportRecords).omit({ id: true, createdAt: true });
export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({ id: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, timestamp: true });
export const insertOvertimeRateSchema = createInsertSchema(overtimeRates).omit({ id: true, updatedAt: true });
export const insertInsurancePolicySchema = createInsertSchema(insurancePolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPolicyPaymentSchema = createInsertSchema(policyPayments).omit({ id: true, createdAt: true });
export const insertPolicyExportSchema = createInsertSchema(policyExports).omit({ id: true, createdAt: true });

// Extended schemas with custom validation
export const userLoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  role: z.enum(['Admin', 'HR Manager', 'Payroll Officer', 'Viewer']).default('Viewer'),
  active: z.boolean().default(true)
});

export const importEmployeeSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  department: z.enum(['Security', 'Administration', 'Operations']).default('Security'),
  position: z.string().min(1, "Position is required"),
  email: z.string().email("Invalid email format").optional(),
  company: z.string().default('Butters'),
  status: z.enum(['Active', 'On Leave', 'Terminated']).default('Active')
});

// Create an array schema for bulk employee import
export const bulkImportEmployeeSchema = z.array(importEmployeeSchema);

// Define relations between tables
export const relations = {
  users: {
    exportRecords: {
      one: {
        exportRecords: {
          references: [users.id],
          foreignKey: exportRecords.userId,
        },
      },
    },
    activityLogs: {
      one: {
        activityLogs: {
          references: [users.id],
          foreignKey: activityLogs.userId,
        },
      },
    },
    emailSettings: {
      one: {
        emailSettings: {
          references: [users.id],
          foreignKey: emailSettings.updatedBy,
        },
      },
    },
    policyExports: {
      one: {
        policyExports: {
          references: [users.id],
          foreignKey: policyExports.createdBy,
        },
      },
    },
  },
  employees: {
    payrollRecords: {
      one: {
        payrollRecords: {
          references: [employees.id],
          foreignKey: payrollRecords.employeeId,
        },
      },
    },
    recurringDeductions: {
      one: {
        recurringDeductions: {
          references: [employees.id],
          foreignKey: recurringDeductions.employeeId,
        },
      },
    },
    insurancePolicies: {
      one: {
        insurancePolicies: {
          references: [employees.id],
          foreignKey: insurancePolicies.employeeId,
        },
      },
    },
  },
  recurringDeductions: {
    employee: {
      one: {
        employees: {
          references: [employees.id],
          foreignKey: recurringDeductions.employeeId,
        },
      },
    },
    createdByUser: {
      one: {
        users: {
          references: [users.id],
          foreignKey: recurringDeductions.createdBy,
        },
      },
    },
  },
  insurancePolicies: {
    employee: {
      one: {
        employees: {
          references: [employees.id],
          foreignKey: insurancePolicies.employeeId,
        },
      },
    },
    createdByUser: {
      one: {
        users: {
          references: [users.id],
          foreignKey: insurancePolicies.createdBy,
        },
      },
    },
    updatedByUser: {
      one: {
        users: {
          references: [users.id],
          foreignKey: insurancePolicies.updatedBy,
        },
      },
    },
    policyPayments: {
      many: {
        policyPayments: {
          references: [insurancePolicies.id],
          foreignKey: policyPayments.policyId,
        },
      },
    },
  },
  policyPayments: {
    policy: {
      one: {
        insurancePolicies: {
          references: [insurancePolicies.id],
          foreignKey: policyPayments.policyId,
        },
      },
    },
    createdByUser: {
      one: {
        users: {
          references: [users.id],
          foreignKey: policyPayments.createdBy,
        },
      },
    },
  },
};

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type RecurringDeduction = typeof recurringDeductions.$inferSelect;
export type InsertRecurringDeduction = z.infer<typeof insertRecurringDeductionSchema>;
export type ExportRecord = typeof exportRecords.$inferSelect;
// Extended schema for export records that includes tracking
export const extendedExportRecordSchema = insertExportRecordSchema.extend({
  exportedRecordIds: z.array(z.number()).optional(),
});

export type InsertExportRecord = z.infer<typeof extendedExportRecordSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type OvertimeRate = typeof overtimeRates.$inferSelect;
export type InsertOvertimeRate = z.infer<typeof insertOvertimeRateSchema>;
export type InsurancePolicy = typeof insurancePolicies.$inferSelect;
export type InsertInsurancePolicy = z.infer<typeof insertInsurancePolicySchema>;
export type PolicyPayment = typeof policyPayments.$inferSelect;
export type InsertPolicyPayment = z.infer<typeof insertPolicyPaymentSchema>;
export type PolicyExport = typeof policyExports.$inferSelect;
export type InsertPolicyExport = z.infer<typeof insertPolicyExportSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type ImportEmployee = z.infer<typeof importEmployeeSchema>;
export type BulkImportEmployee = z.infer<typeof bulkImportEmployeeSchema>;

// Type for employee with name combined
export type EmployeeWithFullName = Employee & { fullName: string };

// Maternity records
export const maternityRecords = pgTable("maternity_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maternity records relations
export const maternityRecordsRelations = defineRelations(maternityRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [maternityRecords.employeeId],
    references: [employees.id],
  }),
}));

export const insertMaternityRecordSchema = createInsertSchema(maternityRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaternityRecord = z.infer<typeof insertMaternityRecordSchema>;
export type MaternityRecord = typeof maternityRecords.$inferSelect;
