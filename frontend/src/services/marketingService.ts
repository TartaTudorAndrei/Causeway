import { fetchWithCsrf } from './apiClient';
import type { MarketingResourcesResponse } from '../types/marketing';

export const marketingService = {
  async getResources(folderId?: string): Promise<MarketingResourcesResponse> {
    const url = folderId
      ? '/api/admin/marketing/resources?folderId=' + encodeURIComponent(folderId)
      : '/api/admin/marketing/resources';
    const res = await fetchWithCsrf(url);
    if (!res.ok) {
      throw new Error('Eroare la preluarea resurselor de marketing.');
    }
    return res.json();
  },

  getDownloadUrl(fileId: string): string {
    return '/api/admin/marketing/resources/' + encodeURIComponent(fileId) + '/download';
  },

  getPreviewUrl(fileId: string): string {
    return '/api/admin/marketing/resources/' + encodeURIComponent(fileId) + '/preview';
  },

  async fetchFileBlob(fileId: string): Promise<string> {
    const res = await fetchWithCsrf(`/api/admin/marketing/resources/${encodeURIComponent(fileId)}/preview`);
    if (!res.ok) {
      throw new Error(`Failed to load file preview: ${res.status}`);
    }
    const blob = await res.blob();
    return window.URL.createObjectURL(blob);
  },

  async downloadFile(fileId: string, filename: string): Promise<void> {
    const res = await fetchWithCsrf(`/api/admin/marketing/resources/${encodeURIComponent(fileId)}/download`);
    if (!res.ok) {
      throw new Error(`Failed to download file: ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};
