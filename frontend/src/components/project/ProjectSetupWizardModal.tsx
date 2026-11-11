import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import type { ProjectModuleDescriptor, ProjectResponse } from '../../types/project';

interface ClubOption {
  id: string;
  name: string;
  organizationType?: string;
}

interface ProjectSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: ProjectResponse) => void;
  clubs: ClubOption[];
  defaultClubId?: string;
}

export const ProjectSetupWizardModal: React.FC<ProjectSetupWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clubs,
  defaultClubId,
}) => {
  const { t } = useLanguage();
  const { hasPermission, isSuperAdmin } = usePermission();
  const canInheritHubConfig = isSuperAdmin || hasPermission('projects:config:inherit');

  const [name, setName] = useState('');
  const [entityId, setEntityId] = useState(defaultClubId || (clubs.length > 0 ? clubs[0].id : ''));
  const [inheritHubConfig, setInheritHubConfig] = useState(false);
  const [selectedPreset] = useState<string>('CUSTOM');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  const [descriptors, setDescriptors] = useState<ProjectModuleDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMetadata();
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultClubId) {
      setEntityId(defaultClubId);
    } else if (clubs.length > 0 && !entityId) {
      setEntityId(clubs[0].id);
    }
  }, [defaultClubId, clubs]);

  const loadMetadata = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const descriptorsData = await projectService.getModuleRegistry();
      setDescriptors(descriptorsData);
      // Default: enable all available modules
      const allIds = new Set(descriptorsData.map((d) => d.id));
      setSelectedModules(allIds);
    } catch (err: any) {
      setError(err.message || t('projects.optionsError', 'Eroare la încărcarea opțiunilor.'));
    } finally {
      setIsLoading(false);
    }
  };

  const resolveDependencies = (
    moduleIds: Set<string>,
    descList: ProjectModuleDescriptor[] = descriptors
  ): Set<string> => {
    const descMap = new Map(descList.map((d) => [d.id, d]));
    const resolved = new Set<string>(moduleIds);
    const queue = Array.from(moduleIds);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const desc = descMap.get(curr);
      if (desc && desc.dependencies) {
        for (const dep of desc.dependencies) {
          if (!resolved.has(dep)) {
            resolved.add(dep);
            queue.push(dep);
          }
        }
      }
    }

    // Auto-activate bridges
    let addedBridge = false;
    do {
      addedBridge = false;
      for (const desc of descList) {
        if (desc.bridge && !resolved.has(desc.id)) {
          if (desc.dependencies && desc.dependencies.length > 0) {
            const allMet = desc.dependencies.every((dep) => resolved.has(dep));
            if (allMet) {
              resolved.add(desc.id);
              addedBridge = true;
            }
          }
        }
      }
    } while (addedBridge);

    return resolved;
  };

  const handleToggleModule = (moduleId: string) => {
    const next = new Set<string>(selectedModules);
    if (next.has(moduleId)) {
      next.delete(moduleId);
      // Reverse cascade
      const descMap = new Map(descriptors.map((d) => [d.id, d]));
      let removed = true;
      while (removed) {
        removed = false;
        for (const id of Array.from(next)) {
          const desc = descMap.get(id);
          if (desc && desc.dependencies && desc.dependencies.length > 0) {
            const hasMissingDep = desc.dependencies.some((dep) => !next.has(dep));
            if (hasMissingDep) {
              next.delete(id);
              removed = true;
            }
          }
        }
      }
    } else {
      next.add(moduleId);
      const withDeps = resolveDependencies(next, descriptors);
      withDeps.forEach((m) => next.add(m));
    }

    setSelectedModules(next);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('projects.nameRequired', 'Numele proiectului este obligatoriu.'));
      return;
    }
    if (!entityId) {
      setError(t('projects.clubRequired', 'Selectați clubul titular.'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await projectService.createProject({
        entityId: entityId || (clubs.length > 0 ? clubs[0].id : ''),
        name: name.trim(),
        templatePreset: selectedPreset,
        customModuleIds: Array.from(selectedModules),
        inheritHubConfig: canInheritHubConfig ? inheritHubConfig : false,
      });
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || t('projects.createError', 'Eroare la crearea proiectului.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const SECTION_ORDER = [
    { key: 'GENERAL', label: t('nav.general', 'General') },
    { key: 'LOGISTICS', label: t('nav.logistics', 'Logistică') },
    { key: 'FINANCE', label: t('nav.finance', 'Finanțe') },
    { key: 'HR', label: t('nav.hr', 'HR') },
    { key: 'FUNDRAISING', label: t('nav.fundraising', 'Fundraising') },
    { key: 'MARKETING', label: t('nav.marketing', 'Marketing') },
    { key: 'LEGAL', label: t('nav.legal', 'Legal') },
  ];

  const categorizedModules = useMemo(() => {
    const groups: Record<string, ProjectModuleDescriptor[]> = {
      GENERAL: [],
      LOGISTICS: [],
      FINANCE: [],
      HR: [],
      FUNDRAISING: [],
      MARKETING: [],
      LEGAL: [],
    };
    descriptors.forEach((d) => {
      const cat = d.category || 'GENERAL';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    });
    return groups;
  }, [descriptors]);

  if (!isOpen) return null;

  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full h-full sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden bg-black text-white border-zinc-800 shadow-2xl max-w-2xl">
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg tracking-tight text-white">
            {t('projects.newProject', 'Proiect Nou')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inset Divider 1 */}
        <div className="mx-5 sm:mx-6 border-b border-zinc-800" />

        {/* Scrollable Form Body */}
        <form noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-sm no-scrollbar">
          {/* Identity Fields */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('projects.nameLabel', 'Nume Proiect')}
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder={t('projects.namePlaceholder', 'Nume proiect')}
                className="w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700"
              />
            </div>

            {canInheritHubConfig && (
              <button
                type="button"
                onClick={() => setInheritHubConfig((prev) => !prev)}
                className={`h-[38px] px-4 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center space-x-2 shrink-0 ${
                  inheritHubConfig
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600/30'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition ${
                    inheritHubConfig
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-zinc-600 bg-transparent'
                  }`}
                >
                  {inheritHubConfig && <span className="text-[10px] leading-none">✓</span>}
                </div>
                <span>{t('projects.inheritHubConfig', 'Moștenește configurația')}</span>
              </button>
            )}
          </div>

          {/* Modules List */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-zinc-400">
              {t('projects.modulesLabel', 'Module')}
            </label>

            {isLoading ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                {t('common.loading', 'Se încarcă...')}
              </div>
            ) : (
              <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                {SECTION_ORDER.map(({ key: category, label }) => {
                  const mods = categorizedModules[category] || [];
                  if (mods.length === 0) return null;
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {label}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {mods.map((mod) => {
                          const isChecked = selectedModules.has(mod.id);
                          return (
                            <label
                              key={mod.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                                isChecked
                                  ? 'bg-zinc-800 border-zinc-700 text-white'
                                  : 'bg-zinc-950/40 border-zinc-850 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleModule(mod.id)}
                                className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-900 shrink-0"
                              />
                              <span className="font-medium truncate">{t(mod.nameKey, mod.id)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Inset Divider 2 */}
        <div className="mx-5 sm:mx-6 border-t border-zinc-800" />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-rose-400 font-medium truncate max-w-sm">
            {error || ''}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
          >
            <span>
              {isSubmitting
                ? t('common.saving', 'Se salvează...')
                : t('projects.create', 'Creează Proiect')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
