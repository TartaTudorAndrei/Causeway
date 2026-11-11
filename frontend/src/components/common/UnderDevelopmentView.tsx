import React from 'react';
import { Construction } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { EmptyState } from './EmptyState';

interface UnderDevelopmentViewProps {
  isDarkMode?: boolean;
  title?: string;
  className?: string;
}

export const UnderDevelopmentView: React.FC<UnderDevelopmentViewProps> = ({
  isDarkMode = true,
  title,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <div className={`py-12 ${className}`}>
      <EmptyState
        icon={Construction}
        title={title || t('common.inDevelopment', 'În curs de dezvoltare')}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

