CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE users (
 id BIGSERIAL PRIMARY KEY,
 full_name VARCHAR(160) NOT NULL,
 email VARCHAR(255) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 role VARCHAR(24) NOT NULL CHECK (role IN ('ADMIN','DOCTOR','NURSE','RECEPTIONIST','PATIENT')),
 approved BOOLEAN NOT NULL DEFAULT FALSE,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE patients (
 id BIGSERIAL PRIMARY KEY,
 patient_code VARCHAR(64) UNIQUE NOT NULL,
 name VARCHAR(160) NOT NULL,
 age INTEGER NOT NULL CHECK (age BETWEEN 0 AND 125),
 sex VARCHAR(40), phone VARCHAR(40), complaint TEXT NOT NULL,
 symptoms TEXT, medical_history TEXT, allergies TEXT,
 status VARCHAR(32) NOT NULL DEFAULT 'AWAITING_ASSESSMENT',
 created_by BIGINT REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE assessments (
 id BIGSERIAL PRIMARY KEY,
 patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 heart_rate INTEGER, spo2 NUMERIC(5,2), temperature NUMERIC(4,1),
 systolic INTEGER, diastolic INTEGER, pain INTEGER,
 notes TEXT, recommended VARCHAR(24) NOT NULL,
 flags TEXT NOT NULL DEFAULT '', confirmed VARCHAR(24),
 reviewed_by BIGINT REFERENCES users(id), override_reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), confirmed_at TIMESTAMPTZ
);
CREATE TABLE queue_entries (
 id BIGSERIAL PRIMARY KEY,
 patient_id BIGINT UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 priority VARCHAR(24) NOT NULL,
 status VARCHAR(32) NOT NULL DEFAULT 'WAITING',
 doctor_id BIGINT REFERENCES users(id),
 joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
);
CREATE TABLE consultations (
 id BIGSERIAL PRIMARY KEY,
 patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 doctor_id BIGINT NOT NULL REFERENCES users(id),
 notes TEXT, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
);
CREATE TABLE knowledge_documents (
 id BIGSERIAL PRIMARY KEY,
 title VARCHAR(260) NOT NULL,
 filename VARCHAR(260) NOT NULL,
 content TEXT NOT NULL,
 status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
 embedding_model VARCHAR(160), embedding_dim INTEGER,
 created_by BIGINT REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE knowledge_chunks (
 id BIGSERIAL PRIMARY KEY,
 document_id BIGINT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
 chunk_number INTEGER NOT NULL,
 content TEXT NOT NULL,
 embedding vector NOT NULL,
 UNIQUE(document_id,chunk_number)
);
CREATE TABLE audit_events (
 id BIGSERIAL PRIMARY KEY,
 actor_id BIGINT REFERENCES users(id),
 action VARCHAR(100) NOT NULL,
 entity_type VARCHAR(60), entity_id BIGINT,
 detail TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_assessment_patient ON assessments(patient_id,created_at DESC);
CREATE INDEX ix_queue_priority ON queue_entries(status,priority,joined_at);
CREATE INDEX ix_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX ix_audit_time ON audit_events(created_at DESC);
