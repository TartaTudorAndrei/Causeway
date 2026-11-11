export interface CustomerAccountDetails {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  roles: string[];
  isVolunteerOrStaff: boolean;
}

export interface CustomerDonationItem {
  id: number;
  paymentTransactionId: string;
  paymentProvider: string;
  donorEmail: string;
  amount: number;
  currency: string;
  pickupCode?: string | null;
  status: string;
  createdAt: string;
  isPickedUp: boolean;
}

export interface CustomerProfileUpdatePayload {
  fullName: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}
