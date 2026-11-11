import React, { useState, useMemo } from 'react';
import type { HrMember } from '../../types/hr';
import type { Club } from '../../types/adminAuth';
import { useLanguage } from '../../context/LanguageContext';
import { Search, X, Check, User } from 'lucide-react';

export interface TaskAssigneeSelectorProps {
  selectedMemberIds: string[];
  selectedMemberNames: string[];
  onChange: (ids: string[], names: string[]) => void;
  members: HrMember[];
  clubs?: Club[];
  isDarkMode: boolean;
}

const getMemberOrg = (m: HrMember): string => {
  if (!m) return 'Other';
  if (m.organizationType && typeof m.organizationType === 'string' && m.organizationType.trim()) {
    return m.organizationType.trim();
  }
  const clubOrDept = (typeof m.organizationDetails === 'string' ? m.organizationDetails : '') ||
    (typeof m.department === 'string' ? m.department : '');
  const lower = clubOrDept.toLowerCase().trim();
  if (lower.startsWith('interact')) return 'Interact';
  if (lower.startsWith('rotaract')) return 'Rotaract';
  if (lower.startsWith('rotary')) return 'Rotary';
  return 'Other';
};

const getMemberClub = (m: HrMember): string => {
  if (!m) return '';
  if (m.organizationDetails && typeof m.organizationDetails === 'string' && m.organizationDetails.trim()) {
    return m.organizationDetails.trim();
  }
  if (m.department && typeof m.department === 'string' && m.department.trim()) {
    return m.department.trim();
  }
  return '';
};

const getMemberRole = (m: HrMember): string => {
  if (!m) return 'VOLUNTEER';
  if (m.authRole && typeof m.authRole === 'string' && m.authRole.trim()) {
    return m.authRole.trim();
  }
  if (m.role && typeof m.role === 'string' && m.role.trim()) {
    return m.role.trim();
  }
  return 'VOLUNTEER';
};

const ALL_SYSTEM_ROLES = [
  'SUPER_ADMIN',
  'IT_ADMIN',
  'FINANCE_HEAD',
  'FINANCE_MEMBER',
  'LOGISTICS_HEAD',
  'LOGISTICS_MEMBER',
  'MARKETING_HEAD',
  'MARKETING_MEMBER',
  'FUNDRAISING_HEAD',
  'FUNDRAISING_MEMBER',
  'HR_HEAD',
  'HR_MEMBER',
  'LEGAL_HEAD',
  'LEGAL_MEMBER',
  'VOLUNTEER',
];

