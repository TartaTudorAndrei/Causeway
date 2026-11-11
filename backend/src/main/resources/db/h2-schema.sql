-- Causeway H2 In-Memory Fallback Schema & Core Seeds

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS general;
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS logistics;
CREATE SCHEMA IF NOT EXISTS donations;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS fundraising;
CREATE SCHEMA IF NOT EXISTS legal;
CREATE SCHEMA IF NOT EXISTS communication;
CREATE SCHEMA IF NOT EXISTS projects;

-- 1. AUTH DOMAIN
CREATE TABLE IF NOT EXISTS auth.admin_users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    roles TEXT,
    phone VARCHAR(50),
    organization_type VARCHAR(100),
    organization_details TEXT,
    notes TEXT,
    last_login_at TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    two_factor_method VARCHAR(50),
    token_version INT NOT NULL DEFAULT 0,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    whatsapp_notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50) DEFAULT 'GENERAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS auth.user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS auth.active_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(100),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    replaced_by UUID,
    ip_address VARCHAR(100),
    user_agent VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS auth.clubs (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    organization_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.two_factor_codes (
    id UUID PRIMARY KEY,
    admin_user_id UUID NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    code_type VARCHAR(50) NOT NULL,
    session_token VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
    id UUID PRIMARY KEY,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    admin_user_id UUID NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.email_verification_tokens (
    id UUID PRIMARY KEY,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    admin_user_id UUID NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    pending_shift_id UUID,
    pending_role_id UUID,
    pending_stand_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_email VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed Default Admin & Roles
INSERT INTO auth.admin_users (id, full_name, email, password_hash, status, role, roles, auth_provider, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'System Administrator',
    'admin@causeway.local',
    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi',
    'ACTIVE',
    'ADMIN',
    'ADMIN',
    'LOCAL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.admin_users WHERE email = 'admin@causeway.local');

INSERT INTO auth.roles (id, name, description, is_system, created_at, updated_at)
SELECT '10000000-0000-0000-0000-000000000001', 'ADMIN', 'Super administrator with full access', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.roles WHERE name = 'ADMIN');

INSERT INTO auth.roles (id, name, description, is_system, created_at, updated_at)
SELECT '10000000-0000-0000-0000-000000000002', 'IT_ADMIN', 'Technical administrator', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.roles WHERE name = 'IT_ADMIN');

INSERT INTO auth.roles (id, name, description, is_system, created_at, updated_at)
SELECT '10000000-0000-0000-0000-000000000003', 'FINANCE_HEAD', 'Finance Lead', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.roles WHERE name = 'FINANCE_HEAD');

INSERT INTO auth.roles (id, name, description, is_system, created_at, updated_at)
SELECT '10000000-0000-0000-0000-000000000004', 'HR_HEAD', 'HR Lead', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.roles WHERE name = 'HR_HEAD');

INSERT INTO auth.roles (id, name, description, is_system, created_at, updated_at)
SELECT '10000000-0000-0000-0000-000000000005', 'LOGISTICS_HEAD', 'Logistics Lead', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.roles WHERE name = 'LOGISTICS_HEAD');

INSERT INTO auth.roles (id, name, description, is_system, created_at, updated_at)
SELECT '10000000-0000-0000-0000-000000000006', 'VOLUNTEER', 'General volunteer', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.roles WHERE name = 'VOLUNTEER');

INSERT INTO auth.clubs (id, name, organization_type, created_at, updated_at)
SELECT '20000000-0000-0000-0000-000000000001', 'Community Chapter', 'Volunteer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.clubs WHERE name = 'Community Chapter');

INSERT INTO auth.clubs (id, name, organization_type, created_at, updated_at)
SELECT '20000000-0000-0000-0000-000000000002', 'Central Chapter', 'Volunteer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM auth.clubs WHERE name = 'Central Chapter');

