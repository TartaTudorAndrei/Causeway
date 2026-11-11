import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LanguageProvider } from '../../context/LanguageContext';
import { SyncStatusProvider, SyncStatusPill } from '../../context/SyncStatusContext';
import { syncManager } from '../../services/syncManager';

describe('SyncStatusContext & SyncStatusPill', () => {
  it('renders nothing when online and no pending queue (Zero Fluff policy)', () => {
    vi.spyOn(syncManager, 'getStatus').mockReturnValue({
      isOnline: true,
      isSyncing: false,
      pendingCount: 0,
      lastSyncTime: null,
      lastError: null,
    });

    const { container } = render(
      <LanguageProvider>
        <SyncStatusProvider>
          <SyncStatusPill />
        </SyncStatusProvider>
      </LanguageProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders minimal amber pill when offline', () => {
    vi.spyOn(syncManager, 'getStatus').mockReturnValue({
      isOnline: false,
      isSyncing: false,
      pendingCount: 2,
      lastSyncTime: null,
      lastError: null,
    });

    render(
      <LanguageProvider>
        <SyncStatusProvider>
          <SyncStatusPill />
        </SyncStatusProvider>
      </LanguageProvider>
    );

    expect(screen.getByText(/Offline · 2/i)).toBeInTheDocument();
  });

  it('renders minimal blue pill when syncing', () => {
    vi.spyOn(syncManager, 'getStatus').mockReturnValue({
      isOnline: true,
      isSyncing: true,
      pendingCount: 1,
      lastSyncTime: null,
      lastError: null,
    });

    render(
      <LanguageProvider>
        <SyncStatusProvider>
          <SyncStatusPill />
        </SyncStatusProvider>
      </LanguageProvider>
    );

    expect(screen.getByText(/sincroniz/i)).toBeInTheDocument();
  });
});
