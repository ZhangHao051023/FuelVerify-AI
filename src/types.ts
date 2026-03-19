export type Zone = 'West Malaysia' | 'East Malaysia';

export interface PetrolRecord {
  id: string;
  date: string;
  amount: number; // in MYR
  liters: number;
  stationName: string;
  receiptUrl?: string;
  status: 'pending' | 'verified' | 'flagged';
  verificationNotes?: string[];
  type: 'RON95' | 'RON97' | 'Diesel';
}

export interface VerificationResult {
  status: 'verified' | 'flagged';
  notes: string[];
  extractedData?: Partial<PetrolRecord>;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  check: (record: PetrolRecord, history: PetrolRecord[]) => string | null;
}
