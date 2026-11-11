import React, { useState, useEffect } from 'react';
import {
  FolderKanban, Plus, Building, CheckCircle2, AlertCircle,
  Trash2, ChevronDown, ChevronUp, Layers, RefreshCw
} from 'lucide-react';
import { projectService } from '../../services/projectService';
import { adminAuthService } from '../../services/adminAuthService';
import { ProjectSetupWizardModal } from './ProjectSetupWizardModal';
import type { ProjectResponse } from '../../types/project';

interface ClubItem {
  id: string;
  name: string;
  organizationType?: string;
}

export const ProjectsManagementView: React.FC = () => {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projList, clubList] = await Promise.all([
        projectService.listProjects(),
        adminAuthService.getClubs().catch(() => []),
      ]);
      setProjects(projList);
      setClubs(clubList as ClubItem[]);
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea proiectelor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Sigur doriți să ștergeți proiectul "${name}"?`)) {
      return;
    }
    try {
      await projectService.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Eroare la ștergerea proiectului.');
    }
  };

  const getClubName = (entityId: string) => {
    const found = clubs.find((c) => c.id === entityId);
    return found ? `${found.name} (${found.organizationType || 'Club'})` : 'Club Asociat';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Proiecte & Capabilități Modulare
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Fiecare club poate asambla proiecte personalizate cu modulele și uneltele necesare
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Reîmprospătează"
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-400 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-500/20 text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Proiect Nou</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Projects List */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500">Se încarcă proiectele...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-center space-y-3">
          <FolderKanban className="w-12 h-12 mx-auto text-zinc-400 opacity-50" />
          <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">Niciun proiect configurat</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Creați primul proiect pentru clubul dumneavoastră și selectați modulele operaționale dorite.
          </p>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
          >
            Creează Proiect Acum
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const activeModules = project.enabledModules.filter((m) => m.active);

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                        {project.name}
                      </h3>
                      
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {project.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-zinc-400" />
                        {getClubName(project.entityId)}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-zinc-400">/{project.slug}</span>
                      <span>•</span>
                      <span>{activeModules.length} module active</span>
                    </div>

                    {project.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 pt-1">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 flex items-center gap-1.5 transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Ascunde Capabilități' : 'Vezi Capabilități'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      title="Șterge Proiect"
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Capabilities & Tabs */}
                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Module & Capabilități Active
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {activeModules.map((m) => (
                          <div
                            key={m.moduleId}
                            className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>{m.moduleId}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {project.navigationTabs && project.navigationTabs.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                          Tab-uri Dashboard Generate Dinamic
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {project.navigationTabs.map((t) => (
                            <span
                              key={t.id}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-medium text-indigo-700 dark:text-indigo-300"
                            >
                              {t.labelKey} ({t.routePath})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Setup Wizard Modal */}
      {isWizardOpen && (
        <ProjectSetupWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          clubs={clubs}
          onSuccess={(newProj) => {
            setProjects((prev) => [newProj, ...prev]);
            setIsWizardOpen(false);
          }}
        />
      )}
    </div>
  );
};
