export interface PetrolRecord {
  id: string;
  date: string;
  amount: number;
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

export interface FuelPrices {
  RON95: number;
  RON95_Market: number;
  RON97: number;
  Diesel: number;
  RON95_SubsidyLimit: number;
}

export type RegionalFuelPrices = Record<'West Malaysia' | 'East Malaysia', FuelPrices>;

const workerBase = import.meta.env.VITE_CLOUDFLARE_WORKER_URL?.replace(/\/+$/, '') || '';

if (!workerBase) {
  console.warn('VITE_CLOUDFLARE_WORKER_URL is not set; Cloudflare AI calls will fail.');
}

async function callWorker<T>(path: string, body?: any): Promise<T> {
  if (!workerBase) {
    throw new Error('Cloudflare worker URL is not configured (VITE_CLOUDFLARE_WORKER_URL)');
  }

  const response = await fetch(`${workerBase}/${path.replace(/^\//, '')}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare worker ${path} failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return (await response.json()) as T;
}

export const extractReceiptData = async (base64Image: string): Promise<Partial<PetrolRecord>> => {
  return callWorker<Partial<PetrolRecord>>('ai/extractReceiptData', { base64Image });
};

export const verifyUsage = async (record: PetrolRecord, history: PetrolRecord[]): Promise<VerificationResult> => {
  return callWorker<VerificationResult>('ai/verifyUsage', { record, history });
};

export const fetchLatestFuelPrices = async (): Promise<RegionalFuelPrices | null> => {
  return callWorker<RegionalFuelPrices>('fuelPrices');
};
