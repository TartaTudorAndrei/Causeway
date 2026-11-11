export type SponsorStatus = 'PENDING' | 'CONTACTED' | 'IN_TALKS' | 'CONTRACT_SIGNED' | 'SPONSORED' | 'REFUSED';

export interface FundraisingSponsor {
  id: string;
  sortIndex: number;
  companyName: string;
  companyProfile: string;
  contactInfo: string;
  responsiblePerson: string;
  status: SponsorStatus;
  lastContactDate: string | null;
  contractUrl: string | null;
  notes: string | null;
  sponsorshipType?: string;
  receivedType?: 'MONEY' | 'OTHER';
  receivedValue?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}
