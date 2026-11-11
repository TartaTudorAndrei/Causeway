-- Migration V10: Modular Projects Domain Schema (Projects, Modules, Hub Capabilities & Permissions)
CREATE SCHEMA IF NOT EXISTS projects;

-- 1. Base Project Entity
CREATE TABLE IF NOT EXISTS projects.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES auth.clubs(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(160) NOT NULL UNIQUE,
    description TEXT,
    template_preset VARCHAR(60),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_entity_status ON projects.projects(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects.projects(created_by);

-- 2. Enabled Capabilities per Project
CREATE TABLE IF NOT EXISTS projects.project_enabled_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    module_id VARCHAR(80) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config_json JSONB DEFAULT '{}'::jsonb,
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enabled_by UUID REFERENCES auth.admin_users(id) ON DELETE SET NULL,
    CONSTRAINT uq_project_module UNIQUE (project_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_project_modules_lookup ON projects.project_enabled_modules(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_project_modules_module_id ON projects.project_enabled_modules(module_id);

-- 3. Permissions for Modular Projects System
INSERT INTO auth.permissions (id, code, description, category) VALUES
    (gen_random_uuid(), 'projects:read',               'Vizualizare proiecte și capabilități active',               'PROJECTS'),
    (gen_random_uuid(), 'projects:write',              'Creare și configurare proiecte noi',                        'PROJECTS'),
    (gen_random_uuid(), 'projects:delete',             'Ștergere sau arhivare proiecte',                            'PROJECTS'),
    (gen_random_uuid(), 'projects:modules:manage',     'Configurare module, dependințe și integrare unelte proiect','PROJECTS'),
    (gen_random_uuid(), 'projects:manage',             'Gestiune administrativă completă a proiectelor',            'PROJECTS'),
    (gen_random_uuid(), 'projects:volunteers:manage',  'Gestiune voluntari și alocare pe proiecte în Hub',          'PROJECTS'),
    (gen_random_uuid(), 'projects:config:inherit',     'Permisiune de a moșteni configurațiile din Hub',            'PROJECTS')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    category = EXCLUDED.category;

-- 4. Map Permissions to ADMIN and IT_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name IN ('ADMIN', 'IT_ADMIN')
  AND p.category = 'PROJECTS'
ON CONFLICT DO NOTHING;

-- 5. Map Permissions to PROJECT_CREATOR and CONFIG_INHERITOR
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'PROJECT_CREATOR'
  AND p.code IN ('projects:read', 'projects:write')
ON CONFLICT DO NOTHING;

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE r.name = 'CONFIG_INHERITOR'
  AND p.code = 'projects:config:inherit'
ON CONFLICT DO NOTHING;

-- 6. Grant projects:read to All System & Operational Roles
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permissions p
WHERE p.code = 'projects:read'
ON CONFLICT DO NOTHING;
