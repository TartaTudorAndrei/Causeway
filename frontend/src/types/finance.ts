export type ActiveFinanceTab = 
  | 'expenses' 
  | 'online-donations' 
  | 'stands' 
  | 'sponsorships' 
  | 'other-incomes' 
  | 'statistics';

export interface FinanceExpense {
  id: string;
  name: string;
  transactionDate: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  paymentMethod: string; // 'Cash' | 'Card' | 'Bank Transfer' | 'Reimbursement'
  campaignDepartment?: string;
  receiptAttachment?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ScannedExpenseData {
  name?: string;
  transactionDate?: string;
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  paymentMethod?: string;
  merchantName?: string;
  rawNotes?: string;
  receiptUrl?: string;
  receiptAttachment?: string;
}

export interface DriveReceiptFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink?: string;
  size?: number;
  modifiedTime?: string;
  inReceiptsFolder: boolean;
}

export interface FinanceOnlineDonation {
  id: string;
  processor: 'STRIPE' | 'NETOPIA';
  transactionId: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  currency: string;
  processingFee: number;
  campaign: string;
  transactionDate: string;
  status: 'COMPLETED' | 'REFUNDED' | 'FAILED';
}

export interface FinancePosEntry {
  posId: string;
  posName: string;
  amount: number;
}

export interface FinanceStand {
  id: string;
  standId?: string;
  standLocation: string;
  eventDate: string;
  shiftName?: string;
  financeResponsibleId?: string;
  financeResponsibleName: string;
  cashCollected: number;
  posCardCollected: number;
  posEntries?: FinancePosEntry[];
  posLocationRemaining?: string;
  openingBalance: number;
  closingBalance: number;
  discrepancyAmount: number;
  discrepancyNotes?: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'AUDITED' | 'HANDED' | 'NOT_HANDED' | string;
  createdAt: string;
}

export interface FinanceSponsorship {
  id: string;
  sponsorName: string;
  contactPerson: string;
  contactEmail: string;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Custom';
  agreedAmount: number;
  currency: string;
  paymentStatus: 'Lead Identified' | 'Contacted' | 'Proposal Sent' | 'Negotiating' | 'Contract Signed' | 'Funds Received';
  campaign: string;
  contractUrl?: string;
  receivedDate?: string;
  createdAt: string;
}

export interface FinanceOtherIncome {
  id: string;
  transactionDate: string;
  amount: number;
  currency: string;
  sourcePayer: string;
  category: string;
  description: string;
  campaign?: string;
  referenceDoc?: string;
  createdBy?: string;
  createdAt: string;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  onlineDonationsTotal: number;
  standsRevenueTotal: number;
  sponsorshipsReceivedTotal: number;
  sponsorshipsPledgedTotal: number;
  otherIncomesTotal: number;
  expenseCount: number;
  onlineDonationsCount: number;
  standsCount: number;
  sponsorshipsCount: number;
  otherIncomesCount: number;
}
