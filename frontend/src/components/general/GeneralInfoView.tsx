import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { generalService } from '../../services/generalService';
import type { DashboardSectionInfo } from '../../types/general';
import { EditSectionInfoModal } from './EditSectionInfoModal';
import { marked } from 'marked';

export interface DashboardSectionOption {
  value: string;
  key: string;
  fallback: string;
}

export const DASHBOARD_SECTIONS: DashboardSectionOption[] = [
  { value: 'general', key: 'nav.general', fallback: 'General' },
  { value: 'logistics', key: 'nav.logistics', fallback: 'Logistics' },
  { value: 'finance', key: 'nav.finance', fallback: 'Finance' },
  { value: 'hr', key: 'nav.hr', fallback: 'HR' },
  { value: 'fundraising', key: 'nav.fundraising', fallback: 'Fundraising' },
  { value: 'marketing', key: 'nav.marketing', fallback: 'Marketing' },
  { value: 'legal', key: 'nav.legal', fallback: 'Legal' },
  { value: 'admin', key: 'nav.admin', fallback: 'Admin' },
  { value: 'it', key: 'nav.it', fallback: 'IT' },
];

export const canViewSectionInfo = (
  secKey: string,
  isSuperAdmin: boolean,
  hasPermission: (perm: string, ...args: any[]) => boolean
) => {
  if (isSuperAdmin) return true;
  const clean = secKey.toLowerCase();
  return (
    hasPermission(`general:info:${clean}:view`) ||
    hasPermission('general:info:view') ||
    hasPermission('general:read')
  );
};

export const canEditSectionInfo = (
  secKey: string,
  isSuperAdmin: boolean,
  hasPermission: (perm: string, ...args: any[]) => boolean
) => {
  if (isSuperAdmin) return true;
  const clean = secKey.toLowerCase();
  return (
    hasPermission(`general:info:${clean}:edit`) ||
    hasPermission('general:info:edit') ||
    hasPermission('general:write')
  );
};

export interface GeneralInfoViewProps {
  isDarkMode: boolean;
  selectedSection?: string;
  onSelectSection?: (section: string) => void;
  isEditModalOpen?: boolean;
  setIsEditModalOpen?: (open: boolean) => void;
}

export const GeneralInfoView: React.FC<GeneralInfoViewProps> = ({
  isDarkMode,
  selectedSection: propSelectedSection,
  onSelectSection,
  isEditModalOpen: propIsEditModalOpen,
  setIsEditModalOpen: propSetIsEditModalOpen,
}) => {
  const { t } = useLanguage();
  const { hasPermission, isSuperAdmin } = usePermission();

  const [internalSelectedSection, setInternalSelectedSection] = useState<string>('general');
  const [internalEditModalOpen, setInternalEditModalOpen] = useState<boolean>(false);

  const activeSection = propSelectedSection ?? internalSelectedSection;
  const setActiveSection = onSelectSection ?? setInternalSelectedSection;

  const modalOpen = propIsEditModalOpen ?? internalEditModalOpen;
  const setModalOpen = propSetIsEditModalOpen ?? setInternalEditModalOpen;

  const [sectionData, setSectionData] = useState<Record<string, DashboardSectionInfo>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadInfo = async () => {
      setIsLoading(true);
      try {
        const items = await generalService.getAllSectionInfo();
        if (isMounted) {
          const map: Record<string, DashboardSectionInfo> = {};
          items.forEach((item) => {
            map[item.sectionKey] = item;
          });
          setSectionData(map);
        }
      } catch (e) {
        console.error('Failed to load section info', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentInfo = useMemo(() => {
    return (
      sectionData[activeSection] || {
        sectionKey: activeSection,
        title: DASHBOARD_SECTIONS.find((s) => s.value === activeSection)?.fallback || activeSection,
        contentMarkdown: '# ' + activeSection,
      }
    );
  }, [sectionData, activeSection]);

  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(currentInfo.contentMarkdown || '', { async: false }) as string;
    } catch {
      return currentInfo.contentMarkdown || '';
    }
  }, [currentInfo.contentMarkdown]);

  const accessibleSections = useMemo(() => {
    return DASHBOARD_SECTIONS.filter((sec) => canViewSectionInfo(sec.value, isSuperAdmin, hasPermission));
  }, [isSuperAdmin, hasPermission]);

  useEffect(() => {
    if (accessibleSections.length > 0 && !accessibleSections.some((s) => s.value === activeSection)) {
      setActiveSection(accessibleSections[0].value);
    }
  }, [accessibleSections, activeSection, setActiveSection]);

  const handleSaved = (newMarkdown: string, newTitle: string, newGoogleDocUrl?: string | null) => {
    setSectionData((prev) => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        sectionKey: activeSection,
        title: newTitle,
        contentMarkdown: newMarkdown,
        googleDocUrl: newGoogleDocUrl,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  return (
    <div
      className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${
        isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs'
      }`}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-zinc-500 text-xs">
            {t('common.loading', 'Se incarca...')}
          </div>
        ) : (
          <article
            className={`prose max-w-none text-xs sm:text-sm leading-relaxed ${
              isDarkMode ? 'prose-invert prose-zinc' : 'prose-zinc'
            } [&_h1]:text-lg sm:[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm sm:[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_a]:text-blue-500 [&_a]:underline [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:overflow-x-auto`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>

      {/* Edit Modal */}
      {modalOpen && (
        <EditSectionInfoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          sectionKey={activeSection}
          initialTitle={currentInfo.title}
          initialMarkdown={currentInfo.contentMarkdown}
          initialGoogleDocUrl={currentInfo.googleDocUrl}
          onSaved={handleSaved}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
