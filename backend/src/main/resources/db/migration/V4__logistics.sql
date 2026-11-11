-- Migration V4: Logistics Domain Schema (Items, Inventory Stocks, Transfers, Adjustments, EoD Reports)
CREATE SCHEMA IF NOT EXISTS logistics;

-- 1. Items Definition
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
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_item_sku ON logistics.items(sku);
CREATE INDEX IF NOT EXISTS idx_logistics_item_sellable ON logistics.items(is_sellable);

-- 2. Stock Level per Location
CREATE TABLE IF NOT EXISTS logistics.location_stocks (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES logistics.items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES general.locations(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_logistics_item_location UNIQUE (item_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_logistics_loc_stock ON logistics.location_stocks(location_id, item_id);

-- 3. Stock Transfer Operations
CREATE TABLE IF NOT EXISTS logistics.stock_transfers (
    id UUID PRIMARY KEY,
    source_location_id UUID NOT NULL REFERENCES general.locations(id),
    destination_location_id UUID NOT NULL REFERENCES general.locations(id),
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    performed_by VARCHAR(255) NOT NULL,
    notes TEXT
);

-- 4. Items inside Stock Transfer
CREATE TABLE IF NOT EXISTS logistics.stock_transfer_items (
    id UUID PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES logistics.stock_transfers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES logistics.items(id) ON DELETE CASCADE,
    quantity INT NOT NULL
);

-- 5. Stock Adjustments / Modifications Audit
CREATE TABLE IF NOT EXISTS logistics.stock_adjustments (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES logistics.items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES general.locations(id) ON DELETE CASCADE,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    quantity_change INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    performed_by VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_adjustments_item ON logistics.stock_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_logistics_adjustments_location ON logistics.stock_adjustments(location_id);
CREATE INDEX IF NOT EXISTS idx_logistics_adjustments_ts ON logistics.stock_adjustments(timestamp DESC);

-- 6. Logistics End-of-Day Reports
CREATE TABLE IF NOT EXISTS logistics.eod_reports (
    id UUID PRIMARY KEY,
    stand_id UUID REFERENCES hr.stands(id) ON DELETE SET NULL,
    stand_name VARCHAR(255) NOT NULL,
    closing_person_name VARCHAR(255) NOT NULL,
    closed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_logistics_eod_stand ON logistics.eod_reports(stand_id);
CREATE INDEX IF NOT EXISTS idx_logistics_eod_closed_at ON logistics.eod_reports(closed_at DESC);

CREATE TABLE IF NOT EXISTS logistics.eod_report_mugs (
    id UUID PRIMARY KEY,
    eod_report_id UUID NOT NULL REFERENCES logistics.eod_reports(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES logistics.items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    count_remaining INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_logistics_eod_mugs_report ON logistics.eod_report_mugs(eod_report_id);
