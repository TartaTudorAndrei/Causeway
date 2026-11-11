export interface GoogleDriveSubfolder {
  name: string;
  folderId?: string;
  folderUrl?: string;
}

export interface GoogleDriveFolder {
  domain: string;
  name: string;
  folderId?: string;
  folderUrl?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  subfolders?: GoogleDriveSubfolder[];
}

export interface GoogleSyncStatus {
  connected: boolean;
  mode: 'SERVICE_ACCOUNT' | 'NOT_CONFIGURED' | 'OAUTH_USER';
  serviceAccountEmail?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  folderId?: string;
  folderUrl?: string;
  lastSyncTimestamp?: string;
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IDLE' | 'NEVER' | 'NOT_CONFIGURED';
  message?: string;
  syncedTabsCount: number;
  syncedTabNames?: string[];
  totalRowsSynced: number;
  folders?: GoogleDriveFolder[];
}
