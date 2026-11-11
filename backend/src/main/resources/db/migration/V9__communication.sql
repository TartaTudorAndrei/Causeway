-- Migration V9: Communication Domain Schema (Email Builder Templates & Dispatch Logs)
CREATE SCHEMA IF NOT EXISTS communication;

-- 1. Email Templates Table
CREATE TABLE IF NOT EXISTS communication.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'fundraising',
    subject VARCHAR(255) NOT NULL,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Email Dispatch Logs Table
CREATE TABLE IF NOT EXISTS communication.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES communication.email_templates(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    dispatch_method VARCHAR(20) NOT NULL CHECK (dispatch_method IN ('API', 'EML_DOWNLOAD', 'CLIPBOARD_COPY', 'HTML_DOWNLOAD')),
    status VARCHAR(50) NOT NULL DEFAULT 'SENT',
    sent_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_dept ON communication.email_templates(department);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON communication.email_logs(sent_at DESC);

-- 3. Communication Permissions Catalog & Mappings
INSERT INTO auth.permissions (id, code, description, category) VALUES
    (gen_random_uuid(), 'fundraising:emails:view',       'Vizualizare tab / panou Email Studio și jurnal trimiteri', 'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:templates:write',   'Creare, editare și ștergere șabloane modulare de email',   'FUNDRAISING'),
    (gen_random_uuid(), 'fundraising:emails:send',       'Trimitere directă din dashboard (API dispatch)',          'FUNDRAISING'),
    (gen_random_uuid(), 'pr:emails:view',                'Vizualizare tab Email Studio PR',                         'MARKETING'),
    (gen_random_uuid(), 'pr:templates:write',            'Gestiune șabloane email PR',                              'MARKETING'),
    (gen_random_uuid(), 'pr:emails:send',                'Trimitere directă email-uri PR',                          'MARKETING')
ON CONFLICT (code) DO UPDATE 
SET description = EXCLUDED.description,
    category = EXCLUDED.category;

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('ADMIN', 'IT_ADMIN') AND p.code IN (
    'fundraising:emails:view', 'fundraising:templates:write', 'fundraising:emails:send',
    'pr:emails:view', 'pr:templates:write', 'pr:emails:send'
)
ON CONFLICT DO NOTHING;
