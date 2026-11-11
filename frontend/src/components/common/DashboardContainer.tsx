import React from 'react';

export interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
  noScroll?: boolean;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  children,
  className = '',
  noScroll = false,
}) => {
  return (
    <div
      className={`flex-1 w-full max-w-full flex flex-col space-y-3 sm:space-y-4 pr-0.5 min-w-0 min-h-0 overflow-x-hidden ${
        noScroll ? 'overflow-hidden' : 'overflow-y-auto'
      } ${className}`}
    >
      {children}
    </div>
  );
};
