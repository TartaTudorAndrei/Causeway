import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface DashboardHeaderSectionProps {
    /** The sub-tab navigation or top header strip */
    subTabNav?: React.ReactNode;
    /** Label of active tab or section (optional) */
    activeTabLabel?: string;
    /** The secondary filter, search, and action bar */
    controls?: React.ReactNode;
    /** Active filter count */
    activeFilterCount?: number;
    /** Active search query */
    searchQuery?: string;
    isDarkMode?: boolean;
    className?: string;
}

/**
 * DashboardHeaderSection
 * Encapsulates SubTabNav and Filter/Search/Action strip into a single cohesive unit.
 * Arrow states:
 * - When Expanded: Points DOWN (v) to collapse.
 * - When Collapsed: Points UP (^) to expand.
 */
export const DashboardHeaderSection: React.FC<DashboardHeaderSectionProps> = ({
    subTabNav,
    controls,
    activeFilterCount = 0,
    isDarkMode = true,
    className = '',
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const lineClass = isDarkMode
        ? 'bg-zinc-800 group-hover:bg-zinc-600'
        : 'bg-zinc-200 group-hover:bg-zinc-400';

    const chevronClass = isDarkMode
        ? 'text-zinc-500 group-hover:text-zinc-300'
        : 'text-zinc-400 group-hover:text-zinc-600';

    return (
        <div className={`w-full shrink-0 ${className}`}>
            {/* Sliding Content Container (subTabNav + controls collapse together to maximize vertical space) */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[600px] opacity-100'
                }`}
            >
                <div className="space-y-2 pb-0.5">
                    {subTabNav}
                    {controls && (
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                            {controls}
                        </div>
                    )}
                </div>
            </div>

            {/* Ultra-Thin Minimalist Line with Directional Arrow */}
            <div className="flex items-center justify-center -my-0.5">
                <button
                    onClick={() => setIsCollapsed((prev) => !prev)}
                    aria-label={isCollapsed ? 'Expand navigation and controls' : 'Collapse navigation and controls'}
                    className="group w-full py-1 flex items-center justify-center gap-2 cursor-pointer select-none focus:outline-none"
                >
                    {/* Left Hairline */}
                    <div className={`h-[1px] flex-1 transition-colors duration-200 ${lineClass}`} />

                    {/* Micro Directional Arrow + Filter Alert Dot */}
                    <div className="relative flex items-center justify-center shrink-0">
                        {isCollapsed ? (
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${chevronClass}`} />
                        ) : (
                            <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${chevronClass}`} />
                        )}

                        {/* Subtle alert dot if filters active while collapsed */}
                        {activeFilterCount > 0 && isCollapsed && (
                            <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        )}
                    </div>

                    {/* Right Hairline */}
                    <div className={`h-[1px] flex-1 transition-colors duration-200 ${lineClass}`} />
                </button>
            </div>
        </div>
    );
};
