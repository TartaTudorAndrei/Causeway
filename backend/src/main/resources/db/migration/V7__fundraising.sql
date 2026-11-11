-- Migration V7: Fundraising Domain Schema (Corporate Sponsors, Leads & Partnerships)
CREATE SCHEMA IF NOT EXISTS fundraising;

-- 1. Corporate Sponsors & Leads
CREATE TABLE IF NOT EXISTS fundraising.sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fundraising_status ON fundraising.sponsors(status);
