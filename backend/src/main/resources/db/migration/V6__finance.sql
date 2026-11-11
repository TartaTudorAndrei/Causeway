-- Migration V6: Finance Domain Schema (Expenses, Online Donations, Stand Cash EoD, Sponsorships, Incomes)
CREATE SCHEMA IF NOT EXISTS finance;

-- 1. Expenses Table
CREATE TABLE IF NOT EXISTS finance.finance_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_fin_expenses_date ON finance.finance_expenses(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_campaign ON finance.finance_expenses(campaign_department);

-- 2. Online Donations Table
CREATE TABLE IF NOT EXISTS finance.finance_online_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_fin_donations_date ON finance.finance_online_donations(transaction_date);

-- 3. Event Stand End-of-Day Balancing
CREATE TABLE IF NOT EXISTS finance.finance_stands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stand_location VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    finance_responsible_id UUID,
    finance_responsible_name VARCHAR(255) NOT NULL,
    cash_collected DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    pos_card_collected DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    opening_balance DECIMAL(12, 2) DEFAULT 0.00,
    closing_balance DECIMAL(12, 2) DEFAULT 0.00,
    discrepancy_amount DECIMAL(12, 2) DEFAULT 0.00,
    discrepancy_notes TEXT,
    status VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_stands_date ON finance.finance_stands(event_date);

-- 4. Sponsorships Table
CREATE TABLE IF NOT EXISTS finance.finance_sponsorships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sponsor_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    tier VARCHAR(50) NOT NULL,
    agreed_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON' NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    campaign VARCHAR(150) DEFAULT 'General',
    contract_url VARCHAR(500),
    received_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_sponsorships_status ON finance.finance_sponsorships(payment_status);

-- 5. Other Incomes Table
CREATE TABLE IF NOT EXISTS finance.finance_other_incomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON' NOT NULL,
    source_payer VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    campaign VARCHAR(150) DEFAULT 'General',
    reference_doc VARCHAR(500),
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_other_incomes_date ON finance.finance_other_incomes(transaction_date);
