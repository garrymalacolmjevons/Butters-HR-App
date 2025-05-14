import { pgTable, text, serial, integer, boolean, timestamp, real, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const companyEnum = pgEnum('company', ['Butters', 'Makana']);
export const leaveTypeEnum = pgEnum('leave_type', ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave', 'Compassionate Leave', 'Study Leave']);
export const leaveStatusEnum = pgEnum('leave_status', ['Pending', 'Approved', 'Rejected']);
export const employeeStatusEnum = pgEnum('employee_status', ['Active', 'On Leave', 'Terminated']);
export const departmentEnum = pgEnum('department', ['Security', 'Administration', 'Operations']);

// Users (HR staff)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  company: companyEnum("company"),
  isAdmin: boolean("is_admin").default(false),
});

// Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: companyEnum("company").notNull(),
  department: departmentEnum("department").notNull(),
  position: text("position").notNull(),
  status: employeeStatusEnum("status").default('Active'),
  dateJoined: timestamp("date_joined").defaultNow(),
});

// Leave Records
export const leaveRecords = pgTable("leave_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: real("total_days").notNull(),
  status: leaveStatusEnum("status").default('Pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Overtime Records
export const overtimeRecords = pgTable("overtime_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  date: date("date").notNull(),
  hours: real("hours").notNull(),
  rate: real("rate").notNull(), // Multiplier for regular pay
  approved: boolean("approved").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Deduction Records
export const deductionRecords = pgTable("deduction_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(), // Can be negative
  date: date("date").notNull(),
  recurring: boolean("recurring").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Allowance Records
export const allowanceRecords = pgTable("allowance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  date: date("date").notNull(),
  recurring: boolean("recurring").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export Records
export const exportRecords = pgTable("export_records", {
  id: serial("id").primaryKey(),
  reportName: text("report_name").notNull(),
  company: companyEnum("company"),
  month: timestamp("month").notNull(),
  includeLeave: boolean("include_leave").default(true),
  includeOvertime: boolean("include_overtime").default(true),
  includeDeductions: boolean("include_deductions").default(true),
  includeAllowances: boolean("include_allowances").default(true),
  format: text("format").default('xlsx'),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, dateJoined: true });
export const insertLeaveRecordSchema = createInsertSchema(leaveRecords).omit({ id: true, createdAt: true });
export const insertOvertimeRecordSchema = createInsertSchema(overtimeRecords).omit({ id: true, createdAt: true });
export const insertDeductionRecordSchema = createInsertSchema(deductionRecords).omit({ id: true, createdAt: true });
export const insertAllowanceRecordSchema = createInsertSchema(allowanceRecords).omit({ id: true, createdAt: true });
export const insertExportRecordSchema = createInsertSchema(exportRecords).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, timestamp: true });

// Extended schemas with custom validation
export const userLoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const importEmployeeSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.enum(['Butters', 'Makana']),
  department: z.enum(['Security', 'Administration', 'Operations']),
  position: z.string().min(1, "Position is required"),
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
          foreignKey: exportRecords.createdBy,
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
  },
  employees: {
    leaveRecords: {
      one: {
        leaveRecords: {
          references: [employees.id],
          foreignKey: leaveRecords.employeeId,
        },
      },
    },
    overtimeRecords: {
      one: {
        overtimeRecords: {
          references: [employees.id],
          foreignKey: overtimeRecords.employeeId,
        },
      },
    },
    deductionRecords: {
      one: {
        deductionRecords: {
          references: [employees.id],
          foreignKey: deductionRecords.employeeId,
        },
      },
    },
    allowanceRecords: {
      one: {
        allowanceRecords: {
          references: [employees.id],
          foreignKey: allowanceRecords.employeeId,
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
export type LeaveRecord = typeof leaveRecords.$inferSelect;
export type InsertLeaveRecord = z.infer<typeof insertLeaveRecordSchema>;
export type OvertimeRecord = typeof overtimeRecords.$inferSelect;
export type InsertOvertimeRecord = z.infer<typeof insertOvertimeRecordSchema>;
export type DeductionRecord = typeof deductionRecords.$inferSelect;
export type InsertDeductionRecord = z.infer<typeof insertDeductionRecordSchema>;
export type AllowanceRecord = typeof allowanceRecords.$inferSelect;
export type InsertAllowanceRecord = z.infer<typeof insertAllowanceRecordSchema>;
export type ExportRecord = typeof exportRecords.$inferSelect;
export type InsertExportRecord = z.infer<typeof insertExportRecordSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type ImportEmployee = z.infer<typeof importEmployeeSchema>;
export type BulkImportEmployee = z.infer<typeof bulkImportEmployeeSchema>;

// Type for employee with name combined
export type EmployeeWithFullName = Employee & { fullName: string };
