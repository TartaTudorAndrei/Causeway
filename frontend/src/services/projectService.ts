import { fetchWithCsrf } from './apiClient';
import type {
  ProjectResponse,
  ProjectPresetDefinition,
  ProjectModuleDescriptor,
  CreateProjectRequest,
  UpdateProjectRequest,
  UpdateProjectModulesRequest,
} from '../types/project';

export const projectService = {
  async listProjects(entityId?: string): Promise<ProjectResponse[]> {
    const url = entityId ? `/api/projects?entityId=${encodeURIComponent(entityId)}` : '/api/projects';
    const response = await fetchWithCsrf(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Eroare la încărcarea proiectelor (${response.status})`);
    }
    return response.json();
  },

  async getProject(id: string): Promise<ProjectResponse> {
    const response = await fetchWithCsrf(`/api/projects/${encodeURIComponent(id)}`, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Eroare la obținerea proiectului (${response.status})`);
    }
    return response.json();
  },

  async getProjectBySlug(slug: string): Promise<ProjectResponse> {
    const response = await fetchWithCsrf(`/api/projects/slug/${encodeURIComponent(slug)}`, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Eroare la găsirea proiectului după slug (${response.status})`);
    }
    return response.json();
  },

  async createProject(request: CreateProjectRequest): Promise<ProjectResponse> {
    const response = await fetchWithCsrf('/api/projects', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Eroare la crearea proiectului (${response.status})`);
    }
    return response.json();
  },

  async updateProject(id: string, request: UpdateProjectRequest): Promise<ProjectResponse> {
    const response = await fetchWithCsrf(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Eroare la actualizarea proiectului (${response.status})`);
    }
    return response.json();
  },

  async updateProjectModules(id: string, request: UpdateProjectModulesRequest): Promise<ProjectResponse> {
    const response = await fetchWithCsrf(`/api/projects/${encodeURIComponent(id)}/modules`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Eroare la configurarea modulelor (${response.status})`);
    }
    return response.json();
  },

  async deleteProject(id: string): Promise<void> {
    const response = await fetchWithCsrf(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Eroare la ștergerea proiectului (${response.status})`);
    }
  },

  async getPresets(): Promise<ProjectPresetDefinition[]> {
    const response = await fetchWithCsrf('/api/projects/meta/presets', { method: 'GET' });
    if (!response.ok) {
      throw new Error('Eroare la încărcarea șabloanelor de proiect');
    }
    return response.json();
  },

  async getModuleRegistry(): Promise<ProjectModuleDescriptor[]> {
    const response = await fetchWithCsrf('/api/projects/meta/registry', { method: 'GET' });
    if (!response.ok) {
      throw new Error('Eroare la încărcarea catalogului de module');
    }
    return response.json();
  },
};
