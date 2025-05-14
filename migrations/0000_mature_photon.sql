CREATE TYPE "public"."department" AS ENUM('Security', 'Administration', 'Operations');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('Active', 'On Leave', 'Terminated');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave', 'Compassionate Leave', 'Study Leave');--> statement-breakpoint
CREATE TYPE "public"."overtime_type" AS ENUM('Weekday', 'Saturday', 'Sunday', 'Public Holiday');--> statement-breakpoint
CREATE TYPE "public"."record_type" AS ENUM('Leave', 'Termination', 'Advance', 'Loan', 'Deduction', 'Overtime', 'Standby Shift', 'Bank Account Change', 'Special Shift', 'Escort Allowance', 'Commission', 'Cash in Transit');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Admin', 'HR Manager', 'Payroll Officer', 'Viewer');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"smtp_server" text NOT NULL,
	"smtp_port" integer NOT NULL,
	"smtp_username" text NOT NULL,
	"smtp_password" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"updated_by" integer NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"department" "department" NOT NULL,
	"position" text NOT NULL,
	"email" text,
	"status" "employee_status" DEFAULT 'Active',
	"date_joined" timestamp DEFAULT now(),
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "export_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_name" text NOT NULL,
	"month" timestamp NOT NULL,
	"include_record_types" text[] NOT NULL,
	"format" text DEFAULT 'xlsx',
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "overtime_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"overtime_type" "overtime_type" NOT NULL,
	"rate" real NOT NULL,
	"description" text,
	"updated_by" integer NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"record_type" "record_type" NOT NULL,
	"date" date NOT NULL,
	"amount" real,
	"hours" real,
	"rate" real,
	"start_date" date,
	"end_date" date,
	"total_days" real,
	"status" "leave_status",
	"details" text,
	"description" text,
	"recurring" boolean DEFAULT false,
	"approved" boolean DEFAULT false,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"is_admin" boolean DEFAULT false,
	"email" text,
	"role" "user_role" DEFAULT 'Viewer',
	"active" boolean DEFAULT true,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
