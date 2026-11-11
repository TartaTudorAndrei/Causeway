-- Migration V5: Donations Domain Schema (Donations, Payment Transactions, Pickup Code Tracking)
CREATE SCHEMA IF NOT EXISTS donations;

-- Sequence for physical pickup tracking codes
CREATE SEQUENCE IF NOT EXISTS donations.pickup_code_seq;

-- 1. Donations Table
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

CREATE INDEX IF NOT EXISTS idx_donations_email ON donations.donations(donor_email);
CREATE INDEX IF NOT EXISTS idx_donations_pickup_code ON donations.donations(pickup_code);
CREATE INDEX IF NOT EXISTS idx_donations_payment_tx ON donations.donations(payment_transaction_id);

-- 2. Donation Pickups Tracking
CREATE TABLE IF NOT EXISTS donations.donation_pickups (
    donation_id BIGINT PRIMARY KEY REFERENCES donations.donations(id) ON DELETE CASCADE,
    picked_up BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
