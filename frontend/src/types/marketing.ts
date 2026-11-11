export interface MarketingResource {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  isFolder?: boolean;
  folder?: boolean;
}

export interface MarketingResourcesResponse {
  folderId?: string;
  folderUrl?: string;
  resources: MarketingResource[];
}
