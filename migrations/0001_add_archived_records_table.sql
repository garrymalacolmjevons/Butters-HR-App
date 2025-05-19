-- Create archived_payroll_records table
CREATE TABLE IF NOT EXISTS "archived_payroll_records" (
  "id" SERIAL PRIMARY KEY,
  "original_id" INTEGER NOT NULL,
  "employee_id" INTEGER REFERENCES "employees"("id"),
  "record_type" VARCHAR NOT NULL,
  "amount" REAL,
  "details" TEXT,
  "notes" TEXT,
  "date" DATE NOT NULL,
  "status" TEXT DEFAULT 'Archived',
  "document_image" TEXT,
  "start_date" DATE,
  "end_date" DATE,
  "total_days" REAL,
  "approved" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP,
  "archived_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "archived_by" INTEGER NOT NULL REFERENCES "users"("id")
);

-- Create index on employee_id for better performance
CREATE INDEX IF NOT EXISTS "archived_payroll_records_employee_id_idx" ON "archived_payroll_records"("employee_id");

-- Create index on archived_by for better performance
CREATE INDEX IF NOT EXISTS "archived_payroll_records_archived_by_idx" ON "archived_payroll_records"("archived_by");

-- Create index on record_type for better filtering
CREATE INDEX IF NOT EXISTS "archived_payroll_records_record_type_idx" ON "archived_payroll_records"("record_type");