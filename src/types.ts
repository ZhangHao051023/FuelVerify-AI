export type Zone = 'West Malaysia' | 'East Malaysia';

export interface FuelPrices {
  RON95: number;
  RON95_Market: number;
  RON97: number;
  Diesel: number;
  RON95_SubsidyLimit: number;
  source?: string;
  date?: string;
  analysis?: string;
}

export type RegionalFuelPrices = Record<Zone, FuelPrices>;

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
