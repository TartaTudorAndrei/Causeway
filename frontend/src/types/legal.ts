export type ContractFieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'currency' 
  | 'cnp_cui' 
  | 'email' 
  | 'phone' 
  | 'select' 
  | 'textarea';

export interface ContractFieldOption {
  value: string;
  label: string;
}

export interface ContractFieldDefinition {
  key: string;
  label: string;
  type: ContractFieldType;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: string[]; // for 'select' type
  description?: string;
}

export interface ContractTemplate {
  id: string;
  title: string;
  description?: string;
  category: string; // 'sponsorship' | 'volunteer' | 'vendor' | 'partnership' | 'general'
  googleDocsUrl?: string;
  rawContent: string;
  fieldsSchema: ContractFieldDefinition[] | string;
  identifierPattern?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractStatus = 'signed' | 'not_signed' | 'draft' | 'pending_signature' | 'archived';

export const CONTRACT_CATEGORIES = ['sponsorship', 'partnership', 'contract', 'volunteer', 'vendor'] as const;

export const isContractCategory = (category?: string): boolean => {
  if (!category) return false;
  const c = category.toLowerCase().trim();
  return c === 'sponsorship' || c === 'partnership' || c === 'contract' || c === 'volunteer' || c === 'vendor';
};

export interface GeneratedContract {
  id: string;
  templateId?: string;
  contractNumber: string;
  title: string;
  status: ContractStatus;
  partyAName: string;
  partyBName: string;
  partyBEmail?: string;
  fieldValues: Record<string, any> | string;
  renderedContent: string;
  pdfData?: string;
  driveFileId?: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalStats {
  totalTemplates: number;
  totalContracts: number;
  draftContracts: number;
  pendingContracts: number;
  signedContracts: number;
  archivedContracts: number;
}

export interface GoogleDocImportResponse {
  title: string;
  content: string;
  detectedFields: string[];
}
