-- Migration V2: General Domain Schema (Locations, Tasks, Events, Notifications, System Configs)
CREATE SCHEMA IF NOT EXISTS general;

-- 1. Centralized Locations
CREATE TABLE IF NOT EXISTS general.locations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'STAND' CONSTRAINT chk_general_locations_type CHECK (type IN ('STAND', 'DEPOSIT')),
    description TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    address TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_general_loc_code ON general.locations(code);
CREATE INDEX IF NOT EXISTS idx_general_loc_type ON general.locations(type);

-- 2. General Calendar Events
CREATE TABLE IF NOT EXISTS general.calendar_events (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date VARCHAR(50) NOT NULL,
    event_time VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    created_by VARCHAR(255),
    is_special_demand BOOLEAN NOT NULL DEFAULT FALSE,
    demand_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    demand_tag VARCHAR(100),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_general_events_dept ON general.calendar_events(department);
CREATE INDEX IF NOT EXISTS idx_general_events_date ON general.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_general_events_special ON general.calendar_events(is_special_demand);
CREATE INDEX IF NOT EXISTS idx_general_events_start_date ON general.calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_general_events_end_date ON general.calendar_events(end_date);

-- 3. General Tasks
CREATE TABLE IF NOT EXISTS general.tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'todo',
    assignee VARCHAR(255),
    due_date VARCHAR(50),
    start_date DATE,
    end_date DATE,
    reminder_count INT NOT NULL DEFAULT 0,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_general_tasks_dept ON general.tasks(department);
CREATE INDEX IF NOT EXISTS idx_general_tasks_status ON general.tasks(status);
CREATE INDEX IF NOT EXISTS idx_general_tasks_priority ON general.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_general_tasks_due_date ON general.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_general_tasks_start_date ON general.tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_general_tasks_end_date ON general.tasks(end_date);

-- 4. Multi-Assignee Tasks Junction
CREATE TABLE IF NOT EXISTS general.task_assignees (
    task_id UUID NOT NULL REFERENCES general.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON general.task_assignees(user_id);

-- 5. Task Notifications Log
CREATE TABLE IF NOT EXISTS general.task_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES general.tasks(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_notif_log_lookup ON general.task_notifications_log(task_id, recipient_email, notification_type);
CREATE INDEX IF NOT EXISTS idx_task_notif_log_sent_at ON general.task_notifications_log(sent_at);

-- 6. Notification Rules
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

CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON general.notification_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_category ON general.notification_rules(category);
CREATE INDEX IF NOT EXISTS idx_notification_rules_channel ON general.notification_rules(channel);

-- 7. Operational Departments
CREATE TABLE IF NOT EXISTS general.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(30) NOT NULL DEFAULT '#6366f1',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_active_order ON general.departments(is_active, display_order);

INSERT INTO general.departments (code, name, color, display_order) VALUES
    ('HR',          'Resurse Umane & Voluntari',   '#ec4899', 1),
    ('FINANCE',     'Financiar & Contabilitate',   '#10b981', 2),
    ('LOGISTICS',   'Logistică & Aprovizionare',   '#f59e0b', 3),
    ('FUNDRAISING', 'Fundraising & Parteneriate',  '#8b5cf6', 4),
    ('LEGAL',       'Juridic & Conformitate',      '#3b82f6', 5),
    ('MARKETING',   'Marketing & Promovare',       '#f97316', 6),
    ('IT',          'Infrastructură & Tehnic',     '#06b6d4', 7),
    ('GENERAL',     'General / Coordonare',        '#6b7280', 8)
ON CONFLICT (code) DO NOTHING;

-- 8. Idempotency Keys for Offline Sync
CREATE TABLE IF NOT EXISTS general.idempotency_keys (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    user_id UUID,
    request_path VARCHAR(255) NOT NULL,
    response_status INT NOT NULL,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON general.idempotency_keys(expires_at);

-- 9. General App Settings
CREATE TABLE IF NOT EXISTS general.app_settings (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Dynamic System Configurations & Snapshots
CREATE TABLE IF NOT EXISTS general.system_configurations (
    config_key VARCHAR(120) PRIMARY KEY,
    category VARCHAR(60) NOT NULL,
    config_value TEXT,
    data_type VARCHAR(30) NOT NULL DEFAULT 'STRING',
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,
    requires_restart BOOLEAN NOT NULL DEFAULT FALSE,
    description_ro TEXT,
    description_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_config_category ON general.system_configurations(category);

CREATE TABLE IF NOT EXISTS general.system_configuration_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_label VARCHAR(120),
    config_payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL
);

INSERT INTO general.system_configurations 
(config_key, category, config_value, data_type, is_secret, requires_restart, description_ro, description_en)
VALUES
    -- BRANDING
    ('APP_TENANT_NAME', 'BRANDING', 'Causeway', 'STRING', FALSE, FALSE, 'Nume Organizație / Platformă', 'Platform / Organization Name'),
    ('APP_TENANT_SHORTHAND', 'BRANDING', 'CAUSEWAY', 'STRING', FALSE, FALSE, 'Denumire Scurtă / Acronim', 'Short Name / Acronym'),
    ('APP_TENANT_TAGLINE', 'BRANDING', 'Platformă de gestiune și campanii caritabile', 'STRING', FALSE, FALSE, 'Slogan / Tagline', 'Slogan / Tagline'),
    ('APP_TENANT_DESCRIPTION', 'BRANDING', 'Platformă de gestiune și campanii caritabile.', 'STRING', FALSE, FALSE, 'Descriere Platformă', 'Platform Description'),
    ('APP_TENANT_MISSION_STATEMENT', 'BRANDING', 'Aducem împreună comunitatea pentru a transforma gesturile mici în speranță și sprijin concret pentru cauze caritabile.', 'STRING', FALSE, FALSE, 'Misiune Organizațională', 'Mission Statement'),
    ('APP_LOGO_URL', 'BRANDING', '/assets/logo.png', 'STRING', FALSE, FALSE, 'URL Logo Principal', 'Main Logo URL'),
    ('APP_LOGO_LIGHT_URL', 'BRANDING', '/assets/logo-light.png', 'STRING', FALSE, FALSE, 'URL Logo Mod Luminos', 'Light Mode Logo URL'),
    ('APP_LOGO_DARK_URL', 'BRANDING', '/assets/logo-dark.png', 'STRING', FALSE, FALSE, 'URL Logo Mod Întunecat', 'Dark Mode Logo URL'),
    ('APP_FAVICON_URL', 'BRANDING', '/favicon.png', 'STRING', FALSE, FALSE, 'URL Favicon', 'Favicon URL'),

    -- THEME
    ('APP_BRAND_COLOR_PRIMARY', 'THEME', '#0b3323', 'STRING', FALSE, FALSE, 'Culoare Primară Hex', 'Primary Color Hex'),
    ('APP_BRAND_COLOR_SECONDARY', 'THEME', '#59101c', 'STRING', FALSE, FALSE, 'Culoare Secundară Hex', 'Secondary Color Hex'),
    ('APP_BRAND_COLOR_ACCENT', 'THEME', '#c3984e', 'STRING', FALSE, FALSE, 'Culoare Accent Hex', 'Accent Color Hex'),
    ('APP_BRAND_COLOR_CREAM', 'THEME', '#f6efe2', 'STRING', FALSE, FALSE, 'Culoare Fond Crem Hex', 'Cream Background Color Hex'),
    ('APP_BRAND_COLOR_CHARCOAL', 'THEME', '#1e1e1e', 'STRING', FALSE, FALSE, 'Culoare Cărbune Hex', 'Charcoal Color Hex'),
    ('APP_BORDER_RADIUS', 'THEME', 'rounded-2xl', 'STRING', FALSE, FALSE, 'Rază Bordură CSS', 'CSS Border Radius'),

    -- INTEGRATIONS
    ('STRIPE_SECRET_KEY', 'INTEGRATIONS', '', 'STRING', TRUE, FALSE, 'Cheie Secretă Stripe', 'Stripe Secret Key'),
    ('STRIPE_WEBHOOK_SECRET', 'INTEGRATIONS', '', 'STRING', TRUE, FALSE, 'Secret Webhook Stripe', 'Stripe Webhook Secret'),
    ('APP_STRIPE_DESCRIPTOR', 'INTEGRATIONS', 'CHARITY DONATION', 'STRING', FALSE, FALSE, 'Descriptor Extras Bancar Stripe', 'Stripe Statement Descriptor'),
    ('GEMINI_API_KEY', 'INTEGRATIONS', '', 'STRING', TRUE, FALSE, 'Cheie API Google Gemini', 'Google Gemini API Key'),
    ('GEMINI_MODEL', 'INTEGRATIONS', 'gemini-3.7-flash', 'STRING', FALSE, FALSE, 'Model Google Gemini Implicit', 'Default Google Gemini Model'),
    ('GOOGLE_MAPS_API_KEY', 'INTEGRATIONS', '', 'STRING', TRUE, FALSE, 'Cheie API Google Maps', 'Google Maps API Key'),
    ('APP_PICKUP_CODE_PREFIX', 'INTEGRATIONS', 'APP-', 'STRING', FALSE, FALSE, 'Prefix Cod Ridicare Donații', 'Donation Pickup Code Prefix'),
    ('WHATSAPP_ENABLED', 'INTEGRATIONS', 'true', 'BOOLEAN', FALSE, FALSE, 'Activare Serviciu WhatsApp', 'Enable WhatsApp Service'),
    ('WHATSAPP_SERVICE_URL', 'INTEGRATIONS', 'http://localhost:3001', 'STRING', FALSE, FALSE, 'URL Serviciu Companion WhatsApp', 'WhatsApp Companion Service URL'),
    ('WHATSAPP_INTERNAL_SECRET', 'INTEGRATIONS', 'app_internal_secret', 'STRING', TRUE, FALSE, 'Secret Intern Serviciu WhatsApp', 'WhatsApp Internal Secret'),
    ('VAPID_SUBJECT', 'INTEGRATIONS', 'mailto:contact@example.org', 'STRING', FALSE, FALSE, 'Contact VAPID PWA Web Push', 'VAPID Web Push Contact Subject'),

    -- EMAIL
    ('SPRING_MAIL_HOST', 'EMAIL', 'smtp.gmail.com', 'STRING', FALSE, FALSE, 'Gazdă Server SMTP', 'SMTP Host'),
    ('SPRING_MAIL_PORT', 'EMAIL', '587', 'NUMBER', FALSE, FALSE, 'Port Server SMTP', 'SMTP Port'),
    ('SPRING_MAIL_USERNAME', 'EMAIL', '', 'STRING', FALSE, FALSE, 'Nume Utilizator SMTP', 'SMTP Username'),
    ('SPRING_MAIL_PASSWORD', 'EMAIL', '', 'STRING', TRUE, FALSE, 'Parolă SMTP / Aplicație', 'SMTP / App Password'),
    ('APP_EMAIL_SENDER_NAME', 'EMAIL', 'Causeway', 'STRING', FALSE, FALSE, 'Nume Expeditor Email', 'Email Sender Name'),
    ('APP_EMAIL_SENDER_ADDRESS', 'EMAIL', 'contact@example.org', 'STRING', FALSE, FALSE, 'Adresă Expeditor Email', 'Email Sender Address'),
    ('CHARITY_EMAIL_FROM', 'EMAIL', 'contact@example.org', 'STRING', FALSE, FALSE, 'Adresă Expeditor Notificări', 'Notification Sender Email'),
    ('RESEND_API_KEY', 'EMAIL', '', 'STRING', TRUE, FALSE, 'Cheie API Resend', 'Resend API Key'),
    ('RESEND_FROM_EMAIL', 'EMAIL', 'contact@example.org', 'STRING', FALSE, FALSE, 'Adresă Expeditor Resend', 'Resend From Email Address'),
    ('RESEND_FROM_NAME', 'EMAIL', 'Causeway', 'STRING', FALSE, FALSE, 'Nume Expeditor Resend', 'Resend From Name'),

    -- SECURITY
    ('JWT_EXPIRATION_HOURS', 'SECURITY', '8', 'NUMBER', FALSE, FALSE, 'Expirare Token JWT (Ore)', 'JWT Expiration (Hours)'),
    ('APP_RATE_LIMITER_TYPE', 'SECURITY', 'memory', 'STRING', FALSE, FALSE, 'Tip Limitator Rata Cereri (memory/redis)', 'Rate Limiter Type (memory/redis)'),
    ('APP_TOTP_ISSUER', 'SECURITY', 'Causeway', 'STRING', FALSE, FALSE, 'Emitent Coduri 2FA TOTP', '2FA TOTP Issuer Name'),

    -- BUSINESS
    ('APP_LOCATION_CITY', 'BUSINESS', 'general city', 'STRING', FALSE, FALSE, 'Oraș Implicit Operațiuni', 'Default Operations City'),
    ('APP_LOCATION_COUNTY', 'BUSINESS', 'general county', 'STRING', FALSE, FALSE, 'Județ Implicit', 'Default County'),
    ('APP_LOCATION_COUNTRY', 'BUSINESS', 'General Country', 'STRING', FALSE, FALSE, 'Țară Implicită', 'Default Country'),
    ('APP_LOCATION_TIMEZONE', 'BUSINESS', 'Europe/Bucharest', 'STRING', FALSE, FALSE, 'Fus Orar Implicit', 'Default Timezone'),
    ('APP_DEFAULT_CURRENCY', 'BUSINESS', 'ron', 'STRING', FALSE, FALSE, 'Monedă Tranzacții Implicită', 'Default Transaction Currency'),
    ('APP_PICKUP_THRESHOLD', 'BUSINESS', '30.0', 'NUMBER', FALSE, FALSE, 'Prag Minim Generare Cod Pickup', 'Minimum Pickup Code Threshold'),
    ('APP_SEASON_NAME', 'BUSINESS', 'Campania 2026', 'STRING', FALSE, FALSE, 'Denumire Sezon / Campanie Curentă', 'Current Campaign / Season Name'),

    -- KERNEL
    ('PORT', 'KERNEL', '8080', 'NUMBER', FALSE, TRUE, 'Port Serviciu HTTP Kernel', 'HTTP Kernel Port'),
    ('APP_SYNC_TO_ENV_FILE', 'KERNEL', 'false', 'BOOLEAN', FALSE, FALSE, 'Sincronizare Automată în Fișier .env.runtime', 'Automatic Sync to .env.runtime File')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value;

-- 11. Dashboard Section Info
CREATE TABLE IF NOT EXISTS general.dashboard_section_info (
    section_key VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    best_practices TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO general.dashboard_section_info (section_key, title, description, best_practices) VALUES
    ('hr', 'Gestiune Resurse Umane & Ture', 'Coordonarea voluntarilor, planificarea schimburilor operative la standuri, pontajul QR/GPS și monitorizarea prezenței.', ARRAY['Asigurați minimum 2 voluntari pe fiecare tură.', 'Verificați pontajul la finalul fiecărui schimb.', 'Rezolvați tichetele de feedback în maximum 24h.']),
    ('finance', 'Gestiune Financiară & Încasări', 'Evidența completă a cheltuielilor, deconturilor, raportărilor zilnice de stand (EoD) și donațiilor procesate.', ARRAY['Verificați reconcilierea dintre numerar și POS la fiecare raport EoD.', 'Toate bonurile și facturile scanate trebuie aprobate înainte de plată.', 'Arhivați extrasele de cont bancar săptămânal.']),
    ('logistics', 'Logistică, Depozite & Stocuri', 'Managementul stocurilor de produse caritabile, transferurile între depozite centrale și standuri, monitorizarea pierderilor.', ARRAY['Efectuați inventarierea fizică a standurilor la deschidere și închidere.', 'Mențineți stocul de siguranță peste pragul minim configurat.', 'Înregistrați imediat orice transfer de produse între depozite.']),
    ('fundraising', 'Parteneriate & Atragere Fonduri', 'Pipeline-ul de companii partenere, contractele de sponsorizare în derulare și registrul donațiilor fizice colectate.', ARRAY['Actualizați statusul fiecărui lead după orice contact telefonic sau email.', 'Generați contractele doar din șabloane validate juridic.', 'Trimiteți rapoarte de impact către toți sponsorii la încheierea campaniei.']),
    ('legal', 'Documente Juridice & Contracte', 'Generarea automatizată a contractelor de sponsorizare și voluntariat din șabloane dinamice, arhivarea documentelor semnate.', ARRAY['Verificați datele fiscale ale companiilor înainte de generarea contractului.', 'Toate contractele semnate trebuie încărcate în format PDF.', 'Nu modificați clauzele standard fără avizul coordonatorului juridic.']),
    ('marketing', 'Resurse Grafice & Promovare', 'Materialele vizuale de promovare sincronizate cu Google Drive, campaniile de comunicare și kiturile media oficiale.', ARRAY['Folosiți doar elementele de identitate vizuală aprobate oficial.', 'Sincronizați periodic folderele media cu Google Drive.', 'Optimizați imaginile pentru web înainte de publicare.']),
    ('projects', 'Project Hub & Inițiative Modulare', 'Arhitectura modulară a inițiativelor: activarea sau dezactivarea capabilităților pe proiecte independente.', ARRAY['Alegeți presetul optim la crearea proiectului pentru a evita supraîncărcarea.', 'Configurați rolurile de acces înainte de lansarea proiectului.', 'Păstrați istoricul activității fiecărui modul activat.']),
    ('it', 'Securitate, Audit & Setări Sistem', 'Controlul accesului bazat pe roluri (RBAC), jurnalul de audit, sincronizarea Google Workspace, WhatsApp și PWA Web Push.', ARRAY['Revizuiți periodic permisiunile acordate rolurilor operaționale.', 'Monitorizați logurile de audit pentru acțiuni suspecte sau modificări critice.', 'Nu divulgați secretele API sau cheile JWT în afara canalelor securizate.'])
ON CONFLICT (section_key) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    best_practices = EXCLUDED.best_practices,
    updated_at = CURRENT_TIMESTAMP;
