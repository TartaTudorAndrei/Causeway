-- Migration V1: Auth & RBAC Domain Schema
CREATE SCHEMA IF NOT EXISTS auth;

-- 1. Admin Users
CREATE TABLE IF NOT EXISTS auth.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    token_version INTEGER NOT NULL DEFAULT 0,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    whatsapp_notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_email ON auth.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_status ON auth.admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_role ON auth.admin_users(role);

-- 2. Two-Factor Authentication Codes
CREATE TABLE IF NOT EXISTS auth.two_factor_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    code_type VARCHAR(50) NOT NULL,
    session_token VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_2fa_admin_user ON auth.two_factor_codes(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_session_token ON auth.two_factor_codes(session_token);

-- 3. Email Verification Tokens
CREATE TABLE IF NOT EXISTS auth.email_verification_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    admin_user_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP NOT NULL,
    pending_shift_id UUID,
    pending_role_id UUID,
    pending_stand_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_token ON auth.email_verification_tokens(token_hash);

-- 4. Password Reset Tokens
CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    admin_user_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON auth.password_reset_tokens(token_hash);

-- 5. Roles & Hierarchy
CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL,
    parent_role_id UUID REFERENCES auth.roles(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roles_parent ON auth.roles(parent_role_id);

-- 6. Permissions Catalog
CREATE TABLE IF NOT EXISTS auth.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50) DEFAULT 'GENERAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON auth.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON auth.permissions(category);

-- 7. Role-Permission Mappings
CREATE TABLE IF NOT EXISTS auth.role_permissions (
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL,
    actor_email VARCHAR(150),
    actor_name VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(255),
    department VARCHAR(50) DEFAULT 'GENERAL',
    scope_type VARCHAR(50) DEFAULT 'GLOBAL',
    scope_id UUID,
    summary TEXT,
    state_changes JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON auth.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_dept ON auth.audit_logs(department);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON auth.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON auth.audit_logs(created_at DESC);

-- 9. Clubs & Affiliations
CREATE TABLE IF NOT EXISTS auth.clubs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    organization_type VARCHAR(50) DEFAULT 'OTHER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. Active Sessions & Refresh Tokens
CREATE TABLE IF NOT EXISTS auth.active_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON auth.active_sessions(user_id);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    session_id VARCHAR(64) REFERENCES auth.active_sessions(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);

-- 11. User PWA Push Subscriptions
CREATE TABLE IF NOT EXISTS auth.user_pwa_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh VARCHAR(255),
    auth VARCHAR(255),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_pwa_sub_user_id ON auth.user_pwa_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pwa_sub_endpoint ON auth.user_pwa_subscriptions(endpoint);

-- -----------------------------------------------------------------------------
-- SEED DATA: Roles, Role Hierarchy, Base Clubs, Core Permissions Catalog
-- -----------------------------------------------------------------------------

-- Base Roles
INSERT INTO auth.roles (id, name, description, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ADMIN',               'Administrator de sistem cu acces complet',                true),
    ('00000000-0000-0000-0000-000000000002', 'IT_ADMIN',            'Administrator IT și infrastructură tehnică',              false),
    ('00000000-0000-0000-0000-000000000003', 'FINANCE_HEAD',        'Coordonator departament financiar',                       false),
    ('00000000-0000-0000-0000-000000000004', 'FINANCE_MEMBER',      'Membru departament financiar',                            false),
    ('00000000-0000-0000-0000-000000000005', 'HR_HEAD',             'Coordonator departament resurse umane & voluntari',       false),
    ('00000000-0000-0000-0000-000000000006', 'HR_MEMBER',           'Membru departament resurse umane',                        false),
    ('00000000-0000-0000-0000-000000000007', 'LOGISTICS_HEAD',      'Coordonator departament logistică și stocuri',            false),
    ('00000000-0000-0000-0000-000000000008', 'LOGISTICS_MEMBER',    'Membru departament logistică',                            false),
    ('00000000-0000-0000-0000-000000000009', 'FUNDRAISING_HEAD',     'Coordonator atragere de fonduri și parteneriate',         false),
    ('00000000-0000-0000-0000-000000000010', 'FUNDRAISING_MEMBER',   'Membru departament fundraising',                          false),
    ('00000000-0000-0000-0000-000000000011', 'LEGAL_HEAD',          'Coordonator departament juridic',                         false),
    ('00000000-0000-0000-0000-000000000012', 'LEGAL_MEMBER',        'Membru departament juridic',                              false),
    ('00000000-0000-0000-0000-000000000013', 'MARKETING_HEAD',      'Coordonator departament promovare și imagine',            false),
    ('00000000-0000-0000-0000-000000000014', 'MARKETING_MEMBER',    'Membru departament marketing',                            false),
    ('00000000-0000-0000-0000-000000000015', 'VOLUNTEER',           'Voluntar general de campanie',                            true),
    ('00000000-0000-0000-0000-000000000016', 'PROJECT_CREATOR',     'Permisiune de a crea și gestiona proiecte în Hub',        false),
    ('00000000-0000-0000-0000-000000000017', 'CONFIG_INHERITOR',    'Permisiune de a moșteni configurațiile din Hub',          false)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system;

-- Role Hierarchy Tree Rooted at ADMIN
UPDATE auth.roles
SET parent_role_id = (SELECT id FROM auth.roles WHERE name = 'ADMIN')
WHERE name IN (
    'IT_ADMIN', 'FINANCE_HEAD', 'HR_HEAD', 'LOGISTICS_HEAD',
    'FUNDRAISING_HEAD', 'LEGAL_HEAD', 'MARKETING_HEAD'
);

UPDATE auth.roles
SET parent_role_id = (SELECT id FROM auth.roles WHERE name = 'FINANCE_HEAD')
WHERE name = 'FINANCE_MEMBER';

UPDATE auth.roles
SET parent_role_id = (SELECT id FROM auth.roles WHERE name = 'HR_HEAD')
WHERE name = 'HR_MEMBER';

UPDATE auth.roles
SET parent_role_id = (SELECT id FROM auth.roles WHERE name = 'LOGISTICS_HEAD')
WHERE name = 'LOGISTICS_MEMBER';

UPDATE auth.roles
SET parent_role_id = (SELECT id FROM auth.roles WHERE name = 'FUNDRAISING_HEAD')
WHERE name = 'FUNDRAISING_MEMBER';

UPDATE auth.roles
SET parent_role_id = (SELECT id FROM auth.roles WHERE name = 'LEGAL_HEAD')
WHERE name = 'LEGAL_MEMBER';

UPDATE auth.roles
SET parent_role_id = (SELECT id FROM auth.roles WHERE name = 'MARKETING_HEAD')
WHERE name = 'MARKETING_MEMBER';

-- Base Clubs / Affiliations Seed
INSERT INTO auth.clubs (id, name, organization_type, created_at, updated_at) VALUES
    ('ac000000-0000-0000-0000-000000000001', 'Rotaract Community', 'Rotaract', NOW(), NOW()),
    ('ac000000-0000-0000-0000-000000000002', 'Leo Club Phoenix',     'Leo',      NOW(), NOW()),
    ('ac000000-0000-0000-0000-000000000003', 'AIESEC Community',     'AIESEC',   NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
    organization_type = EXCLUDED.organization_type,
    updated_at = NOW();

-- Hierarchical Permissions Catalog
INSERT INTO auth.permissions (id, code, description, category) VALUES
    -- GENERAL
    (gen_random_uuid(), 'general:calendar:read',                    'Vizualizare calendar evenimente și sarcini',       'GENERAL'),
    (gen_random_uuid(), 'general:calendar:events:read',             'Vizualizare evenimente din calendar',              'GENERAL'),
    (gen_random_uuid(), 'general:calendar:events:write',            'Creare și editare evenimente în calendar',         'GENERAL'),
    (gen_random_uuid(), 'general:calendar:events:delete',           'Ștergere evenimente din calendar',                 'GENERAL'),
    (gen_random_uuid(), 'general:tasks:read',                      'Vizualizare listă sarcini operaționale',           'GENERAL'),
    (gen_random_uuid(), 'general:tasks:write',                     'Creare, actualizare și atribuire sarcini',         'GENERAL'),
    (gen_random_uuid(), 'general:tasks:delete',                    'Ștergere sarcini',                                 'GENERAL'),
    (gen_random_uuid(), 'general:locations:read',                  'Vizualizare locații operaționale',                 'GENERAL'),
    (gen_random_uuid(), 'general:locations:write',                 'Creare și editare locații',                        'GENERAL'),
    (gen_random_uuid(), 'general:locations:delete',                'Ștergere locații',                                 'GENERAL'),
    (gen_random_uuid(), 'general:map:read',                        'Vizualizare hartă operațională și obiective',      'GENERAL'),
    (gen_random_uuid(), 'general:statistics:read',                 'Vizualizare statistici generale',                  'GENERAL'),
    (gen_random_uuid(), 'general:section_info:read',               'Vizualizare descrieri și detalii secțiuni panou',  'GENERAL'),
    (gen_random_uuid(), 'general:section_info:manage',             'Editare ghiduri și descrieri secțiuni panou',      'GENERAL'),

    -- FINANCE
    (gen_random_uuid(), 'finance:expenses:read',                   'Vizualizare registru cheltuieli',                  'FINANCE'),
    (gen_random_uuid(), 'finance:expenses:write',                  'Adăugare și editare cereri cheltuieli',            'FINANCE'),
    (gen_random_uuid(), 'finance:expenses:delete',                 'Ștergere înregistrări cheltuieli',                 'FINANCE'),
    (gen_random_uuid(), 'finance:expenses:approve',                'Aprobare și decontare plăți cheltuieli',           'FINANCE'),
    (gen_random_uuid(), 'finance:expenses:ai_scan:write',          'Scanare bonuri/facturi cu asistent AI',            'FINANCE'),
    (gen_random_uuid(), 'finance:donations:read',                  'Vizualizare donații online',                       'FINANCE'),
    (gen_random_uuid(), 'finance:donations:write',                 'Înregistrare donații online',                      'FINANCE'),
    (gen_random_uuid(), 'finance:stands:read',                     'Vizualizare situație financiară standuri',         'FINANCE'),
    (gen_random_uuid(), 'finance:stands:eod:read',                 'Vizualizare rapoarte financiare EoD stand',        'FINANCE'),
    (gen_random_uuid(), 'finance:stands:eod:write',                'Completare raport financiar EoD stand',            'FINANCE'),
    (gen_random_uuid(), 'finance:stands:cash:approve',             'Aprobare predare numerar/încasări stand',          'FINANCE'),
    (gen_random_uuid(), 'finance:sponsorships:read',               'Vizualizare sponsorizări financiare',              'FINANCE'),
    (gen_random_uuid(), 'finance:sponsorships:write',              'Adăugare și editare sponsorizări financiare',      'FINANCE'),
    (gen_random_uuid(), 'finance:sponsorships:delete',             'Ștergere sponsorizări',                            'FINANCE'),
    (gen_random_uuid(), 'finance:other_incomes:read',              'Vizualizare alte încasări',                        'FINANCE'),
    (gen_random_uuid(), 'finance:other_incomes:write',             'Adăugare și editare alte încasări',                'FINANCE'),
    (gen_random_uuid(), 'finance:other_incomes:delete',            'Ștergere alte încasări',                           'FINANCE'),
    (gen_random_uuid(), 'finance:statistics:read',                 'Vizualizare statistici și grafice financiare',     'FINANCE'),
    (gen_random_uuid(), 'finance:reports:export',                  'Export rapoarte financiare și balanțe',            'FINANCE'),

    -- HR & VOLUNTEERS
    (gen_random_uuid(), 'hr:stands:read',                          'Vizualizare standuri și programare ture',          'HR'),
    (gen_random_uuid(), 'hr:stands:shifts:read',                   'Vizualizare ture și voluntari alocați',            'HR'),
    (gen_random_uuid(), 'hr:stands:shifts:write',                  'Alocare și modificare voluntari pe ture',          'HR'),
    (gen_random_uuid(), 'hr:stands:shifts:delete',                 'Ștergere ture sau alocări',                        'HR'),
    (gen_random_uuid(), 'hr:stands:locations:read',                'Vizualizare locații standuri HR',                  'HR'),
    (gen_random_uuid(), 'hr:stands:locations:write',               'Configurare și editare locații standuri',          'HR'),
    (gen_random_uuid(), 'hr:stands:locations:delete',              'Ștergere locații standuri',                        'HR'),
    (gen_random_uuid(), 'hr:members:read',                         'Vizualizare director membri și voluntari',         'HR'),
    (gen_random_uuid(), 'hr:members:write',                        'Adăugare și editare profiluri voluntari/membri',   'HR'),
    (gen_random_uuid(), 'hr:members:delete',                       'Ștergere profiluri voluntari',                     'HR'),
    (gen_random_uuid(), 'hr:attendance:write',                     'Înregistrare pontaj GPS și cod QR voluntar',       'HR'),
    (gen_random_uuid(), 'hr:feedback:read',                        'Vizualizare tichete feedback și reclamații',       'HR'),
    (gen_random_uuid(), 'hr:feedback:manage',                      'Soluționare, adăugare notițe și categorii feedback','HR'),
    (gen_random_uuid(), 'hr:feedback:delete',                      'Ștergere feedback/spam',                           'HR'),
    (gen_random_uuid(), 'hr:statistics:read',                      'Vizualizare statistici prezență și voluntariat',   'HR'),

    -- LOGISTICS
    (gen_random_uuid(), 'logistics:inventory:items:read',          'Vizualizare articole din inventar',                'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:items:write',         'Adăugare și editare fișe produse/articole',        'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:items:delete',        'Ștergere articole din catalogul de produse',       'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:stocks:read',         'Vizualizare nivel stocuri pe depozite/standuri',   'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:transfers:read',      'Vizualizare istoric transferuri și alimentări',    'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:transfers:write',     'Efectuare transfer de stoc între locații',         'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:adjustments:read',    'Vizualizare ajustări și inventarieri stoc',        'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:adjustments:write',   'Înregistrare corecții și pierderi stoc',           'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:locations:read',      'Vizualizare depozite și spații stocare',           'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:locations:write',     'Configurare depozite și puncte logistice',         'LOGISTICS'),
    (gen_random_uuid(), 'logistics:inventory:locations:delete',    'Ștergere depozite/locații logistice',              'LOGISTICS'),
    (gen_random_uuid(), 'logistics:stands:stock:read',             'Vizualizare necesar stoc și consum standuri',      'LOGISTICS'),
    (gen_random_uuid(), 'logistics:stands:eod:read',               'Vizualizare rapoarte stoc EoD stand',              'LOGISTICS'),
    (gen_random_uuid(), 'logistics:stands:eod:write',              'Completare raport stoc EoD stand',                 'LOGISTICS'),
    (gen_random_uuid(), 'logistics:stands:eod:delete',             'Ștergere raport stoc EoD',                         'LOGISTICS'),
    (gen_random_uuid(), 'logistics:predictions:read',              'Vizualizare algoritmi predicție și optimizare stoc','LOGISTICS'),
    (gen_random_uuid(), 'logistics:statistics:read',               'Vizualizare statistici logistice și consum',       'LOGISTICS'),

    -- FUNDRAISING
    (gen_random_uuid(), 'fundraising:sponsors:read',               'Vizualizare parteneriate și sponsori',             'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:sponsors:write',              'Adăugare și actualizare contacte/acorduri sponsori','FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:sponsors:delete',             'Ștergere dosare sponsori',                         'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:leads:read',                  'Vizualizare companii potențiale (Leads)',          'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:leads:write',                 'Gestionare status pipeline sponsori potențiali',   'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:finished:read',               'Vizualizare acorduri sponsori finalizate',         'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:donations:read',              'Vizualizare registru colectare donații fizice',    'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:donations:write',             'Înregistrare și confirmare ridicare donații',      'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:statistics:read',             'Vizualizare statistici atragere fonduri',          'FUNDRAISING'),

    -- LEGAL
    (gen_random_uuid(), 'legal:templates:read',                    'Vizualizare șabloane contracte juridice',          'LEGAL'),
    (gen_random_uuid(), 'legal:templates:write',                   'Creare și editare șabloane contractuale',          'LEGAL'),
    (gen_random_uuid(), 'legal:templates:delete',                  'Ștergere șabloane juridice',                       'LEGAL'),
    (gen_random_uuid(), 'legal:templates:import:write',            'Import șabloane din Google Docs',                  'LEGAL'),
    (gen_random_uuid(), 'legal:contracts:read',                    'Vizualizare contracte emise și semnate',          'LEGAL'),
    (gen_random_uuid(), 'legal:contracts:write',                   'Generare și redactare contracte noi',              'LEGAL'),
    (gen_random_uuid(), 'legal:contracts:delete',                  'Ștergere contracte generate',                      'LEGAL'),
    (gen_random_uuid(), 'legal:contracts:pdf:export',              'Descărcare și export PDF contracte',               'LEGAL'),
    (gen_random_uuid(), 'legal:statistics:read',                   'Vizualizare indicatori juridici și contracte',     'LEGAL'),

    -- MARKETING
    (gen_random_uuid(), 'marketing:resources:read',                'Vizualizare fișiere și materiale grafice media',   'MARKETING'),
    (gen_random_uuid(), 'marketing:resources:export',              'Descărcare kituri grafice și materiale media',     'MARKETING'),
    (gen_random_uuid(), 'marketing:campaigns:read',                'Vizualizare campanii și calendar promovare',       'MARKETING'),
    (gen_random_uuid(), 'marketing:campaigns:write',               'Planificare și coordonare promovare media',        'MARKETING'),
    (gen_random_uuid(), 'marketing:statistics:read',               'Vizualizare statistici campanii marketing',        'MARKETING'),

    -- IT & ADMINISTRATION
    (gen_random_uuid(), 'it:users:read',                           'Vizualizare listă conturi utilizatori platformă',  'IT'),
    (gen_random_uuid(), 'it:users:write',                          'Aprobare, suspendare și editare conturi',          'IT'),
    (gen_random_uuid(), 'it:users:roles:manage',                   'Atribuire și schimbare roluri utilizatori',        'IT'),
    (gen_random_uuid(), 'it:roles:read',                           'Vizualizare matrice roluri și permisiuni',         'IT'),
    (gen_random_uuid(), 'it:roles:write',                          'Creare și configurare roluri personalizate',       'IT'),
    (gen_random_uuid(), 'it:roles:delete',                         'Ștergere roluri personalizate',                    'IT'),
    (gen_random_uuid(), 'roles:create',                            'Creare și configurare roluri personalizate',       'IT'),
    (gen_random_uuid(), 'roles:assign',                            'Atribuire roluri către utilizatori',               'IT'),
    (gen_random_uuid(), 'roles:delete',                            'Ștergere roluri personalizate neutilizate',        'IT'),
    (gen_random_uuid(), 'it:audit:read',                           'Vizualizare jurnal audit și activitate securitate','IT'),
    (gen_random_uuid(), 'it:audit:write',                          'Înregistrare evenimente în jurnalul de audit',      'IT'),
    (gen_random_uuid(), 'it:audit:export',                         'Export fișiere jurnal de audit',                   'IT'),
    (gen_random_uuid(), 'it:sync:read',                            'Vizualizare status sincronizare Google Sheets/Drive','IT'),
    (gen_random_uuid(), 'it:sync:manage',                          'Declanșare sincronizare manuală Google Drive/Sheets','IT'),
    (gen_random_uuid(), 'it:whatsapp:read',                        'Vizualizare status și mesaje WhatsApp',            'IT'),
    (gen_random_uuid(), 'it:whatsapp:write',                       'Trimitere notificări WhatsApp manuale/test',       'IT'),
    (gen_random_uuid(), 'it:whatsapp:manage',                      'Configurare reguli automate și conectare QR WhatsApp','IT'),
    (gen_random_uuid(), 'it:pwa:read',                             'Vizualizare status și utilizatori abonați PWA',    'IT'),
    (gen_random_uuid(), 'it:pwa:write',                            'Trimitere notificări Push PWA manuale/test',       'IT'),
    (gen_random_uuid(), 'it:pwa:manage',                           'Configurare reguli automate push notifications PWA','IT'),
    (gen_random_uuid(), 'it:statistics:read',                      'Vizualizare metrici și loguri de sistem',          'IT'),
    (gen_random_uuid(), 'it:config:manage',                        'Configurare dinamică a sistemului și variabilelor de mediu', 'IT'),
    (gen_random_uuid(), 'it:config:read',                          'Vizualizare configurări sistem',                   'IT'),
    (gen_random_uuid(), 'SYSTEM_CONFIG_MANAGE',                    'Gestiune completă a configurării dinamice de sistem', 'IT')
ON CONFLICT (code) DO UPDATE 
SET description = EXCLUDED.description,
    category = EXCLUDED.category;

-- Map full permissions to ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Map IT_ADMIN permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'IT_ADMIN'
  AND (p.category IN ('IT', 'GENERAL') OR p.code LIKE 'it:%' OR p.code LIKE 'general:%' OR p.code LIKE 'roles:%')
ON CONFLICT DO NOTHING;

-- Map FINANCE_HEAD permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'FINANCE_HEAD'
  AND (p.category IN ('FINANCE', 'GENERAL') OR p.code LIKE 'finance:%' OR p.code LIKE 'general:%')
ON CONFLICT DO NOTHING;

-- Map FINANCE_MEMBER permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'FINANCE_MEMBER'
  AND (
    p.code IN (
      'finance:expenses:read', 'finance:expenses:write', 'finance:expenses:ai_scan:write',
      'finance:stands:read', 'finance:stands:eod:write', 'finance:stands:cash:approve',
      'finance:statistics:read'
    )
    OR p.code LIKE 'general:%:read'
  )
ON CONFLICT DO NOTHING;

-- Map HR_HEAD permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'HR_HEAD'
  AND (p.category IN ('HR', 'GENERAL') OR p.code LIKE 'hr:%' OR p.code LIKE 'general:%')
ON CONFLICT DO NOTHING;

-- Map HR_MEMBER permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'HR_MEMBER'
  AND (
    p.code IN (
      'hr:stands:read', 'hr:stands:shifts:write', 'hr:members:read',
      'hr:attendance:write', 'hr:feedback:read', 'hr:statistics:read'
    )
    OR p.code LIKE 'general:%:read'
  )
ON CONFLICT DO NOTHING;

-- Map LOGISTICS_HEAD permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'LOGISTICS_HEAD'
  AND (p.category IN ('LOGISTICS', 'GENERAL') OR p.code LIKE 'logistics:%' OR p.code LIKE 'general:%')
ON CONFLICT DO NOTHING;

-- Map LOGISTICS_MEMBER permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'LOGISTICS_MEMBER'
  AND (
    p.code IN (
      'logistics:inventory:items:read', 'logistics:inventory:stocks:read',
      'logistics:inventory:transfers:write', 'logistics:stands:stock:read',
      'logistics:stands:eod:write'
    )
    OR p.code LIKE 'general:%:read'
  )
ON CONFLICT DO NOTHING;

-- Map FUNDRAISING_HEAD permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'FUNDRAISING_HEAD'
  AND (p.category IN ('FUNDRAISING', 'GENERAL') OR p.code LIKE 'fundraising:%' OR p.code LIKE 'general:%')
ON CONFLICT DO NOTHING;

-- Map FUNDRAISING_MEMBER permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'FUNDRAISING_MEMBER'
  AND (
    p.code IN (
      'fundraising:sponsors:read', 'fundraising:sponsors:write', 'fundraising:leads:read',
      'fundraising:leads:write', 'fundraising:finished:read', 'fundraising:donations:read',
      'fundraising:statistics:read'
    )
    OR p.code LIKE 'general:%:read'
  )
ON CONFLICT DO NOTHING;

-- Map LEGAL_HEAD permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'LEGAL_HEAD'
  AND (p.category IN ('LEGAL', 'GENERAL') OR p.code LIKE 'legal:%' OR p.code LIKE 'general:%')
ON CONFLICT DO NOTHING;

-- Map LEGAL_MEMBER permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'LEGAL_MEMBER'
  AND (
    p.code IN (
      'legal:templates:read', 'legal:contracts:read', 'legal:contracts:pdf:export',
      'legal:statistics:read'
    )
    OR p.code LIKE 'general:%:read'
  )
ON CONFLICT DO NOTHING;

-- Map MARKETING_HEAD permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'MARKETING_HEAD'
  AND (p.category IN ('MARKETING', 'GENERAL') OR p.code LIKE 'marketing:%' OR p.code LIKE 'general:%')
ON CONFLICT DO NOTHING;

-- Map MARKETING_MEMBER permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'MARKETING_MEMBER'
  AND (
    p.code IN (
      'marketing:resources:read', 'marketing:resources:export', 'marketing:campaigns:read'
    )
    OR p.code LIKE 'general:%:read'
  )
ON CONFLICT DO NOTHING;

-- Map VOLUNTEER permissions
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'VOLUNTEER'
  AND p.code IN (
    'general:calendar:read',
    'general:calendar:events:read',
    'general:tasks:read',
    'general:locations:read',
    'general:map:read',
    'hr:attendance:write'
  )
ON CONFLICT DO NOTHING;
