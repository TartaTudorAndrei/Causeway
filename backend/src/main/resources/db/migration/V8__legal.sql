-- Migration V8: Legal Domain Schema (Contract Templates & Generated Contracts)
CREATE SCHEMA IF NOT EXISTS legal;

-- 1. Contract Templates
CREATE TABLE IF NOT EXISTS legal.contract_templates (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    google_docs_url TEXT,
    raw_content TEXT NOT NULL,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_templates_cat ON legal.contract_templates(category);
CREATE INDEX IF NOT EXISTS idx_legal_templates_created_at ON legal.contract_templates(created_at);

-- 2. Generated Contracts
CREATE TABLE IF NOT EXISTS legal.generated_contracts (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES legal.contract_templates(id) ON DELETE SET NULL,
    contract_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    party_a_name VARCHAR(255) DEFAULT 'Organizația Caritabilă',
    party_b_name VARCHAR(255) NOT NULL,
    party_b_email VARCHAR(255),
    field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    rendered_content TEXT NOT NULL,
    pdf_data TEXT,
    drive_file_id TEXT,
    valid_from VARCHAR(50),
    valid_until VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_contracts_template_id ON legal.generated_contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_legal_contracts_status ON legal.generated_contracts(status);
CREATE INDEX IF NOT EXISTS idx_legal_contracts_party_b ON legal.generated_contracts(party_b_name);
CREATE INDEX IF NOT EXISTS idx_legal_contracts_created_at ON legal.generated_contracts(created_at);