export const TaskAssigneeSelector: React.FC<TaskAssigneeSelectorProps> = ({
  selectedMemberIds,
  selectedMemberNames,
  onChange,
  members = [],
  clubs = [],
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [clubFilter, setClubFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Available Organizations
  const availableOrgs = useMemo(() => {
    const defaultOrgs = ['Interact', 'Rotaract', 'Rotary', 'Other'];
    const set = new Set<string>(defaultOrgs);
    clubs.forEach(c => {
      if (c.organizationType) set.add(c.organizationType);
    });
    members.forEach(m => {
      const org = getMemberOrg(m);
      if (org) set.add(org);
    });
    return Array.from(set).sort((a, b) => {
      const order = ['Interact', 'Rotaract', 'Rotary', 'Other'];
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [clubs, members]);

  // Available Clubs
  const availableClubs = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach(c => {
      if (c.name) {
        if (orgFilter === 'ALL' || c.organizationType?.toLowerCase() === orgFilter.toLowerCase()) {
          set.add(c.name);
        }
      }
    });
    members.forEach(m => {
      const org = getMemberOrg(m);
      const club = getMemberClub(m);
      if (club) {
        if (orgFilter === 'ALL' || org.toLowerCase() === orgFilter.toLowerCase()) {
          set.add(club);
        }
      }
    });
    return Array.from(set).sort();
  }, [clubs, members, orgFilter]);

  // Unique Roles
  const uniqueRoles = useMemo(() => {
    const set = new Set<string>(ALL_SYSTEM_ROLES);
    members.forEach(m => {
      const role = getMemberRole(m);
      if (role && !set.has(role.toUpperCase())) {
        set.add(role);
      }
    });
    return Array.from(set);
  }, [members]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return members.filter(m => {
      if (!m) return false;
      const memberOrg = getMemberOrg(m);
      const memberClub = getMemberClub(m);
      const memberRole = getMemberRole(m);
      const fullName = (m.fullName || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const phone = (m.phone ? String(m.phone) : '').toLowerCase();

      const matchSearch =
        !q ||
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        memberOrg.toLowerCase().includes(q) ||
        memberClub.toLowerCase().includes(q) ||
        memberRole.toLowerCase().includes(q);

      const matchOrg = orgFilter === 'ALL' || memberOrg.toLowerCase() === orgFilter.toLowerCase();
      const matchClub = clubFilter === 'ALL' || memberClub.toLowerCase() === clubFilter.toLowerCase();
      const matchRole =
        roleFilter === 'ALL' ||
        memberRole.toUpperCase().includes(roleFilter.toUpperCase()) ||
        (m.authRole && m.authRole.toUpperCase().includes(roleFilter.toUpperCase()));

      return matchSearch && matchOrg && matchClub && matchRole;
    });
  }, [members, searchQuery, orgFilter, clubFilter, roleFilter]);

  // Check if a member is currently selected (by ID or fullName)
  const isSelected = (m: HrMember): boolean => {
    if (selectedMemberIds.includes(m.id)) return true;
    if (m.fullName && selectedMemberNames.includes(m.fullName)) return true;
    return false;
  };

  const handleToggleMember = (m: HrMember) => {
    const isCurrentlySelected = isSelected(m);
    let nextIds = [...selectedMemberIds];
    let nextNames = [...selectedMemberNames];

    if (isCurrentlySelected) {
      nextIds = nextIds.filter(id => id !== m.id);
      nextNames = nextNames.filter(name => name !== m.fullName);
    } else {
      if (!nextIds.includes(m.id)) nextIds.push(m.id);
      if (m.fullName && !nextNames.includes(m.fullName)) nextNames.push(m.fullName);
    }

    onChange(nextIds, nextNames);
  };

  const handleRemoveMemberById = (id: string, name?: string) => {
    const nextIds = selectedMemberIds.filter(i => i !== id);
    let nextNames = selectedMemberNames;
    if (name) {
      nextNames = nextNames.filter(n => n !== name);
    } else {
      const found = members.find(m => m.id === id);
      if (found) nextNames = nextNames.filter(n => n !== found.fullName);
    }
    onChange(nextIds, nextNames);
  };

  const handleSelectAllFiltered = () => {
    const nextIds = new Set(selectedMemberIds);
    const nextNames = new Set(selectedMemberNames);

    filteredMembers.forEach(m => {
      nextIds.add(m.id);
      if (m.fullName) nextNames.add(m.fullName);
    });

    onChange(Array.from(nextIds), Array.from(nextNames));
  };

  const handleClearAll = () => {
    onChange([], []);
  };

  const isFiltersActive = Boolean(searchQuery || orgFilter !== 'ALL' || clubFilter !== 'ALL' || roleFilter !== 'ALL');
  const handleResetFilters = () => {
    setSearchQuery('');
    setOrgFilter('ALL');
    setClubFilter('ALL');
    setRoleFilter('ALL');
  };

  const inputBg = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  const listBorder = isDarkMode ? 'border-zinc-800 divide-zinc-800/60' : 'border-zinc-200 divide-zinc-200';
  const chipBg = isDarkMode ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';

  // Resolved list of selected items for chip display
  const selectedDisplayList = useMemo(() => {
    const list: { id: string; name: string; org?: string }[] = [];
    const processedIds = new Set<string>();

    selectedMemberIds.forEach(id => {
      const m = members.find(mem => mem.id === id);
      if (m) {
        list.push({ id: m.id, name: m.fullName, org: getMemberOrg(m) });
        processedIds.add(m.id);
      } else {
        list.push({ id, name: id });
        processedIds.add(id);
      }
    });

    selectedMemberNames.forEach(name => {
      if (!name) return;
      const m = members.find(mem => mem.fullName === name);
      if (m && !processedIds.has(m.id)) {
        list.push({ id: m.id, name: m.fullName, org: getMemberOrg(m) });
        processedIds.add(m.id);
      } else if (!m && !list.some(item => item.name === name)) {
        list.push({ id: name, name });
      }
    });

    return list;
  }, [selectedMemberIds, selectedMemberNames, members]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-zinc-400">
          {t('general.assignees', 'Responsabili')}
        </label>
        <div className="flex items-center space-x-2">
          {selectedDisplayList.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-rose-400 hover:text-rose-300 transition cursor-pointer font-medium"
            >
              {t('general.clearSelection', 'Deselectează tot')}
            </button>
          )}
          {filteredMembers.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer font-medium"
            >
              {t('general.selectAll', 'Selectează toți')}
            </button>
          )}
        </div>
      </div>

      {/* Selected Chips Container */}
      {selectedDisplayList.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 min-h-[38px] max-h-[80px] overflow-y-auto no-scrollbar">
          {selectedDisplayList.map(item => (
            <span
              key={item.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${chipBg}`}
            >
              <span className="truncate max-w-[140px]">{item.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveMemberById(item.id, item.name)}
                className="text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                title={t('common.clear', 'Șterge')}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className={`p-2 rounded-xl border border-dashed text-xs text-center py-2 ${isDarkMode ? 'border-zinc-800 text-zinc-500' : 'border-zinc-300 text-zinc-400'}`}>
          {t('general.noAssignees', 'Niciun responsabil selectat. Selectați din lista de mai jos.')}
        </div>
      )}

      {/* Search and 3-Factor Filter Strip */}
      <div className="space-y-1.5 pt-1">
        <div className="relative">
          <input
            type="text"
            placeholder={t('general.searchUsers', 'Căutare după nume, email, telefon...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full h-[36px] pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <select
            value={orgFilter}
            onChange={(e) => {
              setOrgFilter(e.target.value);
              setClubFilter('ALL');
            }}
            className={`w-full h-[34px] px-2 text-[11px] rounded-xl border outline-hidden transition cursor-pointer ${inputBg}`}
          >
            <option value="ALL">{t('general.allOrgs', 'Toate Org.')}</option>
            {availableOrgs.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>

          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            className={`w-full h-[34px] px-2 text-[11px] rounded-xl border outline-hidden transition cursor-pointer ${inputBg}`}
          >
            <option value="ALL">{t('general.allClubs', 'Toate Cluburile')}</option>
            {availableClubs.map(club => (
              <option key={club} value={club}>{club}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`w-full h-[34px] px-2 text-[11px] rounded-xl border outline-hidden transition cursor-pointer ${inputBg}`}
          >
            <option value="ALL">{t('general.allRoles', 'Toate Rolurile')}</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {isFiltersActive && (
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              {t('common.clearFilters', 'Resetează filtre')}
            </button>
          </div>
        )}
      </div>

      {/* User Selection List */}
      <div className={`rounded-xl border divide-y overflow-y-auto max-h-[160px] ${listBorder}`}>
        {filteredMembers.length > 0 ? (
          filteredMembers.map(m => {
            const selected = isSelected(m);
            const org = getMemberOrg(m);
            const club = getMemberClub(m);

            return (
              <div
                key={m.id}
                onClick={() => handleToggleMember(m)}
                className={`p-2 transition cursor-pointer flex items-center justify-between gap-2 select-none ${
                  selected
                    ? isDarkMode
                      ? 'bg-blue-600/15 hover:bg-blue-600/25'
                      : 'bg-blue-50 hover:bg-blue-100'
                    : isDarkMode
                      ? 'hover:bg-zinc-900/60'
                      : 'hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      selected
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {m.fullName ? m.fullName.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">{m.fullName}</p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {club ? `${org} • ${club}` : org}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isDarkMode
                          ? 'border-zinc-700 bg-zinc-900'
                          : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs text-zinc-500">
            {t('common.noResults', 'Niciun rezultat găsit')}
          </div>
        )}
      </div>
    </div>
  );
};
