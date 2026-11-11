-- ==============================================================================
-- CHARITY WEBAPP: Comprehensive Test Database Seed Script
-- WARNING: Intended ONLY for local development or test/staging database branches.
-- ==============================================================================

DO $$
BEGIN
    -- Safety Check: Prevent running on accidental production naming if configured
    IF current_database() IN ('charity_production', 'charity_prod', 'production') THEN
        RAISE EXCEPTION 'CRITICAL ABORT: Running seed script on PRODUCTION database % is blocked!', current_database();
    END IF;
    RAISE NOTICE 'Starting deterministic test data population on database: %', current_database();
END $$;

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. AUTH & USERS DOMAIN (auth.admin_users, auth.roles, auth.clubs)
-- ------------------------------------------------------------------------------

-- Ensure base clubs exist
INSERT INTO auth.clubs (id, name, organization_type, created_at, updated_at)
VALUES 
    ('ac000000-0000-0000-0000-000000000001', 'Rotaract Community', 'Rotaract', NOW(), NOW()),
    ('ac000000-0000-0000-0000-000000000002', 'Leo Club Phoenix', 'Leo', NOW(), NOW()),
    ('ac000000-0000-0000-0000-000000000003', 'AIESEC Community', 'AIESEC', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
    organization_type = EXCLUDED.organization_type,
    updated_at = NOW();

-- Seed known test accounts (PBKDF2 hash for 'Password123!')
-- Format: iterations:salt:hash
INSERT INTO auth.admin_users (
    id, full_name, email, password_hash, status, role, roles, phone, organization_type, organization_details, auth_provider, created_at
) VALUES
    ('bc000000-0000-0000-0000-000000000000', 'Super Admin', 'superadmin@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'ADMIN', 'ADMIN', '+40700000000', 'INTERNAL', 'Administrator Principal', 'LOCAL', NOW() - INTERVAL '90 days'),
    ('bc000000-0000-0000-0000-000000000001', 'Admin General', 'admin@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'ADMIN', 'ADMIN', '+40700000001', 'INTERNAL', 'Core Team', 'LOCAL', NOW() - INTERVAL '90 days'),
    ('bc000000-0000-0000-0000-000000000002', 'Elena Popescu (HR Lead)', 'hr.lead@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'HR_HEAD', 'HR_HEAD', '+40700000002', 'INTERNAL', 'Departament HR', 'LOCAL', NOW() - INTERVAL '60 days'),
    ('bc000000-0000-0000-0000-000000000003', 'Mihai Ionescu (Finance Lead)', 'finance.lead@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'FINANCE_HEAD', 'FINANCE_HEAD', '+40700000003', 'INTERNAL', 'Departament Financiar', 'LOCAL', NOW() - INTERVAL '60 days'),
    ('bc000000-0000-0000-0000-000000000004', 'Radu Dumitrescu (Logistics)', 'logistics.lead@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'LOGISTICS_HEAD', 'LOGISTICS_HEAD', '+40700000004', 'INTERNAL', 'Gestiune & Stocuri', 'LOCAL', NOW() - INTERVAL '60 days'),
    ('bc000000-0000-0000-0000-000000000005', 'Andreea Marin (Fundraising)', 'fundraising.lead@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'FUNDRAISING_HEAD', 'FUNDRAISING_HEAD', '+40700000005', 'INTERNAL', 'Parteneriate & Sponsorizări', 'LOCAL', NOW() - INTERVAL '60 days'),
    ('bc000000-0000-0000-0000-000000000006', 'Cristian Vasile (Legal)', 'legal.lead@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'LEGAL_HEAD', 'LEGAL_HEAD', '+40700000006', 'INTERNAL', 'Departament Juridic', 'LOCAL', NOW() - INTERVAL '60 days'),
    
    -- Volunteers with different profile states
    ('bc000000-0000-0000-0000-000000000010', 'Alexandru Stan', 'alex.voluntar@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000010', 'CLUB', 'Rotaract Community', 'LOCAL', NOW() - INTERVAL '40 days'),
    ('bc000000-0000-0000-0000-000000000011', 'Diana Munteanu', 'diana.voluntar@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000011', 'INDIVIDUAL', 'Voluntar Independent', 'LOCAL', NOW() - INTERVAL '30 days'),
    ('bc000000-0000-0000-0000-000000000012', 'Vlad Gheorghiu', 'vlad.voluntar@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000012', 'CLUB', 'Leo Club Phoenix', 'LOCAL', NOW() - INTERVAL '20 days'),
    ('bc000000-0000-0000-0000-000000000013', 'Ioana Costea', 'ioana.voluntar@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000013', 'INDIVIDUAL', 'Student UBB', 'LOCAL', NOW() - INTERVAL '15 days'),
    ('bc000000-0000-0000-0000-000000000014', 'George Enache', 'george.voluntar@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000014', 'INDIVIDUAL', 'Elev Liceu', 'LOCAL', NOW() - INTERVAL '10 days'),
    ('bc000000-0000-0000-0000-000000000015', 'Simona Florescu', 'simona.voluntar@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000015', 'CLUB', 'AIESEC Community', 'LOCAL', NOW() - INTERVAL '5 days'),
    ('bc000000-0000-0000-0000-000000000016', 'Laura Marin', 'laura.marin@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000016', 'INDIVIDUAL', 'Voluntar Independent', 'LOCAL', NOW() - INTERVAL '15 days'),
    ('bc000000-0000-0000-0000-000000000017', 'Bogdan Stan', 'bogdan.stan@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000017', 'INDIVIDUAL', 'Voluntar Independent', 'LOCAL', NOW() - INTERVAL '15 days'),
    ('bc000000-0000-0000-0000-000000000018', 'Roxana Tudor', 'roxana.tudor@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000018', 'INDIVIDUAL', 'Voluntar Independent', 'LOCAL', NOW() - INTERVAL '15 days'),
    ('bc000000-0000-0000-0000-000000000019', 'Cristian Vasilescu', 'cristi.vasilescu@example.org', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'APPROVED', 'VOLUNTEER', 'VOLUNTEER', '+40700000019', 'INDIVIDUAL', 'Voluntar Independent', 'LOCAL', NOW() - INTERVAL '15 days'),

    ('bc000000-0000-0000-0000-000000000020', 'Paul Nou-Inscris (Pending)', 'paul.pending@test.com', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'PENDING_APPROVAL', 'VOLUNTEER', 'VOLUNTEER', '+40700000020', 'INDIVIDUAL', 'Așteaptă validare', 'LOCAL', NOW() - INTERVAL '1 days'),
    ('bc000000-0000-0000-0000-000000000021', 'Mircea Suspendat (Suspended)', 'mircea.suspended@test.com', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'SUSPENDED', 'VOLUNTEER', 'VOLUNTEER', '+40700000021', 'INDIVIDUAL', 'Cont blocat disciplinar', 'LOCAL', NOW() - INTERVAL '45 days'),
    ('bc000000-0000-0000-0000-000000000022', 'Dorin Respins (Rejected)', 'dorin.rejected@test.com', '600000:ZzUOEPTRPd+Ab7RYDXnOeQ==:Uj9ab9de+m1fdLX+EbvITfjV1mapDwfMJa6zh3AWawA=', 'REJECTED', 'VOLUNTEER', 'VOLUNTEER', '+40700000022', 'INDIVIDUAL', 'Date de contact invalide', 'LOCAL', NOW() - INTERVAL '25 days')
ON CONFLICT (id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    status = EXCLUDED.status,
    role = EXCLUDED.role,
    roles = EXCLUDED.roles,
    organization_type = EXCLUDED.organization_type,
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 2. GENERAL DOMAIN (Departments, Locations, Tasks, Events)
-- ------------------------------------------------------------------------------

INSERT INTO general.departments (id, name, key, fallback, display_order)
VALUES
    ('general', 'General', 'general.deptGeneral', 'General', 1),
    ('finance', 'Finanțe', 'general.deptFinance', 'Finances', 2),
    ('it', 'IT & Securitate', 'general.deptIT', 'IT', 3),
    ('fundraising', 'Fundraising', 'general.deptFundraising', 'Fundraising', 4),
    ('logistics', 'Logistică', 'general.deptLogistics', 'Logistics', 5),
    ('hr', 'Resurse Umane', 'general.deptHR', 'HR', 6),
    ('legal', 'Legal', 'general.deptLegal', 'Legal', 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO general.locations (id, name, code, type, description, latitude, longitude, address, is_system)
VALUES
    ('ab000000-0000-0000-0000-000000000001', 'Depozit Central', 'DEP-CENTRAL', 'DEPOSIT', 'Depozitul central de marfă și echipamente', 46.7712000, 23.6000000, 'Str. Fabricii 12, general city', true),
    ('ab000000-0000-0000-0000-000000000002', 'Stand Piața Unirii', 'STAND-UNIRII', 'STAND', 'Stand caritabil Piața Unirii', 46.7693000, 23.5898000, 'Piața Unirii, general city', true),
    ('ab000000-0000-0000-0000-000000000003', 'Stand Iulius Mall', 'STAND-IULIUS', 'STAND', 'Stand interior parter Iulius Mall', 46.7725000, 23.6255000, 'Str. Alexandru Vaida Voevod 53B', true),
    ('ab000000-0000-0000-0000-000000000004', 'Stand Vivo Mall', 'STAND-VIVO', 'STAND', 'Stand intrarea 2 Vivo Center', 46.7511000, 23.5322000, 'Str. Avram Iancu 492-500, Florești', false)
ON CONFLICT (name) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    address = EXCLUDED.address;

INSERT INTO general.calendar_events (id, title, description, event_date, event_time, department, created_by, is_special_demand, demand_multiplier, demand_tag)
VALUES
    ('ae000000-0000-0000-0000-000000000001', 'Campania de Toamnă - Deschidere', 'Lansare standuri stradale și colectă fonduri', TO_CHAR(CURRENT_DATE - INTERVAL '14 days', 'YYYY-MM-DD'), '10:00', 'GENERAL', 'Admin General', false, 1.0, NULL),
    ('ae000000-0000-0000-0000-000000000002', 'Weekend Mare / Aflux Public Piața Unirii', 'Flux crescut vizitatori concert central', TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'), '12:00', 'HR', 'Elena Popescu (HR Lead)', true, 1.75, 'HIGH_TRAFFIC'),
    ('ae000000-0000-0000-0000-000000000003', 'Ședință Coordonare Voluntari & Evaluare', 'Întâlnire lunară cu liderii de cluburi', TO_CHAR(CURRENT_DATE + INTERVAL '5 days', 'YYYY-MM-DD'), '18:30', 'HR', 'Elena Popescu (HR Lead)', false, 1.0, NULL),
    ('ae000000-0000-0000-0000-000000000004', 'Eveniment Caritabil Gala Charity', 'Gala anuală de strângere de fonduri', TO_CHAR(CURRENT_DATE + INTERVAL '20 days', 'YYYY-MM-DD'), '19:00', 'FUNDRAISING', 'Andreea Marin', true, 2.0, 'GALA_ANNUAL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO general.tasks (id, title, description, department, priority, status, assignee, assignee_ids, due_date, created_by)
VALUES
    ('af000000-0000-0000-0000-000000000001', 'Verificare stoc căni campanie', 'Numărătoarea fizică a stocului de căni ceramice înainte de weekend', 'LOGISTICS', 'high', 'completed', 'Radu Dumitrescu', '["u1000000-0000-0000-0000-000000000004"]', TO_CHAR(CURRENT_DATE - INTERVAL '3 days', 'YYYY-MM-DD'), 'Admin General'),
    ('af000000-0000-0000-0000-000000000002', 'Aprobare cereri de înscriere voluntari', 'Validare profiluri noi intrate în platformă', 'HR', 'high', 'in_progress', 'Elena Popescu', '["u1000000-0000-0000-0000-000000000002"]', TO_CHAR(CURRENT_DATE + INTERVAL '1 days', 'YYYY-MM-DD'), 'Admin General'),
    ('af000000-0000-0000-0000-000000000003', 'Generare raport lunar reconciliere POS', 'Compară încasările din POS cu extrasele bancare', 'FINANCE', 'medium', 'todo', 'Mihai Ionescu', '["u1000000-0000-0000-0000-000000000003"]', TO_CHAR(CURRENT_DATE + INTERVAL '4 days', 'YYYY-MM-DD'), 'Admin General'),
    ('af000000-0000-0000-0000-000000000004', 'Semnare contract sponsorizare BCR', 'Transmitere documente semnate către departamentul juridic', 'LEGAL', 'urgent', 'todo', 'Cristian Vasile', '["u1000000-0000-0000-0000-000000000006"]', TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'YYYY-MM-DD'), 'Andreea Marin')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. HR DOMAIN: MULTI-WEEK STANDS, SHIFTS, ASSIGNMENTS (WITH EDGE CASES)
-- ------------------------------------------------------------------------------

-- Ensure base roles exist
INSERT INTO hr.stand_roles (id, name, description, is_system, category)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Finance Responsible', 'Responsabil cu încasările, casa de marcat și formularul EoD', true, 'FINANCE'),
    ('10000000-0000-0000-0000-000000000003', 'Logistics Responsible', 'Responsabil cu stocul de mărfuri și echipamentul tehnic', true, 'LOGISTICS'),
    ('10000000-0000-0000-0000-000000000005', 'Volunteer', 'Voluntar general pentru informare și promovare', true, 'GENERAL')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;

-- Stands covering:
-- Week -2 (Completed)
-- Week -1 (Completed with issues)
-- Week 0 (Today / Active)
-- Week +1 (Future / Planned)
INSERT INTO hr.stands (id, location_name, event_name, event_date, status, qr_code_token, notes)
VALUES
    -- Past Week -2
    ('ba000000-0000-0000-0000-000000000001', 'Stand Piața Unirii', 'Campanie Toamnă Săpt 1', CURRENT_DATE - INTERVAL '14 days', 'COMPLETED', 'QR-PAST-W2-01', 'Toate schimburile finalizate cu succes.'),
    -- Past Week -1
    ('ba000000-0000-0000-0000-000000000002', 'Stand Piața Unirii', 'Campanie Toamnă Săpt 2', CURRENT_DATE - INTERVAL '7 days', 'COMPLETED', 'QR-PAST-W1-01', 'Ploaie torențială schimbul 2.'),
    ('ba000000-0000-0000-0000-000000000003', 'Stand Iulius Mall', 'Campanie Mall Săpt 2', CURRENT_DATE - INTERVAL '6 days', 'COMPLETED', 'QR-PAST-W1-02', 'Aflux mare de tineri.'),
    -- Current Week (Today / Active)
    ('ba000000-0000-0000-0000-000000000010', 'Stand Piața Unirii', 'Campanie Weekend Central', CURRENT_DATE, 'IN_PROGRESS', 'QR-TODAY-UNIRII', 'Stand activ - flux normal.'),
    ('ba000000-0000-0000-0000-000000000011', 'Stand Iulius Mall', 'Campanie Mall Weekend', CURRENT_DATE, 'IN_PROGRESS', 'QR-TODAY-IULIUS', 'Stand activ etaj 1.'),
    -- Future Week +1
    ('ba000000-0000-0000-0000-000000000020', 'Stand Piața Unirii', 'Campanie Toamnă Săpt 4', CURRENT_DATE + INTERVAL '7 days', 'PLANNED', 'QR-FUTR-W1-01', 'Înscrieri deschise pentru voluntari.'),
    ('ba000000-0000-0000-0000-000000000021', 'Stand Vivo Mall', 'Campanie Vivo Săpt 4', CURRENT_DATE + INTERVAL '8 days', 'PLANNED', 'QR-FUTR-W1-02', 'Necesar voluntari suplimentari.')
ON CONFLICT (id) DO UPDATE SET
    event_date = EXCLUDED.event_date,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

-- Shifts for these stands
INSERT INTO hr.shifts (id, stand_id, shift_name, start_time, end_time, needed_volunteers, needed_logistics, needed_finance)
VALUES
    -- Past Stand W-2 Unirii
    ('bb000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', 'Schimbul 1 (Dimineață)', '10:00', '14:00', 2, 1, 1),
    ('bb000000-0000-0000-0000-000000000002', 'ba000000-0000-0000-0000-000000000001', 'Schimbul 2 (După-amiază)', '14:00', '18:00', 2, 1, 1),
    -- Past Stand W-1 Unirii
    ('bb000000-0000-0000-0000-000000000003', 'ba000000-0000-0000-0000-000000000002', 'Schimbul 1 (Dimineață)', '10:00', '14:00', 2, 1, 1),
    ('bb000000-0000-0000-0000-000000000004', 'ba000000-0000-0000-0000-000000000002', 'Schimbul 2 (După-amiază)', '14:00', '18:00', 2, 1, 1),
    -- Past Stand W-1 Iulius
    ('bb000000-0000-0000-0000-000000000005', 'ba000000-0000-0000-0000-000000000003', 'Schimbul Unic', '12:00', '20:00', 3, 1, 1),

    -- Today Unirii
    ('bb000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000010', 'Schimbul 1 (Dimineață)', '10:00', '14:00', 2, 1, 1),
    ('bb000000-0000-0000-0000-000000000011', 'ba000000-0000-0000-0000-000000000010', 'Schimbul 2 (După-amiază)', '14:00', '18:00', 3, 1, 1),
    -- Today Iulius
    ('bb000000-0000-0000-0000-000000000012', 'ba000000-0000-0000-0000-000000000011', 'Schimbul 1 (Prânz)', '11:00', '16:00', 2, 1, 1),

    -- Future Unirii (Will have empty slots for testing unassigned logic)
    ('bb000000-0000-0000-0000-000000000020', 'ba000000-0000-0000-0000-000000000020', 'Schimbul 1 (Dimineață)', '10:00', '14:00', 3, 1, 1),
    ('bb000000-0000-0000-0000-000000000021', 'ba000000-0000-0000-0000-000000000020', 'Schimbul 2 (După-amiază)', '14:00', '18:00', 3, 1, 1),
    -- Future Vivo
    ('bb000000-0000-0000-0000-000000000022', 'ba000000-0000-0000-0000-000000000021', 'Schimbul Zilei', '12:00', '18:00', 2, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Shift Assignments: Fully testing edge cases:
-- 1. On-time check-in (PRESENT)
-- 2. Late check-in (PRESENT with late time offset)
-- 3. No-show / Absent (ABSENT)
-- 4. Waiting / Pending check-in (WAITING)
-- 5. Future shift confirmed (CONFIRMED)
INSERT INTO hr.shift_assignments (
    id, shift_id, member_id, role_id, attendance_status, assignment_status, approved_by, approved_at, checked_in_at, checkin_method, checkin_lat, checkin_lng, eod_submitted
) VALUES
    -- Past Stand W-2: Perfect on-time attendance
    ('bc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'PRESENT', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days', (CURRENT_DATE - INTERVAL '14 days' + TIME '09:55:00'), 'QR_SCAN', 46.7693000, 23.5898000, true),
    ('bc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000005', 'PRESENT', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days', (CURRENT_DATE - INTERVAL '14 days' + TIME '09:58:00'), 'QR_SCAN', 46.7693000, 23.5898000, true),

    -- Past Stand W-1: EDGE CASE: One volunteer LATE by 35 minutes, one ABSENT (No show)
    ('bc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'bc000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', 'PRESENT', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days', (CURRENT_DATE - INTERVAL '7 days' + TIME '10:35:00'), 'MANUAL_OVERRIDE', 46.7693000, 23.5898000, true), -- LATE
    ('bc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'bc000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000005', 'ABSENT', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days', NULL, NULL, NULL, NULL, false), -- NO SHOW

    -- Today: Active Stand Shift 1 (Present & Checked In)
    ('bc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000010', 'bc000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'PRESENT', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days', (CURRENT_DATE + TIME '09:50:00'), 'QR_SCAN', 46.7693000, 23.5898000, false),
    ('bc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000010', 'bc000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005', 'PRESENT', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days', (CURRENT_DATE + TIME '10:18:00'), 'QR_SCAN', 46.7693000, 23.5898000, false), -- Late 18m

    -- Today: Active Stand Shift 2 (Waiting for afternoon arrival)
    ('bc000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000011', 'bc000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000005', 'WAITING', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 days', NULL, NULL, NULL, NULL, false),
    ('bc000000-0000-0000-0000-000000000013', 'bb000000-0000-0000-0000-000000000011', 'bc000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000003', 'WAITING', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 days', NULL, NULL, NULL, NULL, false),
    -- (Note: Shift 2 needs 3 volunteers, so 1 slot is deliberately empty/unassigned!)

    -- Future Shift +7 Days (Only 1 volunteer signed up out of 3 needed -> 2 empty slots)
    ('bc000000-0000-0000-0000-000000000020', 'bb000000-0000-0000-0000-000000000020', 'bc000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'WAITING', 'CONFIRMED', 'bc000000-0000-0000-0000-000000000002', NOW(), NULL, NULL, NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- Feedback & Complaints system test records (32 diverse entries across operational friction, broken items, coordinators, and praise)
INSERT INTO hr.volunteer_feedback (id, user_id, submitter_name, submitter_email, category_id, type, is_anonymous, is_public_submission, target_type, content, status, internal_notes, created_at, resolved_at)
VALUES
    -- Cluster 1: Ceainic defect / Lipsă apă caldă (Materiale & Echipamente / Stand & Logistică)
    ('bd000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000011', 'Diana Munteanu', 'diana.voluntar@example.org', '20000000-0000-0000-0000-000000000004', 'COMPLAINT', false, false, 'GENERAL', 'Ceainicul electric de la Standul Unirii nu mai încălzește deloc apa, voluntarii au înghețat de frig.', 'IN_REVIEW', 'Verificat cu depozitul pentru înlocuire.', NOW() - INTERVAL '6 days', NULL),
    ('bd000000-0000-0000-0000-000000000002', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000004', 'COMPLAINT', true, true, 'GENERAL', 'Avem nevoie urgent de alt ceainic la Piața Unirii, cel vechi scoate fum și nu mai pornește deloc.', 'NEW', NULL, NOW() - INTERVAL '5 days', NULL),
    ('bd000000-0000-0000-0000-000000000003', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000001', 'COMPLAINT', true, true, 'GENERAL', 'La tura de seară n-am putut oferi ceai cald donatorilor pentru că s-a ars rezistența la ceainic.', 'NEW', NULL, NOW() - INTERVAL '4 days', NULL),
    ('bd000000-0000-0000-0000-000000000004', 'bc000000-0000-0000-0000-000000000012', 'Vlad Gheorghiu', 'vlad.voluntar@example.org', '20000000-0000-0000-0000-000000000004', 'SUGGESTION', false, false, 'GENERAL', 'Sugerez să aduceți un termoplonjor sau un ceainic de rezervă, cel actual de la stand este complet defect.', 'RESOLVED', 'S-a trimis ceainic nou de la logistică.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 days'),

    -- Cluster 2: Probleme Coordonator Mihai (Coordonare & Echipă)
    ('bd000000-0000-0000-0000-000000000005', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000003', 'COMPLAINT', true, true, 'GENERAL', 'Coordonatorul Mihai întârzie constant la deschiderea standului și nu răspunde la telefon când avem nevoie de suport.', 'NEW', NULL, NOW() - INTERVAL '5 days', NULL),
    ('bd000000-0000-0000-0000-000000000006', 'bc000000-0000-0000-0000-000000000013', 'Ioana Costea', 'ioana.voluntar@example.org', '20000000-0000-0000-0000-000000000003', 'COMPLAINT', false, false, 'GENERAL', 'Comunicarea cu Mihai este foarte dificilă, a țipat la voluntari când s-a creat aglomerație la stand.', 'IN_REVIEW', 'Discutat intern cu liderul de departament.', NOW() - INTERVAL '4 days', NULL),
    ('bd000000-0000-0000-0000-000000000007', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000003', 'COMPLAINT', true, true, 'GENERAL', 'Nu am primit instrucțiunile de lucru de la coordonatorul Mihai, a plecat cu 2 ore mai devreme din tură fără să lase un înlocuitor.', 'NEW', NULL, NOW() - INTERVAL '3 days', NULL),
    ('bd000000-0000-0000-0000-000000000008', 'bc000000-0000-0000-0000-000000000019', 'Cristian Vasilescu', 'cristi.vasilescu@example.org', '20000000-0000-0000-0000-000000000003', 'COMPLAINT', false, false, 'GENERAL', 'Coordonatorul Mihai a refuzat să ne asigure pauză de masă deși am stat în picioare 5 ore continuu.', 'IN_REVIEW', 'Preluat de HR pentru mediere.', NOW() - INTERVAL '2 days', NULL),

    -- Cluster 3: Lipsă consumabile stand (Pahare, flyere, zahăr)
    ('bd000000-0000-0000-0000-000000000009', 'bc000000-0000-0000-0000-000000000015', 'Simona Florescu', 'simona.voluntar@example.org', '20000000-0000-0000-0000-000000000001', 'COMPLAINT', false, false, 'GENERAL', 'Am rămas fără pahare de carton la Standul Parc Central încă de la ora 14:00 și a trebuit să improvizăm.', 'RESOLVED', 'Aprovizionat de urgență.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
    ('bd000000-0000-0000-0000-000000000010', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000004', 'COMPLAINT', true, true, 'GENERAL', 'Nu mai sunt căni și flyere deloc în cutiile de rezervă de la standul din parc.', 'NEW', NULL, NOW() - INTERVAL '4 days', NULL),
    ('bd000000-0000-0000-0000-000000000011', 'bc000000-0000-0000-0000-000000000014', 'George Enache', 'george.voluntar@example.org', '20000000-0000-0000-0000-000000000001', 'COMPLAINT', false, false, 'GENERAL', 'Am fost nevoiți să refuzăm donatori pentru că s-au terminat paharele și șervețelele la stand.', 'NEW', NULL, NOW() - INTERVAL '3 days', NULL),
    ('bd000000-0000-0000-0000-000000000012', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000005', 'SUGGESTION', true, true, 'GENERAL', 'Vă rugăm să aduceți un stoc tampon mai mare de pahare, zahăr și palete la standul de la Operă.', 'NEW', NULL, NOW() - INTERVAL '1 days', NULL),

    -- Cluster 4: Întârzieri schimb de tură (Program & Schimburi)
    ('bd000000-0000-0000-0000-000000000013', 'bc000000-0000-0000-0000-000000000016', 'Laura Marin', 'laura.marin@example.org', '20000000-0000-0000-0000-000000000002', 'COMPLAINT', false, false, 'GENERAL', 'Schimbul de tură de la ora 16:00 a întârziat cu 45 de minute, a trebuit să stăm peste program fără să fim anunțați.', 'IN_REVIEW', 'Verificare pontaje prezență.', NOW() - INTERVAL '5 days', NULL),
    ('bd000000-0000-0000-0000-000000000014', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000002', 'COMPLAINT', true, true, 'GENERAL', 'Voluntarii din tura 2 nu s-au prezentat la timp și am pierdut transportul spre casă așteptând înlocuitorii.', 'NEW', NULL, NOW() - INTERVAL '4 days', NULL),
    ('bd000000-0000-0000-0000-000000000015', 'bc000000-0000-0000-0000-000000000017', 'Bogdan Stan', 'bogdan.stan@example.org', '20000000-0000-0000-0000-000000000002', 'COMPLAINT', false, false, 'GENERAL', 'Haos mare la predarea gestiunii între ture, banii din cutie nu erau numărați și tabelele lipseau.', 'RESOLVED', 'S-a implementat formularul EoD standard.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
    ('bd000000-0000-0000-0000-000000000016', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000002', 'SUGGESTION', true, true, 'GENERAL', 'Propun stabilirea unei perioade tampon obligatorii de 15 minute între ture pentru predarea corectă a standului.', 'NEW', NULL, NOW() - INTERVAL '2 days', NULL),

    -- Cluster 5: Probleme tehnice / Erori terminal POS SumUp
    ('bd000000-0000-0000-0000-000000000017', 'bc000000-0000-0000-0000-000000000018', 'Roxana Tudor', 'roxana.tudor@example.org', '20000000-0000-0000-0000-000000000004', 'COMPLAINT', false, false, 'GENERAL', 'Terminalul POS SumUp pierde conexiunea bluetooth la fiecare a treia tranzacție și trebuie repornit.', 'IN_REVIEW', 'Testat terminal, trimis către IT.', NOW() - INTERVAL '6 days', NULL),
    ('bd000000-0000-0000-0000-000000000018', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000004', 'COMPLAINT', true, true, 'GENERAL', 'Bateria POS-ului se descarcă în 2 ore și nu avem prelungitor sau baterie externă la stand.', 'NEW', NULL, NOW() - INTERVAL '4 days', NULL),
    ('bd000000-0000-0000-0000-000000000019', 'bc000000-0000-0000-0000-000000000011', 'Diana Munteanu', 'diana.voluntar@example.org', '20000000-0000-0000-0000-000000000001', 'COMPLAINT', false, false, 'GENERAL', 'Nu am putut încasa donații cu cardul din cauza erorilor repetate de rețea la terminalul mobil.', 'RESOLVED', 'Configurat hotspot 4G dedicat.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 days'),
    ('bd000000-0000-0000-0000-000000000020', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000004', 'COMPLAINT', true, true, 'GENERAL', 'POS-ul dă eroare "Tranzacție eșuată" chiar dacă cardurile donatorilor sunt perfect valide.', 'NEW', NULL, NOW() - INTERVAL '1 days', NULL),

    -- Cluster 6: Aprecieri Coordonator Elena (Coordonare & Echipă)
    ('bd000000-0000-0000-0000-000000000021', 'bc000000-0000-0000-0000-000000000010', 'Alexandru Stan', 'alex.voluntar@example.org', '20000000-0000-0000-0000-000000000003', 'REVIEW', false, false, 'GENERAL', 'Elena este o coordonatoare extraordinară, a explicat totul cu mult calm și ne-a adus ceai cald.', 'RESOLVED', 'Transmis mulțumiri în ședința de echipă.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
    ('bd000000-0000-0000-0000-000000000022', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000003', 'REVIEW', true, true, 'GENERAL', 'Felicitări coordonatoarei Elena pentru organizarea impecabilă a standului de la Teatru!', 'NEW', NULL, NOW() - INTERVAL '4 days', NULL),
    ('bd000000-0000-0000-0000-000000000023', 'bc000000-0000-0000-0000-000000000013', 'Ioana Costea', 'ioana.voluntar@example.org', '20000000-0000-0000-0000-000000000003', 'REVIEW', false, false, 'GENERAL', 'Coordonatoarea Elena a fost foarte atentă la nevoile noastre și a asigurat rotația corectă a pauzelor.', 'NEW', NULL, NOW() - INTERVAL '2 days', NULL),
    ('bd000000-0000-0000-0000-000000000024', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000003', 'REVIEW', true, true, 'GENERAL', 'O apreciere deosebită pentru Elena, datorită ei atmosfera din echipă a fost minunată pe tot parcursul zilei.', 'NEW', NULL, NOW() - INTERVAL '1 days', NULL),

    -- Cluster 7: Frig la stand & Echipament termic (Materiale & Echipamente / Logistică)
    ('bd000000-0000-0000-0000-000000000025', 'bc000000-0000-0000-0000-000000000019', 'Cristian Vasilescu', 'cristi.vasilescu@example.org', '20000000-0000-0000-0000-000000000004', 'COMPLAINT', false, false, 'GENERAL', 'Este extrem de frig la standul din Piața Mare, mănușile subțiri nu sunt suficiente deloc.', 'IN_REVIEW', 'Comandat mănuși groase termo.', NOW() - INTERVAL '5 days', NULL),
    ('bd000000-0000-0000-0000-000000000026', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000005', 'SUGGESTION', true, true, 'GENERAL', 'Ar fi de mare ajutor geci groase sau pelerine de vânt pentru voluntarii care stau afară.', 'NEW', NULL, NOW() - INTERVAL '4 days', NULL),
    ('bd000000-0000-0000-0000-000000000027', 'bc000000-0000-0000-0000-000000000015', 'Simona Florescu', 'simona.voluntar@example.org', '20000000-0000-0000-0000-000000000001', 'COMPLAINT', false, false, 'GENERAL', 'Standul nu are protecție împotriva vântului și voluntarii nu pot rezista mai mult de 2 ore în frig.', 'NEW', NULL, NOW() - INTERVAL '3 days', NULL),
    ('bd000000-0000-0000-0000-000000000028', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000005', 'SUGGESTION', true, true, 'GENERAL', 'Sugerez să avem încălzitoare electrice de mâini sau radiatoare mici pentru standurile exterioare.', 'NEW', NULL, NOW() - INTERVAL '1 days', NULL),

    -- Cluster 8: Onboarding & Sugestii generale ecusoane
    ('bd000000-0000-0000-0000-000000000029', 'bc000000-0000-0000-0000-000000000014', 'George Enache', 'george.voluntar@example.org', '20000000-0000-0000-0000-000000000005', 'REVIEW', false, false, 'GENERAL', 'Materialele de instruire au fost foarte clare, m-am simțit pregătit încă din prima zi de voluntariat.', 'RESOLVED', NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
    ('bd000000-0000-0000-0000-000000000030', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000003', 'REVIEW', true, true, 'GENERAL', 'Apreciez foarte mult ghidul de bun venit și atitudinea deschisă a întregii echipe HR.', 'RESOLVED', NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
    ('bd000000-0000-0000-0000-000000000031', 'bc000000-0000-0000-0000-000000000016', 'Laura Marin', 'laura.marin@example.org', '20000000-0000-0000-0000-000000000006', 'REVIEW', false, false, 'GENERAL', 'Mulțumesc pentru oportunitate, a fost o experiență de învățare excelentă!', 'NEW', NULL, NOW() - INTERVAL '2 days', NULL),
    ('bd000000-0000-0000-0000-000000000032', NULL, 'Anonim', NULL, '20000000-0000-0000-0000-000000000005', 'SUGGESTION', true, true, 'GENERAL', 'Ar fi super util dacă am avea ecusoane laminate cu numele fiecăruia pentru a părea mai oficiali în fața trecătorilor.', 'NEW', NULL, NOW() - INTERVAL '1 days', NULL)
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    type = EXCLUDED.type,
    category_id = EXCLUDED.category_id,
    status = EXCLUDED.status,
    internal_notes = EXCLUDED.internal_notes;

-- ------------------------------------------------------------------------------
-- 4. LOGISTICS DOMAIN (Stock Items, Multi-Location Inventories, Stock Audits)
-- ------------------------------------------------------------------------------

INSERT INTO logistics.items (id, name, sku, category, unit, is_sellable, min_safety_stock, lead_time_days, target_stock, daily_burn_rate, notes)
VALUES
    ('ca000000-0000-0000-0000-000000000001', 'Articol Campanie Albastru', 'ITEM-CHARITY-BLUE-2026', 'Produse Promo', 'buc', true, 50, 3, 300, 15.5, 'Produs principal de vânzare caritabilă'),
    ('ca000000-0000-0000-0000-000000000002', 'Articol Campanie Roșu', 'ITEM-CHARITY-RED-2026', 'Produse Promo', 'buc', true, 50, 3, 300, 12.0, 'Ediție limitată de toamnă'),
    ('ca000000-0000-0000-0000-000000000003', 'Tricou Voluntar Mărimea M', 'TSHIRT-VOL-M', 'Echipament', 'buc', false, 20, 5, 80, 2.0, 'Echipament oficial voluntari'),
    ('ca000000-0000-0000-0000-000000000004', 'Tricou Voluntar Mărimea L', 'TSHIRT-VOL-L', 'Echipament', 'buc', false, 20, 5, 80, 2.0, 'Echipament oficial voluntari'),
    ('ca000000-0000-0000-0000-000000000005', 'POS Mobil Bancar SumUp Air', 'TECH-POS-SUMUP-01', 'Tehnic', 'buc', false, 2, 1, 5, 0.0, 'Terminal de plată wireless pentru stand'),
    ('ca000000-0000-0000-0000-000000000006', 'Flyere Informative A5 (Set 100)', 'FLYER-A5-PACK100', 'Materiale', 'set', false, 10, 2, 50, 3.5, 'Flyere de prezentare a cauzei caritabile')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sku = EXCLUDED.sku,
    min_safety_stock = EXCLUDED.min_safety_stock,
    target_stock = EXCLUDED.target_stock;

-- Stock quantities per location
INSERT INTO logistics.location_stocks (id, item_id, location_id, quantity, updated_at)
VALUES
    -- Central Deposit
    ('cb000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 240, NOW()),
    ('cb000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000001', 180, NOW()),
    ('cb000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000001', 45, NOW()),
    ('cb000000-0000-0000-0000-000000000004', 'ca000000-0000-0000-0000-000000000005', 'ab000000-0000-0000-0000-000000000001', 3, NOW()),
    
    -- Stand Piața Unirii (Active Stand)
    ('cb000000-0000-0000-0000-000000000010', 'ca000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000002', 35, NOW()), -- LOW STOCK WARNING (< min_safety_stock of 50)
    ('cb000000-0000-0000-0000-000000000011', 'ca000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000002', 60, NOW()),
    ('cb000000-0000-0000-0000-000000000012', 'ca000000-0000-0000-0000-000000000005', 'ab000000-0000-0000-0000-000000000002', 1, NOW()),

    -- Stand Iulius Mall
    ('cb000000-0000-0000-0000-000000000020', 'ca000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000003', 80, NOW()),
    ('cb000000-0000-0000-0000-000000000021', 'ca000000-0000-0000-0000-000000000005', 'ab000000-0000-0000-0000-000000000003', 1, NOW())
ON CONFLICT (item_id, location_id) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    updated_at = NOW();

-- Stock transfer history
INSERT INTO logistics.stock_transfers (id, source_location_id, destination_location_id, timestamp, performed_by, notes)
VALUES
    ('cc000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days', 'Radu Dumitrescu', 'Aprovizionare inițială stand Piața Unirii')
ON CONFLICT (id) DO NOTHING;

INSERT INTO logistics.stock_transfer_items (id, transfer_id, item_id, quantity)
VALUES
    ('cd000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 50),
    ('cd000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000002', 50)
ON CONFLICT (id) DO NOTHING;

-- Stock adjustment audit (e.g. broken mug edge case)
INSERT INTO logistics.stock_adjustments (id, item_id, location_id, previous_quantity, new_quantity, quantity_change, reason, notes, performed_by, timestamp)
VALUES
    ('ce000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000002', 37, 35, -2, 'Deteriorare / Sparte', '2 căni sparte în timpul transportului la stand', 'Alexandru Stan', NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. FINANCE DOMAIN: EXPENSES, ONLINE DONATIONS, STAND BALANCING & DISCREPANCIES
-- ------------------------------------------------------------------------------

INSERT INTO finance.finance_expenses (id, name, transaction_date, amount, currency, category, description, payment_method, campaign_department, receipt_attachment, created_by)
VALUES
    ('da000000-0000-0000-0000-000000000001', 'Tipărire flyere promoționale', CURRENT_DATE - INTERVAL '10 days', 450.00, 'RON', 'Marketing', 'Factura tipografie 5000 flyere A5', 'OP_BANK', 'General', 'https://storage.example.org/receipts/factura_flyere_1092.pdf', 'bc000000-0000-0000-0000-000000000003'),
    ('da000000-0000-0000-0000-000000000002', 'Apă plată și gustări voluntari', CURRENT_DATE - INTERVAL '7 days', 185.50, 'RON', 'Protocol', 'Alimentare apă stand Unirii', 'CASH', 'HR', 'https://storage.example.org/receipts/bon_metro_8821.pdf', 'bc000000-0000-0000-0000-000000000002'),
    ('da000000-0000-0000-0000-000000000003', 'Taxă ocupare domeniu public', CURRENT_DATE - INTERVAL '15 days', 600.00, 'RON', 'Administrativ', 'Taxă primărie amplasare stand caritabil', 'OP_BANK', 'Logistics', 'https://storage.example.org/receipts/chitanta_primarie_441.pdf', 'bc000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance.finance_online_donations (id, processor, transaction_id, donor_name, donor_email, amount, currency, processing_fee, campaign, transaction_date, status)
VALUES
    ('db000000-0000-0000-0000-000000000001', 'STRIPE', 'ch_3N8xYk2eZvKYlo2C0Test01', 'Bogdan Marinescu', 'bogdan.m@gmail.com', 150.00, 'RON', 4.50, 'General', NOW() - INTERVAL '5 days', 'COMPLETED'),
    ('db000000-0000-0000-0000-000000000002', 'STRIPE', 'ch_3N8xYk2eZvKYlo2C0Test02', 'Maria Dumitru', 'maria.dumitru@yahoo.com', 500.00, 'RON', 12.50, 'Gala Caritabilă', NOW() - INTERVAL '2 days', 'COMPLETED'),
    ('db000000-0000-0000-0000-000000000003', 'EUPLATESC', 'EP-TX-99881122', 'Anonim', 'anonim@donator.ro', 50.00, 'RON', 1.80, 'General', NOW() - INTERVAL '12 hours', 'COMPLETED')
ON CONFLICT (transaction_id) DO NOTHING;

-- Stand EoD Balancing: Testing balanced stand vs discrepancy shortage
INSERT INTO finance.finance_stands (
    id, stand_location, event_date, shift_name, finance_responsible_id, finance_responsible_name, cash_collected, pos_card_collected, opening_balance, closing_balance, discrepancy_amount, discrepancy_notes, status
) VALUES
    -- Balanced past stand
    ('dc000000-0000-0000-0000-000000000001', 'Stand Piața Unirii', CURRENT_DATE - INTERVAL '14 days', 'Schimbul 1 (Dimineață)', 'bc000000-0000-0000-0000-000000000010', 'Alexandru Stan', 1250.00, 800.00, 100.00, 1350.00, 0.00, 'Toate sumele coincid cu bonurile fiscale.', 'APPROVED'),
    
    -- EDGE CASE: Stand with Cash Shortage Discrepancy (-30 RON)
    ('dc000000-0000-0000-0000-000000000002', 'Stand Piața Unirii', CURRENT_DATE - INTERVAL '7 days', 'Schimbul 1 (Dimineață)', 'bc000000-0000-0000-0000-000000000012', 'Vlad Gheorghiu', 920.00, 650.00, 100.00, 990.00, -30.00, 'Lipsă 30 RON în cutia de donații / rest greșit oferit unui vizitator.', 'SUBMITTED')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. FUNDRAISING & SPONSORSHIPS (sponsors, corporate tiers)
-- ------------------------------------------------------------------------------

INSERT INTO fundraising.sponsors (id, sort_index, company_name, company_profile, contact_info, responsible_person, status, last_contact_date, notes, sponsorship_type, received_type, received_value, currency)
VALUES
    ('ea000000-0000-0000-0000-000000000001', 1, 'Banca Transilvania', 'Instituție bancară parteneră tradițională', 'parteneriate@bancatransilvania.ro / 0264300000', 'Andreea Marin', 'CONFIRMED', CURRENT_DATE - INTERVAL '15 days', 'Contract semnat pentru sponsorizare pachet Gold.', 'GOLD', 'MONEY', '25000', 'RON'),
    ('ea000000-0000-0000-0000-000000000002', 2, 'Endava Romania', 'Companie servicii IT și software', 'csr@example.org', 'Andreea Marin', 'IN_NEGOTIATION', CURRENT_DATE - INTERVAL '3 days', 'Au solicitat detalii despre vizibilitatea pe tricourile voluntarilor.', 'SILVER', 'MONEY', '15000', 'RON'),
    ('ea000000-0000-0000-0000-000000000003', 3, 'Panemar Morărit și Panificație', 'Producător local panificație', 'contact@panemar.ro', 'Andreea Marin', 'CONFIRMED', CURRENT_DATE - INTERVAL '20 days', 'Furnizare produse de patiserie pentru voluntarii din standuri.', 'IN_KIND', 'GOODS', 'Sandwich-uri și croissante zilnice', 'RON'),
    ('ea000000-0000-0000-0000-000000000004', 4, 'NTT DATA Romania', 'Companie IT', 'sponsorizari@nttdata.ro', 'Andreea Marin', 'REJECTED', CURRENT_DATE - INTERVAL '40 days', 'Bugetul de CSR epuizat pe trimestrul curent.', 'BRONZE', 'MONEY', '5000', 'RON')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. LEGAL DOMAIN: CONTRACT TEMPLATES & GENERATED CONTRACTS
-- ------------------------------------------------------------------------------

INSERT INTO legal.contract_templates (id, title, description, category, raw_content, fields_schema, created_by)
VALUES
    ('fa000000-0000-0000-0000-000000000001', 'Contract Voluntariat Charity 2026', 'Model standard de contract de voluntariat conform Legii 78/2014', 'volunteering', 'CONTRACT DE VOLUNTARIAT Nr. {{contract_number}} din data de {{start_date}} încheiat între Organizație și {{volunteer_name}}, domiciliat în {{address}}, CNP {{cnp}}...', '[{"key":"volunteer_name","label":"Nume Voluntar","type":"text"},{"key":"cnp","label":"CNP","type":"text"},{"key":"address","label":"Adresă","type":"text"},{"key":"start_date","label":"Data Început","type":"date"}]'::jsonb, 'Cristian Vasile')
ON CONFLICT (id) DO NOTHING;

INSERT INTO legal.generated_contracts (id, template_id, contract_number, title, status, party_a_name, party_b_name, party_b_email, field_values, rendered_content, valid_from, valid_until, created_by)
VALUES
    ('fb000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'VOL-2026-0014', 'Contract Voluntariat - Alexandru Stan', 'signed', 'Organizația Caritabilă Familia', 'Alexandru Stan', 'alex.voluntar@example.org', '{"volunteer_name":"Alexandru Stan","cnp":"1980512125890","address":"general city, Str. Observatorului 34","start_date":"2026-08-01"}'::jsonb, 'CONTRACT DE VOLUNTARIAT Nr. VOL-2026-0014...', '2026-08-01', '2027-08-01', 'Cristian Vasile'),
    ('fb000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-000000000001', 'VOL-2026-0015', 'Contract Voluntariat - Diana Munteanu', 'draft', 'Organizația Caritabilă Familia', 'Diana Munteanu', 'diana.voluntar@example.org', '{"volunteer_name":"Diana Munteanu","cnp":"2990920125890","address":"general city, Str. Memorandumului 10","start_date":"2026-08-15"}'::jsonb, 'CONTRACT DE VOLUNTARIAT Nr. VOL-2026-0015...', '2026-08-15', '2027-08-15', 'Cristian Vasile')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 8. AUDIT LOG HISTORY (auth.audit_logs)
-- ------------------------------------------------------------------------------

INSERT INTO auth.audit_logs (actor_id, actor_email, actor_name, action, resource_type, resource_name, department, summary, created_at)
VALUES
    ('bc000000-0000-0000-0000-000000000001', 'admin@example.org', 'Admin General', 'APPROVE_USER', 'USER', 'Alexandru Stan', 'IT', 'Aprobat contul de utilizator și alocat rolul de Voluntar.', NOW() - INTERVAL '40 days'),
    ('bc000000-0000-0000-0000-000000000002', 'hr.lead@example.org', 'Elena Popescu (HR Lead)', 'CREATE_STAND', 'HR_STAND', 'Stand Piața Unirii', 'HR', 'Creat stand caritabil și configurat 2 schimburi de lucru.', NOW() - INTERVAL '16 days'),
    ('bc000000-0000-0000-0000-000000000004', 'logistics.lead@example.org', 'Radu Dumitrescu (Logistics)', 'TRANSFER_STOCK', 'STOCK', 'Articol Campanie Albastru', 'LOGISTICS', 'Transferat 50 buc din Depozit Central în Stand Piața Unirii.', NOW() - INTERVAL '2 days'),
    ('bc000000-0000-0000-0000-000000000003', 'finance.lead@example.org', 'Mihai Ionescu (Finance Lead)', 'APPROVE_EOD', 'FINANCE_STAND', 'Stand Piața Unirii', 'FINANCE', 'Aprobat formularul EoD pentru încasările din tura 1.', NOW() - INTERVAL '13 days')
ON CONFLICT DO NOTHING;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Test database population completed successfully!';
END $$;
