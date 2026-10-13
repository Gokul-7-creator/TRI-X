-- Existing doctor/nurse/patient accounts no longer require administrator approval.
UPDATE users SET approved=true WHERE role IN ('DOCTOR','NURSE','PATIENT');
-- Preserve historical records; new nurse-led multi-step intake can store structured details.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(80);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS symptom_severities JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS history_flags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER;