-- 2. GENERAL DOMAIN
CREATE TABLE IF NOT EXISTS general.departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "key" VARCHAR(100),
    fallback VARCHAR(100),
    color VARCHAR(50),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS general.locations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'STAND',
    description TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    address TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS general.calendar_events (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date VARCHAR(50) NOT NULL,
    event_time VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    created_by VARCHAR(255),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS general.tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'todo',
    assignee TEXT,
    assignee_ids TEXT,
    due_date VARCHAR(50),
    start_date VARCHAR(50),
    reminder_count INT DEFAULT 3,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS general.dashboard_section_info (
    section_key VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content_markdown TEXT NOT NULL DEFAULT '',
    google_doc_url VARCHAR(1024),
    updated_by VARCHAR(150),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS general.task_assignees (
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS general.task_notifications_log (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS general.notification_rules (
    id UUID PRIMARY KEY,
    rule_type VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    is_active BOOLEAN NOT NULL DEFAULT true,
    trigger_timing_minutes INT NOT NULL DEFAULT 120,
    min_capacity_threshold INT DEFAULT 1,
    target_recipient_type VARCHAR(32) NOT NULL DEFAULT 'COORDINATOR_GROUP',
    custom_recipient_jid VARCHAR(128),
    source_group_jid VARCHAR(128),
    templates TEXT NOT NULL,
    cooldown_minutes INT NOT NULL DEFAULT 60,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. HR DOMAIN
CREATE TABLE IF NOT EXISTS hr.stand_roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS hr.stands (
    id UUID PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    qr_code_token VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS hr.shifts (
    id UUID PRIMARY KEY,
    stand_id UUID NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    needed_volunteers INT NOT NULL DEFAULT 1,
    needed_logistics INT NOT NULL DEFAULT 1,
    needed_finance INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS hr.shift_assignments (
    id UUID PRIMARY KEY,
    shift_id UUID NOT NULL,
    member_id UUID NOT NULL,
    role_id UUID NOT NULL,
    attendance_status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
    assignment_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    expires_at TIMESTAMP,
    approved_by UUID,
    approved_at TIMESTAMP,
    checked_in_at TIMESTAMP,
    checkin_method VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS hr.members (
    id UUID PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100),
    role VARCHAR(100),
    onboarding_status VARCHAR(50) DEFAULT 'ACTIVE',
    availability VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. LOGISTICS DOMAIN
CREATE TABLE IF NOT EXISTS logistics.items (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'buc',
    is_sellable BOOLEAN NOT NULL DEFAULT FALSE,
    photo_url VARCHAR(500),
    min_safety_stock INT NOT NULL DEFAULT 30,
    lead_time_days INT NOT NULL DEFAULT 2,
    target_stock INT NOT NULL DEFAULT 150,
    daily_burn_rate DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. DONATIONS & FINANCE DOMAINS
CREATE TABLE IF NOT EXISTS donations.donations (
    id SERIAL PRIMARY KEY,
    payment_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    payment_provider VARCHAR(50) DEFAULT 'STRIPE',
    donor_email VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON',
    pickup_code VARCHAR(20),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance.finance_expenses (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    transaction_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON' NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    payment_method VARCHAR(50) NOT NULL,
    campaign_department VARCHAR(150) NOT NULL,
    receipt_attachment VARCHAR(500),
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.finance_online_donations (
    id UUID PRIMARY KEY,
    processor VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    donor_name VARCHAR(255),
    donor_email VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON' NOT NULL,
    processing_fee DECIMAL(12, 2) DEFAULT 0.00,
    campaign VARCHAR(150) DEFAULT 'General',
    transaction_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.finance_stands (
    id UUID PRIMARY KEY,
    stand_location VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    finance_responsible_id UUID,
    finance_responsible_name VARCHAR(255) NOT NULL,
    cash_collected DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    card_collected DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    expected_cash DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    discrepancy DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    cash_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. FUNDRAISING & LEGAL & COMMUNICATION & PROJECTS
CREATE TABLE IF NOT EXISTS fundraising.sponsors (
    id UUID PRIMARY KEY,
    sort_index INT NOT NULL DEFAULT 1,
    company_name VARCHAR(255) NOT NULL,
    company_profile TEXT,
    contact_info VARCHAR(255),
    responsible_person VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    last_contact_date DATE,
    contract_url TEXT,
    notes TEXT,
    sponsorship_type VARCHAR(100),
    received_type VARCHAR(50) DEFAULT 'MONEY',
    received_value TEXT,
    currency VARCHAR(10) DEFAULT 'RON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal.contract_templates (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    google_docs_url TEXT,
    raw_content TEXT NOT NULL,
    fields_schema TEXT NOT NULL DEFAULT '[]',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS legal.generated_contracts (
    id UUID PRIMARY KEY,
    template_id UUID,
    contract_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    party_a_name VARCHAR(255) DEFAULT 'Organizația Caritabilă',
    party_b_name VARCHAR(255) NOT NULL,
    party_b_email VARCHAR(255),
    field_values TEXT NOT NULL DEFAULT '{}',
    rendered_content TEXT NOT NULL,
    pdf_data TEXT,
    drive_file_id TEXT,
    valid_from VARCHAR(50),
    valid_until VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS communication.email_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'fundraising',
    subject VARCHAR(255) NOT NULL,
    blocks TEXT NOT NULL DEFAULT '[]',
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communication.email_logs (
    id UUID PRIMARY KEY,
    template_id UUID,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    dispatch_method VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SENT',
    sent_by UUID,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects.projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    color VARCHAR(30) DEFAULT '#4f46e5',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
