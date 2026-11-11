-- Migration V3: HR Domain Schema (Stands, Shifts, Attendance, Feedback & Complaints)
CREATE SCHEMA IF NOT EXISTS hr;

-- 1. Dynamic Stand Roles
CREATE TABLE IF NOT EXISTS hr.stand_roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed core HR stand roles
INSERT INTO hr.stand_roles (id, name, description, is_system, category, created_at, updated_at) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Finance Responsible',   'Responsabil cu încasările, casa de marcat și formularul EoD', true, 'FINANCE', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000003', 'Logistics Responsible', 'Responsabil cu stocul de mărfuri și echipamentul tehnic',      true, 'LOGISTICS', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000005', 'Volunteer',             'Voluntar general pentru informare și promovare',              true, 'GENERAL', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    category = EXCLUDED.category,
    updated_at = NOW();

-- 2. Event Stands
CREATE TABLE IF NOT EXISTS hr.stands (
    id UUID PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    qr_code_token VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_stands_event_date ON hr.stands(event_date);
CREATE INDEX IF NOT EXISTS idx_hr_stands_qr_token ON hr.stands(qr_code_token);

-- 3. Shift Intervals
CREATE TABLE IF NOT EXISTS hr.shifts (
    id UUID PRIMARY KEY,
    stand_id UUID NOT NULL REFERENCES hr.stands(id) ON DELETE CASCADE,
    shift_name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    needed_volunteers INT NOT NULL DEFAULT 1,
    needed_logistics INT NOT NULL DEFAULT 1,
    needed_finance INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_shifts_stand_id ON hr.shifts(stand_id);

-- 4. Shift Assignments
CREATE TABLE IF NOT EXISTS hr.shift_assignments (
    id UUID PRIMARY KEY,
    shift_id UUID NOT NULL REFERENCES hr.shifts(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES hr.stand_roles(id) ON DELETE CASCADE,
    attendance_status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
    assignment_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    approved_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    checked_in_at TIMESTAMP WITHOUT TIME ZONE,
    checkin_method VARCHAR(50),
    checkin_lat NUMERIC(10, 7),
    checkin_lng NUMERIC(10, 7),
    eod_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_assignments_shift_id ON hr.shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_hr_assignments_member_id ON hr.shift_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_hr_assignments_status_expires ON hr.shift_assignments(assignment_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_hr_assignments_attendance ON hr.shift_assignments(attendance_status);

-- 5. Feedback Categories
CREATE TABLE IF NOT EXISTS hr.feedback_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO hr.feedback_categories (id, name, created_at) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Stand & Logistică', NOW()),
    ('20000000-0000-0000-0000-000000000002', 'Program & Schimburi', NOW()),
    ('20000000-0000-0000-0000-000000000003', 'Coordonare & Echipă', NOW()),
    ('20000000-0000-0000-0000-000000000004', 'Materiale & Echipamente', NOW()),
    ('20000000-0000-0000-0000-000000000005', 'Sugestii Îmbunătățire', NOW()),
    ('20000000-0000-0000-0000-000000000006', 'Altele', NOW())
ON CONFLICT (name) DO NOTHING;

-- 6. Volunteer Feedback & Complaints
CREATE TABLE IF NOT EXISTS hr.volunteer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL,
    submitter_name VARCHAR(255),
    submitter_email VARCHAR(255),
    category_id UUID REFERENCES hr.feedback_categories(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'COMPLAINT',
    is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    is_public_submission BOOLEAN NOT NULL DEFAULT FALSE,
    target_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    target_id VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    internal_notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    resolved_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_volunteer_feedback_status ON hr.volunteer_feedback(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_feedback_created_at ON hr.volunteer_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_volunteer_feedback_cat_id ON hr.volunteer_feedback(category_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_feedback_user_id ON hr.volunteer_feedback(user_id);

-- Connect email verification tokens FKs to hr entities now that they exist
ALTER TABLE auth.email_verification_tokens
    ADD CONSTRAINT fk_evt_pending_shift FOREIGN KEY (pending_shift_id) REFERENCES hr.shifts(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_evt_pending_role FOREIGN KEY (pending_role_id) REFERENCES hr.stand_roles(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_evt_pending_stand FOREIGN KEY (pending_stand_id) REFERENCES hr.stands(id) ON DELETE SET NULL;
